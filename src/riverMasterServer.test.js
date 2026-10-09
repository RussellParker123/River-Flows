import { createClient } from '@supabase/supabase-js';
import { rivers } from './rivers';
import chatHandler from '../api/river-master';
import jobsHandler from '../api/river-master-jobs';
import observationsHandler from '../api/river-observations';
import {
  validateRequest, clientHash, authorized, spendingConfig, askClaude, contextFor, fetchBounded
} from '../supabase/server/river-master';
import { parseUSGS, parseDailyUSGS, collect, runJob, healthCheck, manage, ROLES, communityContext } from '../supabase/server/river-master-jobs';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const river = rivers[0];
const body = { message: 'What is the flow?', riverName: river.name, riverState: river.state, segmentName: river.segments[0].name };
const response = () => {
  const res = { setHeader: jest.fn(), json: jest.fn() };
  res.status = jest.fn(() => res);
  return res;
};
const dbWith = impl => ({ rpc: jest.fn(async (name, args) => ({ data: await impl(name, args), error: null })) });
const upstream = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
const usgs = (flow = '123', gauge = river.usgs_gage) => ({ value: { timeSeries: [{
  sourceInfo: { siteCode: [{ value: gauge }], siteName: 'Official station' },
  variable: { variableCode: [{ value: '00060' }], unit: { unitCode: 'ft3/s' }, noDataValue: -999999 },
  values: [{ value: [{ value: flow, dateTime: '2026-10-09T12:00:00Z', qualifiers: ['P'] }] }]
}] } });

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, VERCEL: '1', SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', ANTHROPIC_API_KEY: 'test-api-key',
    ANTHROPIC_MODEL: 'claude-sonnet-4-5', RIVER_MASTER_MODEL_RATES: '{"claude-sonnet-4-5":{"input":3,"output":15}}',
    RIVER_MASTER_MONTHLY_BUDGET_USD: '10', RIVER_MASTER_IP_HASH_SECRET: 'a'.repeat(32),
    CRON_SECRET: 'b'.repeat(32) };
  global.fetch = jest.fn(async () => upstream({ content: [{ type: 'text', text: 'A factual answer.' }],
    usage: { input_tokens: 100, output_tokens: 20 } }));
});
afterAll(() => { process.env = originalEnv; global.fetch = originalFetch; });

test('resolves only known server-side river reaches and bounds fields', () => {
  expect(validateRequest({ ...body, description: 'Injected fake facts', flow: 999 }).river).toBe(river);
  for (const bad of [null, [], { ...body, message: 'x'.repeat(2001) }, { ...body, riverName: 'fake' },
    { ...body, segmentName: 'fake' }, { ...body, riverState: 'wrong' }]) {
    expect(() => validateRequest(bad)).toThrow();
  }
});

test('rate identity trusts only Vercel edge IP and hashes with server salt', () => {
  const first = clientHash({ headers: { 'x-vercel-forwarded-for': '192.0.2.1', 'x-forwarded-for': 'attacker' } });
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  expect(first).not.toContain('192.0.2.1');
  expect(() => clientHash({ headers: { 'x-forwarded-for': '192.0.2.1' } })).toThrow();
  expect(() => clientHash({ headers: { 'x-vercel-forwarded-for': '192.0.2.1, 192.0.2.2' } })).toThrow();
  process.env.VERCEL = '0';
  expect(clientHash({ headers: {}, socket: { remoteAddress: '::1' } })).toMatch(/^[a-f0-9]{64}$/);
});

test('cron authentication fails closed and compares full bearer credential', () => {
  expect(authorized({ headers: { authorization: ['Bear', 'er ', process.env.CRON_SECRET].join('') } })).toBe(true);
  expect(authorized({ headers: { authorization: 'wrong' } })).toBe(false);
  delete process.env.CRON_SECRET;
  expect(authorized({ headers: {} })).toBe(false);
});

test('spending requires explicit model pricing, key and positive budget', () => {
  expect(spendingConfig().model).toBe('claude-sonnet-4-5');
  for (const [key, value] of [['RIVER_MASTER_MONTHLY_BUDGET_USD', '0'], ['RIVER_MASTER_MODEL_RATES', '{}'],
    ['ANTHROPIC_API_KEY', ''], ['RIVER_MASTER_MODEL_RATES', '{"claude-sonnet-4-5":{"input":0,"output":15}}']]) {
    const previous = process.env[key];
    process.env[key] = value;
    expect(spendingConfig).toThrow('spending is disabled');
    process.env[key] = previous;
  }
});

test('reserves a conservative paid-call upper bound before fetching, stores metadata only', async () => {
  const db = dbWith(name => name === 'rm_reserve' ? true : null);
  const answer = await askClaude(db, { question: 'sensitive question' }, 'chat');
  expect(answer).toBe('A factual answer.');
  const reserved = db.rpc.mock.calls[0][1];
  expect(reserved.p_upper).toBeGreaterThan(100 * 3 + 1000 * 15);
  expect(reserved.p_budget).toBe(10000000);
  expect(reserved).not.toHaveProperty('question');
  expect(db.rpc.mock.calls[1][1]).toEqual(expect.objectContaining({ p_cost: 600, p_input: 100, p_output: 20 }));
  const apiBody = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(apiBody).not.toHaveProperty('tools');
  expect(apiBody.system).toContain('UNSOURCED');
});

test('no provider calls on exhausted budget or failed storage, and no paid retries on timeout', async () => {
  await expect(askClaude(dbWith(() => false), { question: 'hello' }, 'chat')).rejects.toThrow('budget');
  expect(global.fetch).not.toHaveBeenCalled();
  await expect(askClaude({ rpc: async () => ({ error: new Error('private db detail') }) }, {}, 'chat')).rejects.toThrow('storage');
  expect(global.fetch).not.toHaveBeenCalled();
  const db = dbWith(() => true);
  global.fetch.mockRejectedValue(new Error('timeout'));
  await expect(askClaude(db, {}, 'chat')).rejects.toThrow('timeout');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(db.rpc).toHaveBeenCalledTimes(1); // uncertain cost is never released
});

test('invalid provider usage cannot refund a reservation', async () => {
  global.fetch.mockResolvedValue(upstream({ content: [{ type: 'text', text: 'answer' }],
    usage: { input_tokens: 1000000, output_tokens: 20 } }));
  const db = dbWith(() => true);
  await expect(askClaude(db, {}, 'chat')).rejects.toThrow('Invalid usage');
  expect(db.rpc).toHaveBeenCalledTimes(1);
});

test('persisted observations retain timestamps and unapproved association labels', async () => {
  const db = dbWith(() => ({ approved: false, history: [{ gauge: river.usgs_gage, flow: 10, observedAt: '2026-10-09T12:00:00Z' }] }));
  const ctx = await contextFor(db, river, river.segments[0]);
  expect(ctx.observation.reachSpecific).toBe(false);
  expect(ctx.sources[0].label).toContain('UNVERIFIED');
  expect(ctx.sources[0].observedAt).toBe('2026-10-09T12:00:00Z');
  expect(ctx.facts.staticInformation.provenance).toContain('UNSOURCED');
});

test('chat enforces methods, atomic rate limits, safe errors and response contract', async () => {
  let res = response();
  await chatHandler({ method: 'GET' }, res);
  expect(res.status).toHaveBeenCalledWith(405);
  createClient.mockReturnValue(dbWith(() => false));
  res = response();
  const req = { method: 'POST', body, headers: { 'x-vercel-forwarded-for': '192.0.2.1' } };
  await chatHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(global.fetch).not.toHaveBeenCalled();
  createClient.mockReturnValue(dbWith(name => name === 'rm_context' ? { approved: true, history: [] } : true));
  res = response();
  await chatHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ answer: 'A factual answer.', sources: [] });
  createClient.mockReturnValue({ rpc: async () => ({ error: new Error('secret failure') }) });
  res = response();
  await chatHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret failure');
});

test('USGS parser accepts only official expected gauge, discharge, units and valid timestamp/value', () => {
  expect(parseUSGS(usgs(), [river.usgs_gage])[0]).toEqual(expect.objectContaining({ flow: 123, unit: 'cfs', observedAt: '2026-10-09T12:00:00Z' }));
  expect(parseUSGS(usgs('-999999'), [river.usgs_gage])).toEqual([]);
  expect(parseUSGS(usgs('bad'), [river.usgs_gage])).toEqual([]);
  expect(parseUSGS(usgs(), ['00000000'])).toEqual([]);
  const invalid = usgs();
  invalid.value.timeSeries[0].variable.unit.unitCode = 'ft';
  expect(parseUSGS(invalid, [river.usgs_gage])).toEqual([]);
});

test('collection fetches bounded official batches, atomically persists cursor, does not call AI', async () => {
  global.fetch.mockResolvedValue(upstream(usgs()));
  const db = dbWith(() => true);
  const result = await collect(db, 'token', 0);
  expect(result.gaugesAttempted).toBeLessThanOrEqual(40);
  expect(db.rpc).toHaveBeenCalledWith('rm_collection_commit', expect.objectContaining({ p_token: 'token', p_cursor: result.nextCursor }));
  expect(global.fetch.mock.calls[0][0]).toMatch(/^https:\/\/waterservices\.usgs\.gov\//);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls[1][0]).toContain('/nwis/dv/');
});

test('collection retry is bounded, failed fetch never advances cursor', async () => {
  global.fetch.mockRejectedValue(new Error('offline'));
  const db = dbWith(() => true);
  await expect(collect(db, 'token', 0)).rejects.toThrow('offline');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(db.rpc).not.toHaveBeenCalled();
});

test('jobs reject unauthorized requests and skip held locks; release only owned token on failure', async () => {
  const res = response();
  await jobsHandler({ method: 'GET', headers: {}, query: { job: 'manager' } }, res);
  expect(res.status).toHaveBeenCalledWith(401);
  const db = dbWith(() => ({ acquired: false }));
  expect(await runJob(db, 'collection')).toEqual({ skipped: 'already running' });
  expect(global.fetch).not.toHaveBeenCalled();
  const fail = dbWith(name => name === 'rm_lock' ? { acquired: true, cursor: 0 } : true);
  global.fetch.mockRejectedValue(new Error('offline'));
  await expect(runJob(fail, 'collection')).rejects.toThrow();
  expect(fail.rpc.mock.calls[0][1].p_token).toBe(fail.rpc.mock.calls[1][1].p_token);
  expect(fail.rpc.mock.calls[1][0]).toBe('rm_unlock');
});

test('six specialists and River Master actually call model and persist approval proposals with fence tokens', async () => {
  const db = dbWith(name => name === 'rm_context' ? { approved: false, history: [] } :
    name === 'rm_proposal' ? 'proposal-id' : true);
  const result = await manage(db, 'owned-token', 0);
  expect(ROLES).toHaveLength(6);
  expect(ROLES.map(([role]) => role)).toEqual(['live-flow-watcher', 'historical-flow-analyst',
    'river-researcher', 'website-maintainer', 'community-engagement', 'improvement-analyst']);
  expect(result.proposals).toBe(6);
  expect(db.rpc.mock.calls.filter(([name]) => name === 'rm_proposal')).toHaveLength(6);
  const reservations = db.rpc.mock.calls.filter(([name]) => name === 'rm_reserve');
  expect(reservations).toHaveLength(7);
  expect(reservations.every(([, args]) => args.p_token === 'owned-token')).toBe(true);
  expect(db.rpc).toHaveBeenCalledWith('rm_manager_commit', expect.objectContaining({ p_token: 'owned-token' }));
});

test('maintenance only checks fixed path at operator-configured trusted HTTPS own origin', async () => {
  delete process.env.RIVER_MASTER_OWN_ORIGIN;
  expect(await healthCheck()).toEqual({ status: 'not configured' });
  for (const origin of ['http://example.com', 'https://127.0.0.1', 'https://example.com/arbitrary', 'https://example.com:8443']) {
    process.env.RIVER_MASTER_OWN_ORIGIN = origin;
    await expect(healthCheck()).rejects.toThrow();
  }
  expect(global.fetch).not.toHaveBeenCalled();
  process.env.RIVER_MASTER_OWN_ORIGIN = 'https://my-rivers.example.com';
  global.fetch.mockResolvedValue(upstream({ name: 'River Flows' }));
  expect((await healthCheck()).manifestValid).toBe(true);
  expect(global.fetch.mock.calls[0][0]).toBe('https://my-rivers.example.com/manifest.json');
  expect(global.fetch.mock.calls[0][1].redirect).toBe('error');
});

test('upstream requests have abort signal and reject unsafe redirects/non-success responses', async () => {
  await fetchBounded('https://example.com');
  expect(global.fetch.mock.calls[0][1].signal).toBeDefined();
  global.fetch.mockResolvedValue({ ok: false });
  await expect(fetchBounded('https://example.com')).rejects.toThrow('Upstream unavailable');
});

test('upstream timeout aborts the pending request', async () => {
  global.fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  await expect(fetchBounded('https://example.com', {}, 5)).rejects.toThrow('aborted');
});

test('public observations expose only selected gauge history with explicit mapping and freshness', async () => {
  const observedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  createClient.mockReturnValue(dbWith(() => ({ approved: false,
    history: [{ gauge: river.usgs_gage, flow: 42, unit: 'cfs', observedAt }] })));
  const res = response();
  await observationsHandler({ method: 'GET', query: body }, res);
  expect(res.status).toHaveBeenCalledWith(200);
  const payload = res.json.mock.calls[0][0];
  expect(payload.gaugeMappedVerified).toBe(false);
  expect(payload.observation).toEqual(expect.objectContaining({
    gaugeMappedVerified: false, reachSpecific: false, flow: 42, isStale: true
  }));
  expect(payload.history).toHaveLength(1);
  expect(payload).not.toHaveProperty('staticInformation');
  expect(global.fetch).not.toHaveBeenCalled();
  createClient.mockReturnValue(dbWith(() => ({ approved: true, history: [] })));
  const empty = response();
  await observationsHandler({ method: 'GET', query: body }, empty);
  expect(empty.json).toHaveBeenCalledWith(expect.objectContaining({ gaugeMappedVerified: true, observation: null, history: [] }));
});

test('public observations reject unknown reaches and methods; storage errors are safe', async () => {
  const method = response();
  await observationsHandler({ method: 'POST' }, method);
  expect(method.status).toHaveBeenCalledWith(405);
  const invalid = response();
  await observationsHandler({ method: 'GET', query: { ...body, segmentName: 'fake' } }, invalid);
  expect(invalid.status).toHaveBeenCalledWith(400);
  createClient.mockReturnValue({ rpc: async () => ({ error: new Error('private details') }) });
  const unavailable = response();
  await observationsHandler({ method: 'GET', query: body }, unavailable);
  expect(unavailable.status).toHaveBeenCalledWith(503);
  expect(JSON.stringify(unavailable.json.mock.calls)).not.toContain('private details');
});

test('official ingestion rejects blanks, sentinels, future dates, other parameters and ice readings', () => {
  for (const value of ['', ' ', '-999999', 'NaN', null]) {
    expect(parseUSGS(usgs(value), [river.usgs_gage])).toEqual([]);
  }
  expect(parseUSGS(usgs('0'), [river.usgs_gage])[0].flow).toBe(0);
  for (const change of [
    data => { data.value.timeSeries[0].variable.variableCode[0].value = '00065'; },
    data => { data.value.timeSeries[0].values[0].value[0].dateTime = new Date(Date.now() + 3600000).toISOString(); },
    data => { data.value.timeSeries[0].values[0].value[0].qualifiers = ['Ice']; },
    data => { data.value.timeSeries[0].sourceInfo.siteCode[0].agencyCode = 'Other'; },
    data => { data.value.timeSeries[0].variable.noDataValue = '123'; }
  ]) {
    const data = usgs();
    change(data);
    expect(parseUSGS(data, [river.usgs_gage])).toEqual([]);
  }
});

test('daily historical parser verifies mean statistic, source units and bounded calendar dates', () => {
  const data = usgs();
  const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  data.value.timeSeries[0].variable.options = { option: [{ optionCode: '00003' }] };
  data.value.timeSeries[0].values[0].value[0].dateTime = day;
  expect(parseDailyUSGS(data, [river.usgs_gage])[0]).toEqual(expect.objectContaining({
    flow: 123, observedOn: day, observedAt: `${day}T00:00:00Z`, statistic: 'daily_mean'
  }));
  data.value.timeSeries[0].variable.options.option[0].optionCode = '00001';
  expect(parseDailyUSGS(data, [river.usgs_gage])).toEqual([]);
  data.value.timeSeries[0].variable.options.option[0].optionCode = '00003';
  data.value.timeSeries[0].values[0].value[0].dateTime = '2000-01-01';
  expect(parseDailyUSGS(data, [river.usgs_gage])).toEqual([]);
});

test('chat context includes persisted official daily history without conflating instantaneous readings', async () => {
  const db = dbWith(() => ({ approved: false, history: [],
    dailyHistory: [{ gauge: river.usgs_gage, flow: 123, unit: 'cfs',
      observedOn: '2026-10-08', observedAt: '2026-10-08T00:00:00Z', statistic: 'daily_mean' }] }));
  const context = await contextFor(db, river, river.segments[0]);
  expect(context.facts.dailyHistory[0].gaugeMappedVerified).toBe(false);
  expect(context.sources[0].url).toContain('/nwis/dv/');
  expect(context.sources[0].label).toContain('daily mean');
  expect(context.observation).toBeUndefined();
});

test('community excerpts require privacy opt-in and remove identities, links and suspected secrets', async () => {
  delete process.env.RIVER_MASTER_COMMUNITY_COMMENTS_ENABLED;
  const db = dbWith(() => ({ status: 'available',
    excerpts: ['Join us: someone@example.com https://example.com', 'password is unsafe', 'Nice river'] }));
  expect((await communityContext(db, river)).status).toContain('disabled');
  expect(db.rpc).not.toHaveBeenCalled();
  process.env.RIVER_MASTER_COMMUNITY_COMMENTS_ENABLED = 'true';
  const community = await communityContext(db, river);
  expect(community.provenance).toContain('UNTRUSTED');
  expect(community.excerpts[0]).toContain('[email removed]');
  expect(community.excerpts[0]).not.toContain('https://');
  expect(community.excerpts[1]).toContain('withheld');
  expect(community.excerpts[2]).toBe('Nice river');
});
