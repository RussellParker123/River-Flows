import { fetchUSGSFlow } from './fetchUSGSFlow';

const originalFetch = global.fetch;

afterEach(() => {
  jest.restoreAllMocks();
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete global.fetch;
  }
});

test('refreshes cached live flow data after five minutes', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(0);
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: { timeSeries: [{ values: [{ value: [{ value: '100' }] }] }] }
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: { timeSeries: [{ values: [{ value: [{ value: '200' }] }] }] }
      })
    });

  expect(await fetchUSGSFlow('cache-expiry-test-site')).toBe(100);
  now.mockReturnValue(5 * 60 * 1000 + 1);
  expect(await fetchUSGSFlow('cache-expiry-test-site')).toBe(200);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
