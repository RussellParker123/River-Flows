export const STORAGE_KEY = 'river-flows-map-plan-v1';
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
        point.name.length <= 100 && waypointKinds.includes(point.kind) && validCoordinate(point.coordinates);
      if (valid) ids.add(point.id);
      return valid;
    }).slice(0, 500).map(({ id, name, kind, coordinates }) => ({ id, name, kind, coordinates }));
    const recordIds = new Set(records.map(record => record.id));
    const itinerary = data.itinerary.filter(id => typeof id === 'string' && recordIds.has(id)).slice(0, 500);
    return { waypoints, itinerary, invalid: waypoints.length !== data.waypoints.length || itinerary.length !== data.itinerary.length };
  } catch {
    return { ...empty, invalid: true };
  }
}
