export const STORAGE_KEY = 'river-flows-map-plan-v1';
export const PLAN_LIMIT = 500;
export const PLAN_FILE_LIMIT = 1024 * 1024;
export const waypointKinds = ['waypoint', 'put-in', 'take-out'];
export const gradeColors = { I: '#21854a', II: '#197cbd', III: '#8544ad', IV: '#ca3f36', V: '#212121', 'V+': '#212121' };

export function gradeColor(grade) {
  const primary = typeof grade === 'string' ? grade.match(/^(V\+|IV|III|II|I|V)(?=$|[-+/(\s])/)?.[1] : null;
  return gradeColors[primary] || '#627785';
}

export function segmentId(river, segment) {
  return encodeURIComponent(JSON.stringify([river.state || '', river.name || '', segment.name || '']));
}

export function validCoordinate(point) {
  return Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

export function gageKey(gage) {
  if (typeof gage === 'string' || typeof gage === 'number') return `site:${gage}`;
  if (!gage || typeof gage !== 'object') return '';
  if (gage.site) return `site:${gage.site}`;
  const point = gagePoint(gage);
  return point ? `near:${point[0]},${point[1]}` : '';
}

export function gagePoint(gage) {
  if (!gage || typeof gage !== 'object') return null;
  const point = [gage.lng ?? gage.longitude, gage.lat ?? gage.latitude];
  return validCoordinate(point) ? point : null;
}

export function segmentRecords(rivers) {
  return rivers.flatMap(river => (river.segments || []).map(segment => ({
    id: segmentId(river, segment),
    river,
    segment,
    grade: segment.grade || river.grade || 'Unknown',
    coordinates: Array.isArray(segment.coordinates) ? segment.coordinates.filter(validCoordinate) : [],
    gage: segment.usgs_gage ?? river.usgs_gage,
  })));
}

export function filterRecords(records, { query = '', state = '', grade = '' } = {}) {
  const term = query.trim().toLowerCase();
  return records.filter(record => (!state || record.river.state === state) &&
    (!grade || record.grade === grade) &&
    (!term || `${record.river.name} ${record.segment.name}`.toLowerCase().includes(term)));
}

export function featureCollection(features = []) {
  return { type: 'FeatureCollection', features };
}

function feature(geometry, properties) {
  return { type: 'Feature', geometry, properties };
}

export function recordsGeoJSON(records) {
  return featureCollection(records.filter(record => record.coordinates.length > 0).map(record =>
    feature(record.coordinates.length === 1
      ? { type: 'Point', coordinates: record.coordinates[0] }
      : { type: 'LineString', coordinates: record.coordinates },
    { id: record.id, name: record.segment.name, grade: record.grade })));
}

export function gagesGeoJSON(records) {
  const seen = new Set();
  return featureCollection(records.flatMap(record => {
    const coordinates = gagePoint(record.gage);
    const key = gageKey(record.gage);
    if (!coordinates || seen.has(key)) return [];
    seen.add(key);
    return [feature({ type: 'Point', coordinates }, { id: record.id, name: 'Gage / flow lookup point' })];
  }));
}

export function waypointsGeoJSON(waypoints) {
  return featureCollection(waypoints.map(point => feature(
    { type: 'Point', coordinates: point.coordinates }, { name: point.name, kind: point.kind })));
}

export function measurementGeoJSON(points) {
  return points.length < 2 ? featureCollection() : featureCollection([
    feature({ type: 'LineString', coordinates: points }, {}),
  ]);
}

export function distanceMiles(points) {
  let total = 0;
  const radians = degrees => degrees * Math.PI / 180;
  for (let i = 1; i < points.length; i += 1) {
    if (!validCoordinate(points[i - 1]) || !validCoordinate(points[i])) continue;
    const [lon1, lat1] = points[i - 1].map(radians);
    const [lon2, lat2] = points[i].map(radians);
    const a = Math.sin((lat2 - lat1) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
    total += 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  }
  return total;
}

export function readPlan(raw, records) {
  const empty = { waypoints: [], itinerary: [], invalid: false };
  if (raw === null || raw === undefined) return empty;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.waypoints) || !Array.isArray(data.itinerary)) {
      return { ...empty, invalid: true };
    }
    const ids = new Set();
    const waypoints = data.waypoints.filter(point => {
      const valid = point && typeof point.id === 'string' && point.id.length <= 100 &&
        !ids.has(point.id) && typeof point.name === 'string' && point.name.trim().length > 0 &&
        point.id.trim().length > 0 && point.name.length <= 100 && waypointKinds.includes(point.kind) && validCoordinate(point.coordinates);
      if (valid) ids.add(point.id);
      return valid;
    }).slice(0, PLAN_LIMIT).map(({ id, name, kind, coordinates }) => ({ id, name, kind, coordinates }));
    const recordIds = new Set(records.map(record => record.id));
    const itinerary = data.itinerary.filter(id => typeof id === 'string' && recordIds.has(id)).slice(0, PLAN_LIMIT);
    return { waypoints, itinerary, invalid: waypoints.length !== data.waypoints.length || itinerary.length !== data.itinerary.length };
  } catch {
    return { ...empty, invalid: true };
  }
}

// Imported files are all-or-nothing; local recovery may still salvage valid entries.
export function importPlan(raw, records) {
  if (typeof raw !== 'string' || raw.length > PLAN_FILE_LIMIT) throw new Error('Plan must be a version 1 JSON file no larger than 1 MB.');
  const plan = readPlan(raw, records);
  if (plan.invalid) throw new Error('Invalid plan. Check version, waypoint fields, limits and segment IDs. Nothing was imported.');
  return { waypoints: plan.waypoints, itinerary: plan.itinerary };
}

export function exportPlan(plan, records) {
  const valid = importPlan(JSON.stringify({ version: 1, waypoints: plan.waypoints, itinerary: plan.itinerary }), records);
  return JSON.stringify({ version: 1, ...valid }, null, 2);
}

function xmlText(value) {
  return String(value).replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
}

export function exportGPX(plan, records) {
  const valid = importPlan(JSON.stringify({ version: 1, waypoints: plan.waypoints, itinerary: plan.itinerary }), records);
  const point = (tag, coordinates, name) => `<${tag} lat="${coordinates[1]}" lon="${coordinates[0]}">${name === undefined ? '' : `<name>${xmlText(name)}</name>`}</${tag}>`;
  const trip = valid.itinerary.map(id => records.find(record => record.id === id));
  const waypoints = valid.waypoints.map(item => point('wpt', item.coordinates, `${item.name} (${item.kind})`));
  const tracks = [];
  trip.forEach(record => {
    const name = `${record.river.name} — ${record.segment.name}`;
    const coordinates = record.coordinates.filter(validCoordinate);
    if (coordinates.length === 1) waypoints.push(point('wpt', coordinates[0], name));
    if (coordinates.length > 1) tracks.push(`<trk><name>${xmlText(name)}</name><trkseg>${coordinates.map(coordinate => point('trkpt', coordinate)).join('')}</trkseg></trk>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="River Flows" xmlns="http://www.topografix.com/GPX/1/1"><metadata><desc>Approximate geometry and personal notes only; not navigation or verified access. Separate tracks do not establish connections.</desc></metadata>${waypoints.join('')}${tracks.join('')}</gpx>`;
}
