import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RiverMap from './RiverMap';
import * as maplibregl from 'maplibre-gl';
import { fetchUSGSFlow } from './fetchUSGSFlow';
import { STORAGE_KEY } from './mapData';

jest.mock('./mapConfig', () => ({
  __esModule: true,
  default: {
    style: 'https://demotiles.maplibre.org/style.json',
    satelliteTiles: 'https://example.test/satellite/{z}/{x}/{y}.png',
    satelliteAttribution: 'Test imagery provider',
    terrainTiles: 'https://example.test/terrain/{z}/{x}/{y}.png',
    terrainAttribution: 'Test elevation provider',
  },
}));
jest.mock('./fetchUSGSFlow', () => ({ fetchUSGSFlow: jest.fn() }));
jest.mock('./rivers', () => ({ rivers: [
  { name: 'Test River', state: 'WY', usgs_gage: '12345', segments: [
    { name: 'Upper Test', grade: 'III-IV', coordinates: [[-110, 43], [-110, 44]] },
    { name: 'Test Gage', grade: 'II', coordinates: [[-110, 43]] },
  ] },
  { name: 'Another River', state: 'CO', usgs_gage: '67890', segments: [
    { name: 'Lower Test', grade: 'III', coordinates: [[-105, 40], [-105, 41]] },
  ] },
] }));
jest.mock('maplibre-gl', () => {
  const instances = [];
  const controlInstances = [];
  const MockControl = jest.fn().mockImplementation(() => {
    const control = { on: jest.fn(), off: jest.fn() };
    controlInstances.push(control);
    return control;
  });
  const Map = jest.fn().mockImplementation(() => {
    const events = {};
    const sources = {};
    const layers = {};
    const canvas = global.document.createElement('canvas');
    const map = {
      events, sources, layers,
      addControl: jest.fn(),
      on: jest.fn((event, handler) => { events[event] = handler; }),
      off: jest.fn(),
      getCanvas: () => canvas,
      getContainer: () => ({ clientWidth: 1024, clientHeight: 768 }),
      getSource: id => sources[id],
      addSource: jest.fn((id, source) => { sources[id] = { ...source, setData: jest.fn() }; }),
      getLayer: id => layers[id],
      addLayer: jest.fn(layer => { layers[layer.id] = layer; }),
      setFilter: jest.fn(),
      setTerrain: jest.fn(),
      setPitch: jest.fn(),
      setStyle: jest.fn(() => {
        Object.keys(sources).forEach(key => delete sources[key]);
        Object.keys(layers).forEach(key => delete layers[key]);
      }),
      isStyleLoaded: () => true,
      queryRenderedFeatures: jest.fn(() => []),
      fitBounds: jest.fn(), flyTo: jest.fn(), resize: jest.fn(), remove: jest.fn(),
    };
    instances.push(map);
    return map;
  });
  return {
    __esModule: true,
    Map, NavigationControl: MockControl, FullscreenControl: MockControl, GeolocateControl: MockControl,
    LngLatBounds: jest.fn().mockImplementation(() => ({ extend: jest.fn().mockReturnThis() })),
    instances, controlInstances,
  };
}, { virtual: true });

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  maplibregl.instances.length = 0;
  maplibregl.controlInstances.length = 0;
  fetchUSGSFlow.mockResolvedValue(0);
});

function currentMap() {
  return maplibregl.instances[maplibregl.instances.length - 1];
}
function clickMap(lng = -110, lat = 43) {
  act(() => currentMap().events.click({ lngLat: { lng, lat }, point: { x: 10, y: 10 } }));
}
function loadStyle() {
  act(() => currentMap().events['style.load']());
}

test('filters exact difficulty and state; deduplicates gages and preserves valid zero discharge', async () => {
  render(<RiverMap />);
  await screen.findAllByText('0 cfs');
  expect(fetchUSGSFlow).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByLabelText('Exact difficulty'), { target: { value: 'III-IV' } });
  expect(screen.getByRole('button', { name: /Test River Upper Test/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Test Gage/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Exact difficulty'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('State'), { target: { value: 'CO' } });
  expect(screen.getByRole('button', { name: /Another River/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search rivers and segments'), { target: { value: 'missing' } });
  expect(screen.getByText(/No matching segments/)).toBeInTheDocument();
});

test('shows loading separately from unavailable and passes discharge into details', async () => {
  fetchUSGSFlow.mockResolvedValue(null);
  const details = jest.fn(() => <p>Existing charts</p>);
  render(<RiverMap initialState="WY" renderDetails={details} />);
  expect(screen.getAllByText('Loading flow…')).toHaveLength(2);
  await screen.findAllByText('Flow unavailable');
  fireEvent.click(screen.getByRole('button', { name: /Test River Test Gage/ }));
  expect(screen.getByText(/Only a single location/)).toBeInTheDocument();
  expect(details.mock.calls[details.mock.calls.length - 1][2]).toBeNull();
  expect(currentMap().flyTo).toHaveBeenCalledWith({ center: [-110, 43], zoom: 11 });
});

test('saves named user waypoints, measures map clicks and manages ordered itinerary', async () => {
  render(<RiverMap initialState="WY" />);
  await screen.findAllByText('0 cfs');
  loadStyle();
  fireEvent.change(screen.getByLabelText('Waypoint name'), { target: { value: '<b>My spot</b>' } });
  fireEvent.change(screen.getByLabelText('Waypoint kind'), { target: { value: 'put-in' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add by clicking map' }));
  clickMap();
  expect(screen.getByText('<b>My spot</b>')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).waypoints[0]).toMatchObject({
    name: '<b>My spot</b>', coordinates: [-110, 43], kind: 'put-in',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Measure by clicking map' }));
  clickMap(0, 0);
  clickMap(0, 1);
  expect(screen.getByText(/2 points · 69.09 miles/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo point' }));
  expect(screen.getByText(/1 points · 0.00 miles/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear measurement' }));
  expect(screen.getByText(/0 points · 0.00 miles/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Test River Upper Test/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add segment to trip' }));
  fireEvent.click(screen.getByRole('button', { name: /Test River Test Gage/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add segment to trip' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move trip item 2 up' }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).itinerary).toEqual(['0:1', '0:0']);
  fireEvent.click(screen.getByRole('button', { name: 'Remove trip item 1' }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).itinerary).toEqual(['0:0']);
  fireEvent.click(screen.getByRole('button', { name: 'Delete waypoint <b>My spot</b>' }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).waypoints).toEqual([]);
});

test('recreates overlays after satellite style swaps, applies terrain, selects map features and cleans up', async () => {
  const { unmount } = render(<RiverMap />);
  await screen.findAllByText('0 cfs');
  loadStyle();
  currentMap().queryRenderedFeatures.mockReturnValue([{ properties: { id: '0:0' } }]);
  clickMap();
  expect(screen.getByRole('heading', { name: 'Upper Test' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Basemap'), { target: { value: 'satellite' } });
  const map = currentMap();
  expect(map.setStyle.mock.calls[map.setStyle.mock.calls.length - 1][0].sources.satellite.attribution).toBe('Test imagery provider');
  loadStyle();
  expect(map.sources['river-reaches'].data.features).toHaveLength(3);
  expect(map.setFilter).toHaveBeenCalledWith('river-selected', ['all', ['==', '$type', 'LineString'], ['==', 'id', '0:0']]);
  fireEvent.click(screen.getByLabelText('3D terrain'));
  expect(map.sources['river-terrain']).toMatchObject({ type: 'raster-dem', encoding: 'mapbox', tileSize: 256 });
  expect(map.setTerrain).toHaveBeenLastCalledWith({ source: 'river-terrain', exaggeration: 1 });
  const location = maplibregl.controlInstances[2];
  act(() => location.on.mock.calls[0][1]());
  expect(screen.getByRole('alert')).toHaveTextContent('permission denied');
  unmount();
  expect(map.remove).toHaveBeenCalledTimes(1);
  expect(location.off).toHaveBeenCalledWith('error', expect.any(Function));
});

test('restores saved plan and warns for invalid data or inaccessible storage', async () => {
  localStorage.setItem(STORAGE_KEY, '{"version":1,"waypoints":[],"itinerary":["0:0","bad"]}');
  const { unmount } = render(<RiverMap />);
  await screen.findAllByText('0 cfs');
  expect(screen.getByRole('alert')).toHaveTextContent('invalid');
  expect(within(screen.getByRole('region', { name: 'Trip itinerary' })).getAllByRole('listitem')).toHaveLength(1);
  unmount();
  const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<RiverMap />);
  expect(screen.getByRole('alert')).toHaveTextContent('Local storage unavailable');
  getItem.mockRestore();
});

test('falls back to accessible river and trip controls when WebGL cannot initialize', async () => {
  maplibregl.Map.mockImplementationOnce(() => { throw new Error('WebGL unavailable'); });
  render(<RiverMap />);
  await screen.findAllByText('0 cfs');
  expect(screen.getByRole('alert')).toHaveTextContent('Interactive map unavailable');
  fireEvent.click(screen.getByRole('button', { name: /Test River Upper Test/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add segment to trip' }));
  expect(screen.getByRole('button', { name: 'Remove trip item 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add by clicking map' })).toBeDisabled();
});

test('refreshes every five minutes and ignores stale requests after filter changes', async () => {
  jest.useFakeTimers();
  try {
    let oldResolve;
    fetchUSGSFlow.mockImplementation(gage => gage === '12345'
      ? new Promise(resolve => { oldResolve = resolve; }) : Promise.resolve(12));
    render(<RiverMap initialState="WY" />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'CO' } });
    await act(async () => {});
    await act(async () => oldResolve(999));
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'WY' } });
    expect(screen.getAllByText('Loading flow…')).toHaveLength(2);
    fetchUSGSFlow.mockResolvedValue(50);
    await act(async () => { jest.advanceTimersByTime(300000); });
    await waitFor(() => expect(screen.getAllByText('50 cfs')).toHaveLength(2));
  } finally {
    jest.useRealTimers();
  }
});
