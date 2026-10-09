import { fetchUSGSFlow, fetchHistoricalFlow } from './fetchUSGSFlow';

const response = (value) => ({
  ok: true,
  json: async () => ({
    value: { timeSeries: [{ values: [{ value: [{ value, dateTime: '2026-10-09T12:00:00Z' }] }] }] },
  }),
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1000);
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

test('reuses recent flows but refreshes them after five minutes', async () => {
  fetch.mockResolvedValueOnce(response('12')).mockResolvedValueOnce(response('24'));
  expect(await fetchUSGSFlow('ttl-test')).toBe(12);
  expect(await fetchUSGSFlow('ttl-test')).toBe(12);
  expect(fetch).toHaveBeenCalledTimes(1);
  Date.now.mockReturnValue(301000);
  expect(await fetchUSGSFlow('ttl-test')).toBe(24);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('zero discharge is a valid measurement', async () => {
  fetch.mockResolvedValue(response('0'));
  expect(await fetchUSGSFlow('zero-test')).toBe(0);
});

test('scheduled refresh bypasses a cache populated after a slow response', async () => {
  fetch.mockImplementationOnce(async () => {
    Date.now.mockReturnValue(3000);
    return response('12');
  }).mockResolvedValueOnce(response('24'));
  expect(await fetchUSGSFlow('poll-test')).toBe(12);
  Date.now.mockReturnValue(301000);
  expect(await fetchUSGSFlow('poll-test')).toBe(12);
  expect(await fetchUSGSFlow('poll-test', { refresh: true })).toBe(24);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('scheduled refresh also bypasses nearby gage lookups', async () => {
  const nearResponse = value => ({
    ok: true,
    json: async () => ({
      value: { timeSeries: [{
        sourceInfo: { geoLocation: { geogLocation: { latitude: 43, longitude: -110 } } },
        values: [{ value: [{ value }] }],
      }] },
    }),
  });
  fetch.mockResolvedValueOnce(nearResponse('12')).mockResolvedValueOnce(nearResponse('24'));
  const point = { lat: 43, lng: -110 };
  expect(await fetchUSGSFlow(point)).toBe(12);
  expect(await fetchUSGSFlow(point)).toBe(12);
  expect(await fetchUSGSFlow(point, { refresh: true })).toBe(24);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test.each(['-999999', 'NaN', '', 'Infinity'])('invalid discharge %s is unavailable', async (value) => {
  fetch.mockResolvedValue(response(value));
  expect(await fetchUSGSFlow(`invalid-${value}`)).toBeNull();
});

test('historical data does not include USGS missing-value sentinels', async () => {
  fetch.mockResolvedValue(response('-999999'));
  expect(await fetchHistoricalFlow('historical-invalid')).toEqual([]);
});
