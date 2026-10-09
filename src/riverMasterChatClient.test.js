import { TextEncoder, TextDecoder } from 'util';
import { boundedMessages, contentBytes, limitContent, readRiverMasterStream, streamRiverMaster } from './riverMasterChatClient';

beforeAll(() => {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
});

function response(chunks, { status = 200, type = 'application/x-ndjson', json } = {}) {
  const reader = {
    read: jest.fn(),
    cancel: jest.fn().mockResolvedValue(),
    releaseLock: jest.fn()
  };
  chunks.forEach(value => reader.read.mockResolvedValueOnce({ value, done: false }));
  reader.read.mockResolvedValue({ done: true });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => type },
    json: jest.fn().mockResolvedValue(json),
    body: { getReader: () => reader },
    reader
  };
}

test('decodes byte-by-byte Unicode, multiple lines, CRLF and a final non-newline done', async () => {
  const bytes = new TextEncoder().encode('{"type":"delta","text":"水🚣"}\r\n\n{"type":"delta","text":" river"}\n{"type":"done"}');
  const res = response(Array.from(bytes, byte => Uint8Array.of(byte)));
  const onDelta = jest.fn();
  await readRiverMasterStream(res, { onDelta });
  expect(onDelta.mock.calls.flat().join('')).toBe('水🚣 river');
  expect(res.reader.cancel).toHaveBeenCalled();
  expect(res.reader.releaseLock).toHaveBeenCalled();
});

test.each([
  ['{"type":"error","message":"Provider is not configured"}\n', 'Provider is not configured'],
  ['invalid\n', 'invalid stream data'],
  ['{"type":"bogus"}\n', 'unknown stream event'],
  ['null\n', 'unknown stream event'],
  ['{"type":"delta","text":"partial"}\n', 'disconnected before completing']
])('rejects incomplete/provider/invalid streams: %s', async (text, message) => {
  const res = response([new TextEncoder().encode(text)]);
  await expect(readRiverMasterStream(res, { onDelta: jest.fn() })).rejects.toThrow(message);
  expect(res.reader.releaseLock).toHaveBeenCalled();
});

test.each([
  [401, 'application/json', { error: 'Invalid token' }, 'session has expired'],
  [503, 'application/json', { error: 'AI provider unavailable' }, 'AI provider unavailable'],
  [404, 'text/html', null, 'not deployed'],
  [200, 'text/html', null, 'unexpected response'],
  [200, 'application/json', { error: 'Server configuration missing' }, 'configuration missing']
])('handles HTTP %s / %s explicitly', async (status, type, json, message) => {
  await expect(readRiverMasterStream(response([], { status, type, json }), { onDelta: jest.fn() })).rejects.toThrow(message);
});

test('aborting a pending read cancels the reader and suppresses late deltas', async () => {
  const res = response([]);
  let resolve;
  res.reader.read.mockImplementation(() => new Promise(done => { resolve = done; }));
  res.reader.cancel.mockImplementation(() => {
    resolve({ done: true });
    return Promise.resolve();
  });
  const controller = new AbortController();
  const onDelta = jest.fn();
  const reading = readRiverMasterStream(res, { signal: controller.signal, onDelta });
  controller.abort();
  await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  expect(onDelta).not.toHaveBeenCalled();
  expect(res.reader.releaseLock).toHaveBeenCalled();
});

test('bounds conversation and Unicode content without splitting code points', () => {
  const content = limitContent('🚣'.repeat(2000));
  expect(contentBytes(content)).toBe(4000);
  expect(content).toBe('🚣'.repeat(1000));
  expect(boundedMessages(Array.from({ length: 30 }, () => ({ role: 'user', content: 'a'.repeat(5000) })))).toHaveLength(20);
  expect(boundedMessages([{ role: 'user', content: 'a'.repeat(5000) }])[0].content).toHaveLength(4000);
});

test('requires bearer auth, sends only bounded messages/context and reports network failure', async () => {
  global.fetch = jest.fn().mockResolvedValue(response([new TextEncoder().encode('{"type":"done"}\n')]));
  const context = { riverName: 'Test', state: 'OR', segmentName: 'Reach' };
  await expect(streamRiverMaster({ messages: [], context })).rejects.toThrow('Sign in');
  expect(fetch).not.toHaveBeenCalled();
  await streamRiverMaster({ token: 'test-access', messages: [{ role: 'user', content: 'Hello' }], context, onDelta: jest.fn() });
  expect(fetch).toHaveBeenCalledWith('/api/river-master', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer ' + 'test-access' }),
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }], context })
  }));
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(streamRiverMaster({ token: 'test-access', messages: [], context })).rejects.toThrow('Cannot reach');
  delete global.fetch;
});

test('trims oldest history to the 64 KiB total body limit, including JSON escaping', async () => {
  global.fetch = jest.fn().mockResolvedValue(response([new TextEncoder().encode('{"type":"done"}\n')]));
  const messages = Array.from({ length: 19 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: '\n'.repeat(4000)
  }));
  const context = { riverName: 'Test', state: 'OR', segmentName: 'Reach' };
  await streamRiverMaster({ token: 'test-access', messages, context, onDelta: jest.fn() });
  const body = fetch.mock.calls[0][1].body;
  expect(contentBytes(body)).toBeLessThanOrEqual(65536);
  const sent = JSON.parse(body).messages;
  expect(sent.length).toBeLessThan(19);
  expect(sent[sent.length - 1]).toEqual(messages[18]);
  expect(sent[0].role).toBe('user');
  delete global.fetch;
});
