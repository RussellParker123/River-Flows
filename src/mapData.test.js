import {
  validCoordinate, gageKey, gagePoint, segmentRecords, filterRecords,
  recordsGeoJSON, gagesGeoJSON, readPlan, distanceMiles, measurementGeoJSON,
} from './mapData';

const rivers = [
  { name: 'Canyon River', state: 'WY', grade: 'II', usgs_gage: '01234', segments: [
    { name: 'Upper', grade: 'III-IV', coordinates: [[-110, 43], [-110, 44]] },
    { name: 'Gage location', grade: 'II', coordinates: [[-109, 43]] },
  ] },
  { name: 'Other River', state: 'CO', segments: [
    { name: 'Lower', grade: 'III', coordinates: [[-105, 40], [-105.1, 40.1]] },
  ] },
];
const records = segmentRecords(rivers);

test('keeps longitude latitude order and treats single locations as points, not reaches', () => {
  const geo = recordsGeoJSON(records);
  expect(geo.features[0].geometry).toEqual({ type: 'LineString', coordinates: [[-110, 43], [-110, 44]] });
  expect(geo.features[1].geometry).toEqual({ type: 'Point', coordinates: [-109, 43] });
  expect(validCoordinate([43, -110])).toBe(false);
  expect(validCoordinate(['-110', 43])).toBe(false);
  expect(validCoordinate([-110, NaN])).toBe(false);
});

test('deduplicates gage points and never invents a point for a site id', () => {
  expect(gagesGeoJSON(records).features).toEqual([]);
  const gage = { lat: 43, lng: -110 };
  expect(gagePoint(gage)).toEqual([-110, 43]);
  expect(gageKey({ site: '01234', ...gage })).toBe('site:01234');
  expect(gageKey({ latitude: 43, longitude: -110 })).toBe('near:-110,43');
  expect(gagesGeoJSON([{ ...records[0], gage }, { ...records[1], gage }]).features).toHaveLength(1);
});

test('filters river and segment names, state abbreviations and exact compound difficulty', () => {
  expect(filterRecords(records, { query: ' UPPER ', state: 'WY', grade: 'III-IV' })).toEqual([records[0]]);
  expect(filterRecords(records, { grade: 'III' })).toEqual([records[2]]);
  expect(filterRecords(records, { query: 'canyon' })).toHaveLength(2);
  expect(filterRecords(records, { state: 'CO' })).toEqual([records[2]]);
});

test('calculates haversine miles, with empty and single point distance zero', () => {
  expect(distanceMiles([])).toBe(0);
  expect(distanceMiles([[-110, 43]])).toBe(0);
  expect(distanceMiles([[0, 0], [0, 1]])).toBeCloseTo(69.093, 2);
  expect(distanceMiles([[179, 0], [-179, 0]])).toBeCloseTo(138.187, 2);
  expect(measurementGeoJSON([[0, 0]]).features).toHaveLength(0);
  expect(measurementGeoJSON([[0, 0], [0, 1]]).features[0].geometry.type).toBe('LineString');
});

test('validates malformed saved data and drops unknown itinerary references', () => {
  expect(readPlan(null, records).invalid).toBe(false);
  ['oops', 'null', '{}', '{"version":2,"waypoints":[],"itinerary":[]}'].forEach(raw => {
    expect(readPlan(raw, records)).toEqual({ waypoints: [], itinerary: [], invalid: true });
  });
  const good = { id: 'w1', name: 'My put-in', kind: 'put-in', coordinates: [-110, 43] };
  const result = readPlan(JSON.stringify({ version: 1, waypoints: [
    good, good, { ...good, id: 'w2', coordinates: [43, -110] },
    { ...good, id: 'w3', kind: 'verified access' }, { ...good, id: 'w4', name: '' }, null,
  ], itinerary: ['0:0', 'missing', {}] }), records);
  expect(result).toEqual({ waypoints: [good], itinerary: ['0:0'], invalid: true });
});
