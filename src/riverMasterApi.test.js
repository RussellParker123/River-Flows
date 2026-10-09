/** @jest-environment node */
import { EventEmitter } from 'node:events';
import { ReadableStream } from 'node:stream/web';
import defaultHandler, { createRiverMasterHandler } from '../api/river-master';
import { rivers } from './rivers';

const NOW = Date.parse('2026-10-09T16:00:00Z');
const env = { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
  OPENAI_API_KEY: 'test-provider-key' };
const catalog = [{ name: 'Test River', state: 'WY', description: 'Catalog river description',
  geology: 'Granite', fish_species: 'Trout', usgs_gage: '13010050',
  segments: [{ name: 'Test Reach', grade: 'III', description: 'Catalog reach description' }] }];
const validBody = () => ({ messages: [{ role: 'user', content: 'What should I know?' }],
  context: { riverName: 'Test River', state: 'WY', segmentName: 'Test Reach' } });
const delta = text => `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] })}\n\n`;
const ending = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';

function response(text, { status = 200, type = 'application/json', chunks, cancel } = {}) {
  const bytes = chunks || [Buffer.from(text)];
  return { ok: status >= 200 && status < 300, status, headers: { get: () => type },
    body: new ReadableStream({
      start(controller) {
        bytes.forEach(chunk => controller.enqueue(chunk));
        controller.close();
      },
      cancel,
    }) };
}

const json = (data, options) => response(JSON.stringify(data), options);
const sse = (text = delta('Hello') + ending, options = {}) => response(text, { type: 'text/event-stream', ...options });
function usgs(value = '0', overrides = {}) {
  return json({ value: { timeSeries: [{
    sourceInfo: { siteCode: [{ value: '13010050' }] },
    variable: { variableCode: [{ value: '00060' }], unit: { unitCode: 'ft3/s' }, noDataValue: -999999 },
    values: [{ value: [{ value, dateTime: '2026-10-09T15:45:00Z', ...overrides }] }],
  }] } });
}

function request(body = validBody(), headers = {}) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.headers = { 'content-type': 'application/json', authorization: ['Bearer', 'test-user-token'].join(' '), ...headers };
  req.body = body;
  req.pause = jest.fn();
  return req;
}

function result() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.chunks = [];
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.flushHeaders = jest.fn();
  res.write = jest.fn(text => { res.chunks.push(text); return true; });
  res.end = jest.fn(text => { if (text) res.chunks.push(text); });
  return res;
}

function setup(options = {}) {
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(json({ id: 'authenticated-user' }))
    .mockResolvedValueOnce(usgs())
    .mockResolvedValueOnce(sse());
  const handler = createRiverMasterHandler({ env, catalog, now: () => NOW, fetchImpl, ...options });
  return { fetchImpl, handler };
}

async function run(handler, req = request()) {
  const res = result();
  await handler(req, res);
  return res;
}
const events = res => res.chunks.join('').trim().split('\n').map(line => JSON.parse(line));
const providerData = fetchImpl => JSON.parse(fetchImpl.mock.calls.find(([url]) => url === 'https://api.openai.com/v1/chat/completions')[1].body);
const serverContext = fetchImpl => JSON.parse(providerData(fetchImpl).messages[1].content.split('\n').slice(1).join('\n'));

test('exports a default handler and an injectable factory without requiring environment configuration at import', async () => {
  expect(typeof defaultHandler).toBe('function');
  const handler = createRiverMasterHandler({ env: {} });
  const res = await run(handler);
  expect(res.statusCode).toBe(503);
  expect(events(res)).toEqual([{ error: 'Chat service is unavailable.' }]);
});

test('authenticates against Supabase and streams real provider output with server catalog and zero discharge', async () => {
  const { handler, fetchImpl } = setup();
  const res = await run(handler);
  expect(fetchImpl.mock.calls[0][0]).toBe('https://project.supabase.co/auth/v1/user');
  expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe(env.SUPABASE_PUBLISHABLE_KEY);
  expect(res.headers['Content-Type']).toContain('application/x-ndjson');
  expect(events(res)).toEqual([{ type: 'delta', text: 'Hello' }, { type: 'done' }]);
  expect(providerData(fetchImpl)).toMatchObject({ model: 'gpt-4o-mini', stream: true });
  expect(serverContext(fetchImpl)).toMatchObject({ grade: 'III', description: 'Catalog reach description',
    geology: 'Granite', fishSpecies: 'Trout',
    discharge: { status: 'available', value: 0, units: 'ft3/s', gauge: '13010050', reachVerified: false,
      observedAt: '2026-10-09T15:45:00.000Z', source: 'USGS NWIS instantaneous values' } });
  expect(providerData(fetchImpl).messages[0].content).toMatch(/untrusted|Never guarantee/);
});

test('resolves the real catalog exactly and never uses its cached client-side flow', async () => {
  const { handler, fetchImpl } = setup({ catalog: rivers });
  const body = validBody();
  body.context = { riverName: rivers[0].name, state: rivers[0].state, segmentName: rivers[0].segments[0].name };
  const res = await run(handler, request(body));
  expect(res.statusCode).toBe(200);
  expect(serverContext(fetchImpl)).toMatchObject({ description: rivers[0].description,
    geology: rivers[0].geology, fishSpecies: rivers[0].fish_species, grade: rivers[0].segments[0].grade });
  expect(fetchImpl.mock.calls[1][0]).toContain(`sites=${rivers[0].usgs_gage}`);
  expect(serverContext(fetchImpl).discharge.value).toBe(0);
});

test.each(['', 'Basic not-a-token', 'Bearer', '****** extra'])('rejects invalid authorization %s', async authorization => {
  const { handler, fetchImpl } = setup();
  const res = await run(handler, request(validBody(), { authorization }));
  expect(res.statusCode).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('does not trust even a JWT-like token when Supabase rejects it', async () => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValue(json({ error: 'private auth detail' }, { status: 401 }));
  const res = await run(handler, request(validBody(), { authorization: ['Bearer', 'eyJ.fake.signature'].join(' ') }));
  expect(res.statusCode).toBe(401);
  expect(res.chunks.join('')).not.toContain('private auth detail');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each([500, 429])('Supabase status %s is an authentication outage, not invalid credentials', async status => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValue(json({}, { status }));
  expect((await run(handler)).statusCode).toBe(503);
});

test('rejects a malformed successful auth response', async () => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValue(json({}));
  expect((await run(handler)).statusCode).toBe(503);
});

test('supports the server anon key and configurable model', async () => {
  const { handler, fetchImpl } = setup({ env: { ...env, SUPABASE_PUBLISHABLE_KEY: undefined,
    SUPABASE_ANON_KEY: 'test-anon-key', OPENAI_MODEL: 'configured-model' } });
  await run(handler);
  expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe('test-anon-key');
  expect(providerData(fetchImpl).model).toBe('configured-model');
});

test.each(['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'])('missing %s fails without fake fallback', async key => {
  const { handler, fetchImpl } = setup({ env: { ...env, [key]: undefined } });
  const res = await run(handler);
  expect(res.statusCode).toBe(503);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(events(res)[0]).toHaveProperty('error');
});

test('rejects non-POST methods and non-JSON content', async () => {
  const { handler, fetchImpl } = setup();
  const req = request();
  req.method = 'GET';
  const res = await run(handler, req);
  expect(res.statusCode).toBe(405);
  expect(res.headers.Allow).toBe('POST');
  expect((await run(handler, request(validBody(), { 'content-type': 'text/plain' }))).statusCode).toBe(415);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test.each([
  body => { body.messages = []; },
  body => { body.messages = Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })); },
  body => { body.messages[0].role = 'system'; },
  body => { body.messages[0].role = 'tool'; },
  body => { body.messages[0].role = 'assistant'; },
  body => { body.messages[0].content = ' '; },
  body => { body.messages[0].content = 10; },
  body => { body.messages[0].content = 'x'.repeat(4001); },
  body => { body.messages[0].content = 'é'.repeat(2001); },
  body => { body.context.gauge = '99999999'; },
  body => { body.context.url = 'https://untrusted.example'; },
  body => { body.context.current_flow = 123; },
  body => { body.context = null; },
  body => { body.flow = 123; },
])('rejects invalid messages and client-supplied context authority %#', async mutate => {
  const { handler, fetchImpl } = setup();
  const body = validBody();
  mutate(body);
  const res = await run(handler, request(body));
  expect(res.statusCode).toBe(400);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('requires exact river, state and segment catalog matches', async () => {
  const { handler, fetchImpl } = setup();
  const body = validBody();
  body.context.segmentName = 'test reach';
  expect((await run(handler, request(body))).statusCode).toBe(404);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('permits plain-text URLs in questions and prior assistant history without fetching client URLs', async () => {
  const { handler, fetchImpl } = setup();
  const body = validBody();
  body.messages = [
    { role: 'user', content: 'Is https://example.org/reach useful for learning about this reach?' },
    { role: 'assistant', content: 'Check official sources; www.example.org may not be current.' },
    { role: 'user', content: 'How does that relate to the catalog geology?' },
  ];
  const res = await run(handler, request(body));
  expect(res.statusCode).toBe(200);
  expect(events(res).at(-1)).toEqual({ type: 'done' });
  expect(providerData(fetchImpl).messages.slice(2)).toEqual(body.messages);
  expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
    'https://project.supabase.co/auth/v1/user',
    'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=13010050&parameterCd=00060&siteStatus=all',
    'https://api.openai.com/v1/chat/completions',
  ]);
});

test.each([
  ['content-length', '65537', validBody()],
  ['content-length', 'invalid', validBody()],
  ['x-unused', '', `"${'é'.repeat(40000)}"`],
])('bounds body bytes, including multibyte characters %#', async (key, value, body) => {
  const { handler } = setup();
  expect((await run(handler, request(body, { [key]: value }))).statusCode).toBe(413);
});

test('rejects malformed JSON', async () => {
  const { handler } = setup();
  expect((await run(handler, request('{not JSON'))).statusCode).toBe(400);
});

test('reads a raw streamed Vercel request and enforces byte limits without content-length', async () => {
  const { handler, fetchImpl } = setup();
  const req = request();
  delete req.body;
  const res = result();
  const pending = handler(req, res);
  await new Promise(resolve => setImmediate(resolve));
  req.emit('data', Buffer.from('x'.repeat(65537)));
  await pending;
  expect(res.statusCode).toBe(413);
  expect(req.pause).toHaveBeenCalled();
  expect(fetchImpl).toHaveBeenCalledTimes(1);

  const second = setup();
  const raw = request();
  delete raw.body;
  const success = result();
  const completion = second.handler(raw, success);
  await new Promise(resolve => setImmediate(resolve));
  const text = JSON.stringify(validBody());
  raw.emit('data', Buffer.from(text.slice(0, 20)));
  raw.emit('data', Buffer.from(text.slice(20)));
  raw.emit('end');
  await completion;
  expect(events(success).at(-1)).toEqual({ type: 'done' });
});

test.each(['-999999', '-1', 'NaN', 'Infinity', '', ' '])('invalid USGS discharge %s is unavailable, never zero', async value => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs(value)).mockResolvedValueOnce(sse());
  await run(handler);
  expect(serverContext(fetchImpl).discharge.status).toBe('unavailable');
  expect(serverContext(fetchImpl).discharge).not.toHaveProperty('value');
});

test.each(['2026-10-01T00:00:00Z', 'invalid', '2026-10-10T00:00:00Z'])('stale or invalid timestamp %s is unavailable', async dateTime => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs('12', { dateTime })).mockResolvedValueOnce(sse());
  await run(handler);
  expect(serverContext(fetchImpl).discharge.status).toBe('unavailable');
});

test('nearby coordinate catalog gauges are unavailable without speculative lookup', async () => {
  const { handler, fetchImpl } = setup({ catalog: [{ ...catalog[0], usgs_gage: { lat: 43, lng: -110 } }] });
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(sse());
  await run(handler);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(serverContext(fetchImpl).discharge).toMatchObject({ status: 'unavailable', gauge: null });
});

test('USGS outages remain unavailable while real AI streaming continues', async () => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockRejectedValueOnce(new Error('USGS private error'))
    .mockResolvedValueOnce(sse());
  const res = await run(handler);
  expect(serverContext(fetchImpl).discharge.status).toBe('unavailable');
  expect(events(res).at(-1).type).toBe('done');
});

test('ignores measurements with different site, parameter or units', async () => {
  for (const mutate of [
    series => { series.sourceInfo.siteCode[0].value = 'wrong-site'; },
    series => { series.variable.variableCode[0].value = '00065'; },
    series => { series.variable.unit.unitCode = 'm'; },
  ]) {
    const { handler, fetchImpl } = setup();
    const measurement = { sourceInfo: { siteCode: [{ value: '13010050' }] },
      variable: { variableCode: [{ value: '00060' }], unit: { unitCode: 'ft3/s' } },
      values: [{ value: [{ value: '100', dateTime: '2026-10-09T15:45:00Z' }] }] };
    mutate(measurement);
    fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' }))
      .mockResolvedValueOnce(json({ value: { timeSeries: [measurement] } })).mockResolvedValueOnce(sse());
    await run(handler);
    expect(serverContext(fetchImpl).discharge.status).toBe('unavailable');
  }
});

test('provider failures before streaming are generic JSON errors', async () => {
  for (const failure of [json({ error: 'secret-provider-detail' }, { status: 429 }), json({ error: 'secret-provider-detail' })]) {
    const { handler, fetchImpl } = setup();
    fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs()).mockResolvedValueOnce(failure);
    const res = await run(handler);
    expect(res.statusCode).toBe(502);
    expect(res.headers['Content-Type']).toContain('application/json');
    expect(res.chunks.join('')).not.toMatch(/secret-provider-detail|test-provider-key|done/);
  }
});

test('network provider errors are generic JSON, with no fallback answer', async () => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs())
    .mockRejectedValueOnce(new Error('private-network-detail'));
  const res = await run(handler);
  expect(res.statusCode).toBe(502);
  expect(events(res)).toEqual([{ error: 'AI provider is unavailable.' }]);
});

test('converts SSE split at every byte, including Unicode, CRLF and multiline data', async () => {
  const { handler, fetchImpl } = setup();
  const text = `: keepalive\r\n\r\ndata: {"choices":[\r\ndata: {"delta":{"content":"🌊 café"},"finish_reason":null}]}\r\n\r\n${ending}`;
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs())
    .mockResolvedValueOnce(sse('', { chunks: Array.from(Buffer.from(text), byte => Buffer.from([byte])) }));
  const res = await run(handler);
  expect(events(res)).toEqual([{ type: 'delta', text: '🌊 café' }, { type: 'done' }]);
});

test.each([
  delta('partial'),
  delta('partial') + 'data: not-json\n\n',
  delta('partial') + 'data: {"error":{"message":"private-provider-error"}}\n\n',
  delta('partial') + 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n',
  delta('partial') + 'data: [DONE]\n\n',
  delta('partial') + 'data: {"choices":[{"delta":{"content":42}}]}\n\n',
  delta('partial') + 'data: {}\n\n',
])('stream failure %# emits an error, never successful done', async text => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs()).mockResolvedValueOnce(sse(text));
  const res = await run(handler);
  expect(events(res)[0]).toEqual({ type: 'delta', text: 'partial' });
  expect(events(res).at(-1).type).toBe('error');
  expect(events(res).some(event => event.type === 'done')).toBe(false);
  expect(res.chunks.join('')).not.toContain('private-provider-error');
});

test('handles response backpressure before sending successful done', async () => {
  const { handler } = setup();
  const res = result();
  res.write.mockImplementation(text => {
    res.chunks.push(text);
    setImmediate(() => res.emit('drain'));
    return false;
  });
  await handler(request(), res);
  expect(events(res).at(-1).type).toBe('done');
});

test('client disconnect aborts and cancels the upstream stream without done or an error write', async () => {
  const { handler, fetchImpl } = setup();
  let canceled = false;
  let upstreamSignal;
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs())
    .mockImplementationOnce(async (url, options) => {
      upstreamSignal = options.signal;
      return { ok: true, headers: { get: () => 'text/event-stream' }, body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from(delta('partial')));
          upstreamSignal.addEventListener('abort', () => controller.error(new Error('abort')), { once: true });
        },
        cancel() { canceled = true; },
      }) };
    });
  const res = result();
  res.write.mockImplementation(text => {
    res.chunks.push(text);
    res.emit('close');
    return true;
  });
  await handler(request(), res);
  expect(upstreamSignal.aborted).toBe(true);
  expect(events(res)).toEqual([{ type: 'delta', text: 'partial' }]);
  // An errored native stream need not call its cancel hook; the abort signal is the cancellation.
  expect(canceled || upstreamSignal.aborted).toBe(true);
  expect(res.end).not.toHaveBeenCalled();
});

test('aborts authentication on request disconnect', async () => {
  const { handler, fetchImpl } = setup();
  const req = request();
  let signal;
  fetchImpl.mockReset().mockImplementation((url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('abort')), { once: true }));
  });
  const res = result();
  const pending = handler(req, res);
  req.emit('aborted');
  await pending;
  expect(signal.aborted).toBe(true);
  expect(res.end).not.toHaveBeenCalled();
});

test('USGS has a bounded timeout and still reports unavailable data', async () => {
  jest.useFakeTimers();
  try {
    const { handler, fetchImpl } = setup();
    fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' }))
      .mockImplementationOnce((url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      })).mockResolvedValueOnce(sse());
    const res = result();
    const pending = handler(request(), res);
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
    jest.advanceTimersByTime(5001);
    await pending;
    expect(serverContext(fetchImpl).discharge.status).toBe('unavailable');
    expect(events(res).at(-1).type).toBe('done');
  } finally { jest.useRealTimers(); }
});

test.each(['auth', 'provider', 'stream'])('%s timeout aborts upstream and never emits done', async stage => {
  jest.useFakeTimers();
  try {
    const { handler, fetchImpl } = setup();
    let signal;
    const stalledFetch = (url, options) => {
      signal = options.signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('private-timeout')), { once: true });
      });
    };
    fetchImpl.mockReset();
    if (stage === 'auth') fetchImpl.mockImplementationOnce(stalledFetch);
    else {
      fetchImpl.mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs());
      if (stage === 'provider') fetchImpl.mockImplementationOnce(stalledFetch);
      else fetchImpl.mockImplementationOnce(async (url, options) => {
        signal = options.signal;
        return { ok: true, headers: { get: () => 'text/event-stream' }, body: new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from(delta('partial')));
            signal.addEventListener('abort', () => controller.error(new Error('private-timeout')), { once: true });
          },
        }) };
      });
    }
    const res = result();
    const pending = handler(request(), res);
    for (let i = 0; i < 40; i += 1) await Promise.resolve();
    jest.advanceTimersByTime(stage === 'auth' ? 8001 : 45001);
    await pending;
    expect(signal.aborted).toBe(true);
    expect(res.chunks.join('')).not.toMatch(/private-timeout|"type":"done"/);
    if (stage === 'stream') expect(events(res).at(-1).type).toBe('error');
    else expect(res.statusCode).toBe(stage === 'auth' ? 503 : 504);
  } finally { jest.useRealTimers(); }
});

test('cancels upstream immediately at DONE without waiting for upstream socket EOF', async () => {
  const { handler, fetchImpl } = setup();
  const cancel = jest.fn();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs())
    .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/event-stream' }, body: new ReadableStream({
      start(controller) { controller.enqueue(Buffer.from(delta('answer') + ending)); },
      cancel,
    }) });
  const res = await run(handler);
  expect(events(res).at(-1).type).toBe('done');
  expect(cancel).toHaveBeenCalled();
});

test('malformed UTF-8 in an SSE stream emits error, not corrupted success', async () => {
  const { handler, fetchImpl } = setup();
  fetchImpl.mockReset().mockResolvedValueOnce(json({ id: 'user' })).mockResolvedValueOnce(usgs())
    .mockResolvedValueOnce(sse('', { chunks: [Buffer.from(delta('partial')), Buffer.from([0xff])] }));
  const res = await run(handler);
  expect(events(res).at(-1).type).toBe('error');
  expect(events(res).some(event => event.type === 'done')).toBe(false);
});

test('bounded in-process user burst limiter rejects seventh request and expires its window', async () => {
  let time = NOW;
  const { handler, fetchImpl } = setup({ now: () => time });
  fetchImpl.mockReset().mockImplementation(async url => {
    if (url.includes('/auth/v1/user')) return json({ id: 'same-user' });
    if (url.includes('waterservices')) return usgs();
    return sse();
  });
  for (let i = 0; i < 6; i += 1) expect((await run(handler)).statusCode).toBe(200);
  const limited = await run(handler);
  expect(limited.statusCode).toBe(429);
  expect(limited.headers['Retry-After']).toBe('60');
  time += 60001;
  expect((await run(handler)).statusCode).toBe(200);
});
