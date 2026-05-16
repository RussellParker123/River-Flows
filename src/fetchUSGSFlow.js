// Robust USGS flow fetcher
// Supports either a site id (string/number) or a search point { lat, lng }
// Returns the latest instantaneous discharge (parameter 00060) in cfs, or null.

const cache = new Map(); // simple in-memory cache for recent gage lookups

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function fetchBySiteId(siteId) {
  if (!siteId) return null;
  const cacheKey = `site:${siteId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=00060&siteStatus=all`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    const ts = data.value?.timeSeries || [];
    if (!ts.length) {
      cache.set(cacheKey, null);
      return null;
    }
    // find first series with values
    for (const s of ts) {
      const vals = s.values?.[0]?.value;
      if (vals && vals.length) {
        const latest = vals[vals.length - 1];
        const num = latest && latest.value ? Number(latest.value) : null;
        cache.set(cacheKey, num);
        return num;
      }
    }
    cache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error('fetchBySiteId error', err);
    return null;
  }
}

async function fetchNearestByLatLng(lat, lng) {
  if (lat == null || lng == null) return null;
  const cacheKey = `near:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // try progressively larger bounding boxes (degrees)
  const deltas = [0.02, 0.05, 0.2, 1.0];
  try {
    for (const d of deltas) {
      const minLat = lat - d;
      const maxLat = lat + d;
      const minLon = lng - d;
      const maxLon = lng + d;
      const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&bBox=${minLon},${minLat},${maxLon},${maxLat}&siteStatus=all`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const ts = data.value?.timeSeries || [];
      if (!ts.length) continue;
      // find the nearest site with a valid latest value
      let best = null;
      for (const s of ts) {
        const source = s.sourceInfo || {};
        const geo = source.geoLocation?.geogLocation || source.geoLocation || {};
        const siteLat = geo.latitude ?? geo.latitude;
        const siteLon = geo.longitude ?? geo.longitude;
        const latVal = siteLat ?? s.sourceInfo?.geoLocation?.geogLocation?.latitude ?? null;
        const lonVal = siteLon ?? s.sourceInfo?.geoLocation?.geogLocation?.longitude ?? null;
        if (latVal == null || lonVal == null) continue;
        const vals = s.values?.[0]?.value;
        if (!vals || !vals.length) continue;
        const latest = vals[vals.length - 1];
        const num = latest && latest.value ? Number(latest.value) : null;
        if (num == null) continue;
        const distKm = haversineKm(lat, lng, Number(latVal), Number(lonVal));
        if (!best || distKm < best.distKm) {
          best = { distKm, num };
        }
      }
      if (best) {
        cache.set(cacheKey, best.num);
        return best.num;
      }
    }
    cache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error('fetchNearestByLatLng error', err);
    return null;
  }
}

export async function fetchUSGSFlow(gage) {
  if (!gage) return null;
  // if gage is a direct site id
  if (typeof gage === 'string' || typeof gage === 'number') {
    return fetchBySiteId(gage);
  }
  // if gage is an object with lat/lng or { lat, lng }
  if (typeof gage === 'object') {
    if (gage.site) return fetchBySiteId(gage.site);
    if (('lat' in gage && 'lng' in gage) || ('latitude' in gage && 'longitude' in gage)) {
      const lat = gage.lat ?? gage.latitude;
      const lng = gage.lng ?? gage.longitude ?? gage.lon;
      return fetchNearestByLatLng(Number(lat), Number(lng));
    }
  }
  return null;
}

// Fetch historical daily mean data for the past year
export async function fetchHistoricalFlow(siteId) {
  if (!siteId) return [];
  
  const cacheKey = `historical:${siteId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  try {
    // Calculate date range: past 365 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // USGS Daily Values API
    const url = `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${siteId}&parameterCd=00060&startDT=${start}&endDT=${end}&siteStatus=all`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    
    const ts = data.value?.timeSeries || [];
    if (!ts.length) {
      cache.set(cacheKey, []);
      return [];
    }
    
    // Extract daily mean values
    const historicalData = [];
    for (const series of ts) {
      const values = series.values?.[0]?.value || [];
      for (const entry of values) {
        if (entry.value && entry.dateTime) {
          historicalData.push({
            date: entry.dateTime.split('T')[0],
            flow: Number(entry.value),
            dateObj: new Date(entry.dateTime)
          });
        }
      }
    }
    
    // Sort by date
    historicalData.sort((a, b) => a.dateObj - b.dateObj);
    cache.set(cacheKey, historicalData);
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
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  try {
    // USGS Water Services API - Site Info
    const url = `https://waterservices.usgs.gov/nwis/site/?sites=${siteId}&format=json&siteStatus=all`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    
    const sites = data.value?.sites || [];
    if (!sites.length) {
      cache.set(cacheKey, null);
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
      cache.set(cacheKey, coordinates);
      return coordinates;
    }
    
    cache.set(cacheKey, null);
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