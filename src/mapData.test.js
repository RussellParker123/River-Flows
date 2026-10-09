import {
  validCoordinate, gageKey, gagePoint, segmentRecords, filterRecords,
  recordsGeoJSON, gagesGeoJSON, readPlan, distanceMiles, measurementGeoJSON, gradeColor,
  importPlan, exportPlan, exportGPX, PLAN_LIMIT, PLAN_FILE_LIMIT,
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
  ], itinerary: [records[0].id, 'missing', {}] }), records);
  expect(result).toEqual({ waypoints: [good], itinerary: [records[0].id], invalid: true });
});

test('saved itinerary keeps the same reaches when river and segment ordering changes', () => {
  const saved = JSON.stringify({ version: 1, waypoints: [], itinerary: [records[0].id, records[2].id] });
  const reordered = segmentRecords([
    rivers[1], { ...rivers[0], segments: [...rivers[0].segments].reverse() },
  ]);
  const restored = readPlan(saved, reordered);
  expect(restored.invalid).toBe(false);
  expect(restored.itinerary.map(id => reordered.find(record => record.id === id).segment.name)).toEqual(['Upper', 'Lower']);
  expect(reordered.find(record => record.segment.name === 'Upper').id).toBe(records[0].id);
});

test('colors exact and compound difficulty classes with unknown fallback', () => {
  expect(gradeColor('III-IV')).toBe(gradeColor('III'));
  expect(gradeColor('IV+')).toBe(gradeColor('IV'));
  expect(gradeColor('V+')).toBe(gradeColor('V'));
  expect(gradeColor('III')).not.toBe(gradeColor('II'));
  expect(gradeColor('Unknown')).toBe('#627785');
  expect(gradeColor('constructor')).toBe('#627785');
});

const waypoint = { id: 'portable-w1', name: 'Personal spot', kind: 'put-in', coordinates: [-110, 43] };
const portable = { version: 1, waypoints: [waypoint], itinerary: [records[0].id, records[1].id, records[2].id] };

test('portable JSON round trips version 1 stable IDs, repeats and coordinate order', () => {
  const plan = { ...portable, itinerary: [...portable.itinerary, records[0].id] };
  const reordered = segmentRecords([...rivers].reverse());
  expect(JSON.parse(exportPlan(plan, records))).toEqual(plan);
  expect(importPlan(exportPlan(plan, records), reordered)).toEqual({
    waypoints: plan.waypoints, itinerary: plan.itinerary,
  });
  expect(importPlan('{"version":1,"waypoints":[],"itinerary":[]}', records)).toEqual({ waypoints: [], itinerary: [] });
});

test.each([
  { ...portable, version: 2 },
  { ...portable, itinerary: [records[0].id, 'unknown'] },
  { ...portable, itinerary: [null] },
  { ...portable, itinerary: Array(PLAN_LIMIT + 1).fill(records[0].id) },
  { ...portable, waypoints: [waypoint, waypoint] },
  { ...portable, waypoints: [waypoint, { ...waypoint, id: 'bad', coordinates: [0, 91] }] },
  { ...portable, waypoints: [{ ...waypoint, id: '' }] },
  { ...portable, waypoints: [{ ...waypoint, id: ' '.repeat(10) }] },
  { ...portable, waypoints: [{ ...waypoint, id: 'x'.repeat(101) }] },
  { ...portable, waypoints: [{ ...waypoint, name: ' ' }] },
  { ...portable, waypoints: [{ ...waypoint, name: 'x'.repeat(101) }] },
  { ...portable, waypoints: [{ ...waypoint, kind: 'verified access' }] },
  { ...portable, waypoints: [{ ...waypoint, coordinates: ['-110', 43] }] },
  { ...portable, waypoints: [{ ...waypoint, coordinates: [null, 43] }] },
  { ...portable, waypoints: [{ ...waypoint, coordinates: [-110, 43, 0] }] },
  { ...portable, waypoints: Array.from({ length: PLAN_LIMIT + 1 }, (_, index) => ({ ...waypoint, id: `w${index}` })) },
])('refuses entire imported plan with any invalid entry (%#)', data => {
  expect(() => importPlan(JSON.stringify(data), records)).toThrow(/Invalid plan/);
});

test('refuses malformed and oversized imports and strips extra data from portable exports', () => {
  [null, undefined, {}, 'oops', 'null', '{}', ' '.repeat(PLAN_FILE_LIMIT + 1)].forEach(raw =>
    expect(() => importPlan(raw, records)).toThrow());
  const plan = { ...portable, waypoints: [{ ...waypoint, html: '<script>unsafe</script>' }], token: 'not exported' };
  expect(JSON.parse(exportPlan(plan, records))).toEqual(portable);
});

test('GPX escapes XML, removes illegal XML characters, separates reaches and treats single locations as points', () => {
  const name = `<script> & "'\u0000\u0001\uD800 🛶`;
  const named = records.map(record => ({ ...record, river: { ...record.river, name }, segment: { ...record.segment, name } }));
  const gpx = exportGPX({ ...portable, waypoints: [{ ...waypoint, name }] }, named);
  expect(gpx).toContain('&lt;script&gt; &amp; &quot;&apos;');
  expect(gpx).not.toMatch(/[\u0000\u0001\uD800]/u);
  const xml = new DOMParser().parseFromString(gpx, 'application/xml');
  expect(xml.querySelector('parsererror')).toBeNull();
  expect(xml.documentElement.getAttribute('version')).toBe('1.1');
  expect(xml.querySelectorAll('wpt')).toHaveLength(2);
  expect(xml.querySelector('wpt').getAttribute('lat')).toBe('43');
  expect(xml.querySelector('wpt').getAttribute('lon')).toBe('-110');
  expect(xml.querySelectorAll('trk')).toHaveLength(2);
  expect(xml.querySelectorAll('trkseg')).toHaveLength(2);
  expect(xml.querySelectorAll('trkpt')).toHaveLength(4);
  expect(xml.querySelector('wpt name').textContent).toContain('<script> & "\' 🛶');
  expect(xml.querySelector('script')).toBeNull();
});

test('GPX skips unmapped entries without inventing geometry and rejects invalid waypoints', () => {
  const unmapped = [{ ...records[0], coordinates: [] }];
  const gpx = exportGPX({ waypoints: [], itinerary: [records[0].id] }, unmapped);
  expect(gpx).not.toMatch(/<(trk|wpt)/);
  expect(() => exportGPX({ ...portable, waypoints: [{ ...waypoint, coordinates: [Infinity, 0] }] }, records)).toThrow();
});
