import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './RiverMap.css';
import { rivers } from './rivers';
import { fetchUSGSFlow } from './fetchUSGSFlow';
import mapConfig from './mapConfig';
import {
  STORAGE_KEY, waypointKinds, gradeColor, gradeColors, segmentRecords, filterRecords, recordsGeoJSON,
  gagesGeoJSON, waypointsGeoJSON, measurementGeoJSON, distanceMiles, readPlan, gageKey,
} from './mapData';

const records = segmentRecords(rivers);
const states = [...new Set(rivers.map(river => river.state))].sort();
const grades = [...new Set(records.map(record => record.grade))].sort();
const gradePaint = ['match', ['get', 'grade'], ...grades.flatMap(grade => [grade, gradeColor(grade)]), '#627785'];
const demoStyle = 'https://demotiles.maplibre.org/style.json';
const satelliteAvailable = Boolean(mapConfig.satelliteTiles && mapConfig.satelliteAttribution);
const terrainAvailable = Boolean(mapConfig.terrainTiles && mapConfig.terrainAttribution);

function rasterStyle() {
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster', tiles: [mapConfig.satelliteTiles], tileSize: 256,
        attribution: mapConfig.satelliteAttribution,
      },
    },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
  };
}

function flowLabel(flow) {
  return flow === undefined ? 'Loading flow…' : flow === null ? 'Flow unavailable' : `${flow.toLocaleString()} cfs`;
}

function fitRecord(map, record) {
  if (!map || !record.coordinates.length) return;
  if (record.coordinates.length === 1) {
    map.flyTo({ center: record.coordinates[0], zoom: 11 });
    return;
  }
  const bounds = record.coordinates.reduce((box, point) => box.extend(point),
    new maplibregl.LngLatBounds(record.coordinates[0], record.coordinates[0]));
  const width = map.getContainer().clientWidth;
  const padding = width > 640
    ? { top: 64, right: 64, bottom: 64, left: Math.min(450, width / 2) }
    : { top: 48, right: 36, bottom: map.getContainer().clientHeight * .54, left: 36 };
  map.fitBounds(bounds, { padding, maxZoom: 12, duration: 600 });
}

// Sources belong to a style, so every style load rebuilds them from the latest React state.
function syncOverlays(map, data) {
  const sources = {
    'river-reaches': recordsGeoJSON(data.visible),
    'river-gages': gagesGeoJSON(data.visible),
    'river-waypoints': waypointsGeoJSON(data.waypoints),
    'river-measurement': measurementGeoJSON(data.measurement),
  };
  Object.entries(sources).forEach(([id, geojson]) => {
    if (map.getSource(id)) map.getSource(id).setData(geojson);
    else map.addSource(id, { type: 'geojson', data: geojson });
  });
  const layers = [
    { id: 'river-lines', type: 'line', source: 'river-reaches', filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': gradePaint, 'line-width': 4 } },
    { id: 'river-selected', type: 'line', source: 'river-reaches',
      filter: ['==', 'id', data.selectedId || ''], paint: { 'line-color': '#ffd166', 'line-width': 7 } },
    { id: 'river-points', type: 'circle', source: 'river-reaches', filter: ['==', '$type', 'Point'],
      paint: { 'circle-color': gradePaint, 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } },
    { id: 'river-selected-point', type: 'circle', source: 'river-reaches',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'id', data.selectedId || '']],
      paint: { 'circle-color': '#ffd166', 'circle-radius': 9, 'circle-stroke-color': '#172d3f', 'circle-stroke-width': 2 } },
    { id: 'river-gage-points', type: 'circle', source: 'river-gages',
      paint: { 'circle-color': '#9c3cbe', 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } },
    { id: 'river-waypoint-points', type: 'circle', source: 'river-waypoints',
      paint: { 'circle-color': '#e06432', 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } },
    { id: 'river-measure-line', type: 'line', source: 'river-measurement',
      paint: { 'line-color': '#e06432', 'line-width': 3, 'line-dasharray': [2, 2] } },
  ];
  layers.forEach(layer => { if (!map.getLayer(layer.id)) map.addLayer(layer); });
  map.setFilter('river-selected', ['all', ['==', '$type', 'LineString'], ['==', 'id', data.selectedId || '']]);
  map.setFilter('river-selected-point', ['all', ['==', '$type', 'Point'], ['==', 'id', data.selectedId || '']]);
  if (terrainAvailable && data.terrain) {
    if (!map.getSource('river-terrain')) map.addSource('river-terrain', {
      type: 'raster-dem', tiles: [mapConfig.terrainTiles], tileSize: 256,
      encoding: 'mapbox', attribution: mapConfig.terrainAttribution,
    });
    map.setTerrain({ source: 'river-terrain', exaggeration: 1 });
    map.setPitch(45);
  } else {
    map.setTerrain(null);
    map.setPitch(0);
  }
}

export default function RiverMap({ initialState, onBack, renderDetails }) {
  const initial = typeof initialState === 'string' ? { state: initialState } : initialState || {};
  const [state, setState] = useState(states.includes(initial.state) ? initial.state : '');
  const [query, setQuery] = useState(initial.query || '');
  const [grade, setGrade] = useState(initial.grade || '');
  const [selectedId, setSelectedId] = useState(null);
  const [basemap, setBasemap] = useState('vector');
  const [terrain, setTerrain] = useState(false);
  const [mode, setMode] = useState('browse');
  const [waypointName, setWaypointName] = useState('');
  const [waypointKind, setWaypointKind] = useState('waypoint');
  const [measurement, setMeasurement] = useState([]);
  const [plan, setPlan] = useState({ waypoints: [], itinerary: [] });
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const [mapError, setMapError] = useState('');
  const [mapFailed, setMapFailed] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [toolStatus, setToolStatus] = useState('');
  const [flows, setFlows] = useState({});
  const [refresh, setRefresh] = useState(0);
  const container = useRef(null);
  const mapRef = useRef(null);
  const latest = useRef(null);
  const needsStateFit = useRef(true);
  const previousBasemap = useRef('vector');
  const visible = useMemo(() => filterRecords(records, { state, query, grade }), [state, query, grade]);
  const selected = records.find(record => record.id === selectedId);
  latest.current = { visible, selectedId, terrain, waypoints: plan.waypoints, measurement, mode, waypointName, waypointKind };

  useEffect(() => {
    try {
      const saved = readPlan(window.localStorage.getItem(STORAGE_KEY), records);
      setPlan({ waypoints: saved.waypoints, itinerary: saved.itinerary });
      if (saved.invalid) setStorageWarning('Some saved plan data was invalid and was discarded.');
    } catch {
      setStorageWarning('Local storage unavailable. Your plan will only last for this visit.');
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...plan }));
    } catch {
      setStorageWarning('Unable to save locally. Your plan will only last for this visit.');
    }
  }, [plan, storageReady]);

  const flowRecords = useMemo(() => selected && !visible.some(record => record.id === selected.id)
    ? [...visible, selected] : visible, [visible, selected]);
  useEffect(() => {
    let active = true;
    const gages = new Map();
    flowRecords.forEach(record => {
      const key = gageKey(record.gage);
      if (key) gages.set(key, record.gage);
    });
    gages.forEach((gage, key) => {
      Promise.resolve().then(() => fetchUSGSFlow(gage)).then(flow => {
        if (active) setFlows(previous => ({ ...previous,
          [key]: typeof flow === 'number' && Number.isFinite(flow) ? flow : null }));
      }).catch(() => {
        if (active) setFlows(previous => ({ ...previous, [key]: null }));
      });
    });
    const interval = window.setInterval(() => setRefresh(value => value + 1), 300000);
    return () => { active = false; window.clearInterval(interval); };
  }, [flowRecords, refresh]);

  useEffect(() => {
    let map;
    let observer;
    let geolocate;
    const geolocationError = () => setLocationError('Location unavailable or permission denied. You can still browse rivers.');
    const styleLoaded = () => {
      try {
        syncOverlays(map, latest.current);
        if (needsStateFit.current) {
          const coordinates = latest.current.visible.flatMap(record => record.coordinates);
          fitRecord(map, { coordinates });
          needsStateFit.current = false;
        }
        setMapError('');
      } catch {
        setMapError('Map overlays could not load. The river list remains available.');
      }
    };
    const click = event => {
      const data = latest.current;
      const point = [event.lngLat.lng, event.lngLat.lat];
      if (data.mode === 'measure') {
        setMeasurement(previous => [...previous, point]);
        return;
      }
      if (data.mode === 'waypoint') {
        const name = data.waypointName.trim();
        if (!name) { setToolStatus('Enter a waypoint name before clicking the map.'); return; }
        setPlan(previous => ({ ...previous, waypoints: [...previous.waypoints, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name, kind: data.waypointKind, coordinates: point,
        }] }));
        setMode('browse');
        setWaypointName('');
        setToolStatus(`Saved ${name} on this device.`);
        return;
      }
      const layers = ['river-lines', 'river-points', 'river-gage-points'].filter(id => map.getLayer(id));
      if (!layers.length) return;
      const features = map.queryRenderedFeatures(event.point, { layers });
      if (features.length) setSelectedId(features[0].properties.id);
    };
    const lost = event => {
      event.preventDefault();
      setMapFailed(true);
      setMapError('WebGL context lost. Use the accessible river list or reload to retry the map.');
    };
    try {
      map = new maplibregl.Map({
        container: container.current, style: mapConfig.style || demoStyle,
        center: [-111, 42], zoom: 4, attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true }, trackUserLocation: false,
      });
      geolocate.on('error', geolocationError);
      map.addControl(geolocate, 'top-right');
      map.on('style.load', styleLoaded);
      map.on('click', click);
      map.on('error', () => setMapError('A map resource could not load. Try another basemap; river data remains available in the list.'));
      map.getCanvas().addEventListener('webglcontextlost', lost);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => map.resize());
        observer.observe(container.current);
      }
    } catch {
      setMapFailed(true);
      setMapError('Interactive map unavailable (WebGL may be disabled). All rivers and trip tools remain available below.');
    }
    const resize = () => { if (map) map.resize(); };
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      geolocate?.off('error', geolocationError);
      if (map) {
        map.getCanvas().removeEventListener('webglcontextlost', lost);
        map.off('style.load', styleLoaded);
        map.off('click', click);
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try { syncOverlays(map, latest.current); }
    catch { setMapError('Map overlays could not update. Use the river list.'); }
  }, [visible, selectedId, plan.waypoints, measurement, terrain]);

  useEffect(() => {
    needsStateFit.current = true;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      fitRecord(map, { coordinates: latest.current.visible.flatMap(record => record.coordinates) });
      needsStateFit.current = false;
    } catch {
      setMapError('Unable to zoom to the selected state. Use the river list.');
    }
  }, [state]);

  useEffect(() => {
    if (previousBasemap.current === basemap) return;
    previousBasemap.current = basemap;
    const map = mapRef.current;
    if (!map) return;
    try { map.setStyle(basemap === 'satellite' ? rasterStyle() : mapConfig.style || demoStyle); }
    catch { setMapError('Basemap could not be changed. Use the river list.'); }
  }, [basemap]);

  const selectRecord = record => {
    setSelectedId(record.id);
    try { fitRecord(mapRef.current, record); }
    catch { setMapError('Unable to zoom to this segment. Its details are available below.'); }
  };
  const getFlow = record => {
    const key = gageKey(record.gage);
    return key ? flows[key] : null;
  };
  const itinerary = plan.itinerary.map(id => records.find(record => record.id === id)).filter(Boolean);
  const moveTrip = (index, delta) => setPlan(previous => {
    const next = [...previous.itinerary];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return { ...previous, itinerary: next };
  });

  return (
    <main className={`river-workspace${mapFailed ? ' river-map-unavailable' : ''}`}>
      <div ref={container} className="river-map-canvas" role="region" aria-label="Interactive river map" />
      <aside className="river-panel" aria-label="River explorer and trip planner">
        <header className="river-panel-header">
          {onBack && <button type="button" onClick={onBack}>← Home</button>}
          <h1>River explorer</h1>
          <p>Find water. Plan thoughtfully.</p>
        </header>
        <p className="river-safety">Approximate river geometry, not safe navigation or verified access. Check current conditions, closures, land permissions and your skills before boating.</p>
        {mapError && <p role="alert" className="river-notice">{mapError}</p>}
        {locationError && <p role="alert" className="river-notice">{locationError}</p>}
        {storageWarning && <p role="alert" className="river-notice">{storageWarning}</p>}
        <section aria-label="Map settings" className="river-map-settings">
          <label>Basemap
            <select value={basemap} onChange={event => setBasemap(event.target.value)} disabled={mapFailed}>
              <option value="vector">{(mapConfig.style || demoStyle) === demoStyle ? 'Demonstration vector map (not production)' : 'Configured vector map'}</option>
              <option value="satellite" disabled={!satelliteAvailable}>Satellite{!satelliteAvailable ? ' (not configured)' : ''}</option>
            </select>
          </label>
          <label className="river-checkbox"><input type="checkbox" checked={terrain}
            disabled={!terrainAvailable || mapFailed} onChange={event => setTerrain(event.target.checked)} />
            3D terrain{!terrainAvailable ? ' (not configured)' : ''}
          </label>
          {(mapConfig.satelliteTiles && !satelliteAvailable) || (mapConfig.terrainTiles && !terrainAvailable)
            ? <p className="river-notice">Configured tiles need provider attribution before they can be enabled.</p> : null}
          <div className="river-legend" aria-label="River difficulty colors">
            {Object.entries(gradeColors).map(([className, color]) => <span key={className}>
              <i style={{ background: color }} aria-hidden="true" />Class {className}
            </span>)}
          </div>
          <p className="river-legend">Compound classes use the first class color; gray means unknown. Yellow: selected segment · Purple dots: gage / flow lookup point · Orange: user waypoint or measurement</p>
        </section>
        <section aria-labelledby="river-search-heading">
          <h2 id="river-search-heading">Explore rivers</h2>
          <label>Search rivers and segments<input type="search" value={query}
            onChange={event => setQuery(event.target.value)} placeholder="River or segment name" /></label>
          <div className="river-filter-row">
            <label>State<select value={state} onChange={event => setState(event.target.value)}>
              <option value="">All states</option>{states.map(value => <option key={value}>{value}</option>)}
            </select></label>
            <label>Exact difficulty<select value={grade} onChange={event => setGrade(event.target.value)}>
              <option value="">All classes</option>{grades.map(value => <option key={value} value={value}>Class {value}</option>)}
            </select></label>
          </div>
          <p aria-live="polite">{visible.length} segments · USGS refreshed every 5 minutes</p>
          <ul className="river-results">
            {visible.map(record => <li key={record.id}>
              <button type="button" aria-pressed={selectedId === record.id} onClick={() => selectRecord(record)}>
                <strong>{record.river.name}</strong><span>{record.segment.name} · {record.river.state} · Class {record.grade}</span>
                <span>{flowLabel(getFlow(record))}{record.coordinates.length === 1 ? ' · Point only, no mapped reach' : ''}</span>
              </button>
            </li>)}
          </ul>
          {!visible.length && <p>No matching segments. Try another filter.</p>}
        </section>
        {selected && <section aria-labelledby="river-details-heading" className="river-details">
          <h2 id="river-details-heading">{selected.segment.name}</h2>
          <p>{selected.river.name} · {selected.river.state} · Class {selected.grade}</p>
          <p aria-live="polite"><strong>{flowLabel(getFlow(selected))}</strong> — discharge is not a safety rating.</p>
          <p>{selected.segment.description || selected.river.description}</p>
          {selected.coordinates.length > 1 ? <p>
            Approximate length: {distanceMiles(selected.coordinates).toFixed(1)} miles.
            Start: {selected.coordinates[0].map(value => value.toFixed(4)).join(', ')}.
            End: {selected.coordinates[selected.coordinates.length - 1].map(value => value.toFixed(4)).join(', ')}.
            Coordinates are longitude, latitude; endpoints are not verified access.
          </p> : <p>{selected.coordinates.length ? 'Only a single location is mapped; no reach length or access is established.' : 'No mapped geometry is available.'}</p>}
          <button type="button" disabled={plan.itinerary.length >= 500}
            onClick={() => setPlan(previous => ({ ...previous, itinerary: [...previous.itinerary, selected.id] }))}>
            Add segment to trip
          </button>
          {renderDetails && renderDetails(selected.river, selected.segment, getFlow(selected))}
        </section>}
        <section aria-labelledby="river-waypoint-heading">
          <h2 id="river-waypoint-heading">Personal waypoints</h2>
          <p>User-entered locations are not verified access sites. Saved only on this device.</p>
          <label>Waypoint name<input maxLength={100} value={waypointName}
            onChange={event => setWaypointName(event.target.value)} /></label>
          <label>Waypoint kind<select value={waypointKind} onChange={event => setWaypointKind(event.target.value)}>
            {waypointKinds.map(kind => <option key={kind}>{kind}</option>)}
          </select></label>
          <button type="button" aria-pressed={mode === 'waypoint'} disabled={mapFailed || plan.waypoints.length >= 500}
            onClick={() => { setMode(mode === 'waypoint' ? 'browse' : 'waypoint'); setToolStatus(''); }}>
            {mode === 'waypoint' ? 'Cancel waypoint' : 'Add by clicking map'}
          </button>
          {mode === 'waypoint' && <p role="status">Enter a name, then click the map to save a {waypointKind}.</p>}
          <p role="status">{toolStatus}</p>
          <ul className="river-plan-list">{plan.waypoints.map(point => <li key={point.id}>
            <span><strong>{point.name}</strong> · {point.kind}<br />{point.coordinates.map(value => value.toFixed(4)).join(', ')}</span>
            <button type="button" aria-label={`Delete waypoint ${point.name}`}
              onClick={() => setPlan(previous => ({ ...previous, waypoints: previous.waypoints.filter(item => item.id !== point.id) }))}>Delete</button>
          </li>)}</ul>
        </section>
        <section aria-labelledby="river-measure-heading">
          <h2 id="river-measure-heading">Measure distance</h2>
          <button type="button" disabled={mapFailed} aria-pressed={mode === 'measure'}
            onClick={() => setMode(mode === 'measure' ? 'browse' : 'measure')}>
            {mode === 'measure' ? 'Stop measuring' : 'Measure by clicking map'}
          </button>
          {mode === 'measure' && <p role="status">Click map points in order. Lines connect directly; they do not follow a river.</p>}
          <p aria-live="polite">{measurement.length} points · {distanceMiles(measurement).toFixed(2)} miles, approximate straight-line total</p>
          <div className="river-actions"><button type="button" disabled={!measurement.length}
            onClick={() => setMeasurement(previous => previous.slice(0, -1))}>Undo point</button>
          <button type="button" disabled={!measurement.length} onClick={() => setMeasurement([])}>Clear measurement</button></div>
        </section>
        <section aria-labelledby="river-trip-heading">
          <h2 id="river-trip-heading">Trip itinerary</h2>
          <p>Ordered notes only, not a routed journey or safe navigation. Distances exclude connections between segments. Saved on this device, not a server.</p>
          <ol className="river-plan-list">{itinerary.map((record, index) => <li key={`${record.id}-${index}`}>
            <span>{record.river.name} — {record.segment.name}<br />
              {record.coordinates.length > 1 ? `${distanceMiles(record.coordinates).toFixed(1)} approximate miles` : 'Length unavailable'}
            </span><div className="river-actions">
              <button type="button" aria-label={`Move trip item ${index + 1} up`} disabled={index === 0} onClick={() => moveTrip(index, -1)}>↑</button>
              <button type="button" aria-label={`Move trip item ${index + 1} down`} disabled={index === itinerary.length - 1} onClick={() => moveTrip(index, 1)}>↓</button>
              <button type="button" aria-label={`Remove trip item ${index + 1}`}
                onClick={() => setPlan(previous => ({ ...previous, itinerary: previous.itinerary.filter((_, position) => position !== index) }))}>Remove</button>
            </div>
          </li>)}</ol>
          <p>Approximate mapped total: {itinerary.reduce((total, record) => total + distanceMiles(record.coordinates), 0).toFixed(1)} miles
            {itinerary.some(record => record.coordinates.length < 2) ? ' (incomplete: some lengths unavailable)' : ''}</p>
        </section>
      </aside>
    </main>
  );
}
