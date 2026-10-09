// Robust USGS flow fetcher
// Supports a site id (string/number) or { site }; geographic guesses are not used.
// Returns the latest instantaneous discharge (parameter 00060) in cfs, or null.

const cache = new Map();
export const FLOW_CACHE_TTL = 5 * 60 * 1000;

function cached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < FLOW_CACHE_TTL) return entry.data;
  cache.delete(key);
  return undefined;
}

function remember(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

function siteCode(gage) {
  const site = typeof gage === 'object' ? gage?.site : gage;
  return /^\d{8,15}$/.test(String(site)) ? String(site) : null;
}

function dischargeSeries(series, site, daily = false) {
  return series.filter(s =>
    s.sourceInfo?.siteCode?.some(code => code.value === site) &&
    s.variable?.variableCode?.some(code => code.value === '00060') &&
    s.variable?.unit?.unitCode === 'ft3/s' &&
    (!daily || s.variable?.options?.option?.some(option => option.optionCode === '00003'))
  );
}

function validFlow(entry, series) {
  if (entry?.value == null || String(entry.value).trim() === '') return null;
  const value = Number(entry.value);
  return Number.isFinite(value) && value >= 0 && value !== Number(series.variable?.noDataValue)
    ? value : null;
}

export async function fetchUSGSObservation(gage) {
  const site = siteCode(gage);
  if (!site) return null; // Proximity alone does not establish a gauge/reach association.
  const key = `site:${site}`;
  const hit = cached(key);
  if (hit !== undefined) return hit;
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00060&siteStatus=all`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const readings = dischargeSeries(data.value?.timeSeries || [], site).flatMap(series =>
      (series.values || []).flatMap(group => (group.value || []).map(entry => ({
        value: validFlow(entry, series),
        observedAt: entry.dateTime
      })))
    ).filter(entry => entry.value !== null && Number.isFinite(Date.parse(entry.observedAt)));
    readings.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    if (!readings.length) return null;
    const observation = {
      ...readings[0], siteId: site, units: 'cfs', mappingVerified: false,
      sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${site}/#parameterCode=00060`
    };
    remember(key, observation);
    return observation;
  } catch {
    return null;
  }
}

export async function fetchUSGSFlow(gage) {
  return (await fetchUSGSObservation(gage))?.value ?? null;
}

// Fetch historical daily mean data for the past year
export async function fetchHistoricalFlow(siteId) {
  siteId = siteCode(siteId);
  if (!siteId) return [];
  
  const cacheKey = `historical:${siteId}`;
  const hit = cached(cacheKey);
  if (hit !== undefined) return hit;
  
  try {
    // Calculate date range: past 365 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // USGS Daily Values API
    const url = `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${siteId}&parameterCd=00060&statCd=00003&startDT=${start}&endDT=${end}&siteStatus=all`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    
    const ts = dischargeSeries(data.value?.timeSeries || [], siteId, true);
    if (!ts.length) {
      return [];
    }
    
    // Extract daily mean values
    const byDate = new Map();
    for (const series of ts) {
      const values = (series.values || []).flatMap(group => group.value || []);
      for (const entry of values) {
        const date = entry.dateTime?.split('T')[0];
        if (date && date >= start && date <= end) {
          byDate.set(date, validFlow(entry, series));
        }
      }
    }
    if (![...byDate.values()].some(value => value !== null)) return [];
    const historicalData = [];
    for (let day = new Date(`${start}T00:00:00Z`); formatDate(day) <= end; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = formatDate(day);
      historicalData.push({ date, flow: byDate.get(date) ?? null, dateObj: new Date(day) });
    }
    remember(cacheKey, historicalData);
    return historicalData;
  } catch (err) {
    console.error('fetchHistoricalFlow error', err);
    return [];
  }
}

// Fetch accurate gage location coordinates from USGS
export async function fetchGageCoordinates(siteId) {
  if (!siteId) return null;
  
  const cacheKey = `gageCoords:${siteId}`;
  const hit = cached(cacheKey);
  if (hit !== undefined) return hit;
  
  try {
    // USGS Water Services API - Site Info
    const url = `https://waterservices.usgs.gov/nwis/site/?sites=${siteId}&format=json&siteStatus=all`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    
    const sites = data.value?.sites || [];
    if (!sites.length) {
      return null;
    }
    
    // Extract latitude, longitude, and site info
    const site = sites[0];
    const coordinates = {
      lat: site.geoLocation?.geogLocation?.srs === 'EPSG:4326' ? 
        site.geoLocation.geogLocation.latitude : null,
      lng: site.geoLocation?.geogLocation?.srs === 'EPSG:4326' ? 
        site.geoLocation.geogLocation.longitude : null,
      siteName: site.siteName,
      siteCode: site.siteCode?.[0]?.value,
      agency: site.agencyCode,
      accuracy: site.geoLocation?.geogLocation?.srs
    };
    
    if (coordinates.lat && coordinates.lng) {
      remember(cacheKey, coordinates);
      return coordinates;
    }
    
    return null;
  } catch (err) {
    console.error('fetchGageCoordinates error', err);
    return null;
  }
}

export const rivers = [
  {
    name: 'Snake River',
    state: 'WY',
    grade: 'III',
    usgs_gage: null,
    segments: [
      {
        name: 'Jackson Hole',
        grade: 'III',
        coordinates: [
          [-110.6869, 43.4799],
          [-110.6840, 43.5100],
          [-110.7040, 43.5600],
          [-110.7400, 43.6200],
          [-110.7800, 43.6800]
        ]
      }
    ]
  },
  {
    name: 'Hoback River',
    state: 'WY',
    grade: 'II',
    usgs_gage: null,
    segments: [
      {
        name: 'Lower Hoback',
        grade: 'II',
        coordinates: [
          [-110.7815, 43.3242],
          [-110.7550, 43.3500],
          [-110.7400, 43.3750],
          [-110.7300, 43.4000]
        ]
      }
    ]
  },
  {
    name: 'Grays River',
    state: 'WA',
    grade: 'II',
    usgs_gage: null,
    segments: [
      {
        name: 'Lower Grays',
        grade: 'II',
        coordinates: [
          [-123.6712, 46.2820],
          [-123.6600, 46.2950],
          [-123.6400, 46.3100],
          [-123.6090, 46.3360]
        ]
      }
    ]
  }
];

export default fetchUSGSFlow;