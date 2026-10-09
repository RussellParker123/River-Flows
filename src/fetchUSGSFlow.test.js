import { fetchUSGSFlow, fetchUSGSObservation, fetchHistoricalFlow, FLOW_CACHE_TTL } from './fetchUSGSFlow';

const site = '13010050';
function series(values, overrides = {}) {
  return {
    sourceInfo: { siteCode: [{ value: site }] },
    variable: { variableCode: [{ value: '00060' }], unit: { unitCode: 'ft3/s' }, noDataValue: -999999,
      options: { option: [{ optionCode: '00003' }] } },
    values: [{ value: values }],
    ...overrides
  };
}
function respond(timeSeries) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ value: { timeSeries } }) });
}
const reading = (value, dateTime = '2026-10-09T12:00:00Z') => ({ value, dateTime });
let testClock = Date.parse('2026-10-09T16:00:00Z');

beforeEach(() => {
  testClock += FLOW_CACHE_TTL * 100;
  jest.useFakeTimers().setSystemTime(new Date(testClock));
  global.fetch = jest.fn();
});
afterEach(() => { jest.useRealTimers(); });

test('selects discharge in cfs for requested site and latest timestamp, preserving zero', async () => {
  respond([
    series([reading('500')], { variable: { variableCode: [{ value: '00065' }], unit: { unitCode: 'ft' } } }),
    series([reading('12', '2026-10-09T11:00:00Z'), reading('0'), reading('-999999')])
  ]);
  const observation = await fetchUSGSObservation(site);
  expect(observation).toMatchObject({ value: 0, observedAt: '2026-10-09T12:00:00Z', mappingVerified: false });
  expect(await fetchUSGSFlow(site)).toBe(0);
  expect(fetch).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(FLOW_CACHE_TTL);
  respond([series([reading('24')])]);
  expect(await fetchUSGSFlow(site)).toBe(24);
});

test('unavailable or failed data is not permanently cached; coordinate guesses do not fetch', async () => {
  const other = '13012400';
  respond([series([reading('NaN'), reading('-2'), reading('')])]);
  expect(await fetchUSGSFlow(other)).toBeNull();
  fetch.mockResolvedValueOnce({ ok: false });
  expect(await fetchUSGSFlow(other)).toBeNull();
  respond([series([reading('7')], { sourceInfo: { siteCode: [{ value: other }] } })]);
  expect(await fetchUSGSFlow(other)).toBe(7);
  expect(await fetchUSGSFlow({ lat: 44, lng: -110 })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('rejects wrong units and no-data readings', async () => {
  respond([series([reading('100')], {
    sourceInfo: { siteCode: [{ value: '13012500' }] },
    variable: { variableCode: [{ value: '00060' }], unit: { unitCode: 'm3/s' } }
  })]);
  expect(await fetchUSGSFlow('13012500')).toBeNull();
});

test('daily means contain explicit gaps and never mix other statistics', async () => {
  jest.setSystemTime(new Date('2026-10-09T16:00:00Z'));
  respond([
    series([reading('5', '2026-10-06T00:00:00Z'), reading('-999999', '2026-10-07T00:00:00Z'), reading('9', '2026-10-09T00:00:00Z')]),
    series([reading('999', '2026-10-08T00:00:00Z')], { variable: {
      variableCode: [{ value: '00060' }], unit: { unitCode: 'ft3/s' }, options: { option: [{ optionCode: '00001' }] }
    } })
  ]);
  const data = await fetchHistoricalFlow(site);
  expect(data.slice(-4).map(day => day.flow)).toEqual([5, null, null, 9]);
  expect(fetch.mock.calls[0][0]).toContain('statCd=00003');
});
