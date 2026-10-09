# River Flows

Explore river sections on a MapLibre map with USGS discharge, difficulty
filters, GPS, flow charts, videos, and community comments. The home-page
state overview remains Leaflet; the river explorer uses MapLibre.

## Development

Use Node.js 22.12+ (or a newer supported LTS), then run `npm ci`.

- `npm start`: Vite at http://localhost:3000.
- `npm run build`: production files in `build/`, preserving the previous
  output directory for existing deployments.
- `npm run preview`: preview the production build locally.
- `CI=true npm test -- --watchAll=false`: existing Jest/React Testing Library
  tests. `react-scripts` remains only as the test runner, not the build system.

Deploy `build/` with a fallback to `index.html`. The existing
`api/aww-flows.js` still needs a serverless-capable host; Vite does not serve
serverless functions during local development.

## Map providers

The default vector basemap uses MapLibre's public **demonstration** style,
not a contracted production basemap or detailed outdoor trail dataset.
WebGL is required for the map; the searchable river list and details remain
available if map initialization fails.

Configure licensed providers in `.env.local` or the hosting build environment:

| Variable | Purpose |
| --- | --- |
| `VITE_MAP_STYLE_URL` | MapLibre-compatible vector style JSON URL |
| `VITE_SATELLITE_TILES_URL` | Optional imagery template with `{z}/{x}/{y}` |
| `VITE_SATELLITE_ATTRIBUTION` | Required imagery provider attribution |
| `VITE_TERRAIN_TILES_URL` | Optional Mapbox-encoded raster DEM template with `{z}/{x}/{y}` |
| `VITE_TERRAIN_ATTRIBUTION` | Required terrain provider attribution |

Satellite and terrain controls require both a source and attribution.
DEM tiles must be Mapbox-encoded, not raw elevation or Terrarium tiles.
Endpoints must support browser CORS, HTTPS, and the required coverage and
zoom levels. Vector attribution comes from the style's sources. Rebuild
after changing configuration.

`VITE_` values are public browser settings: never include private credentials.
Use only provider-designated public browser keys, restricted by domain and
quota. Check terms, attribution, costs, and download rights before production
use. Trails and land boundaries are not bundled; choose licensed datasets
and verify coverage before adding them to the configured style.
No onX code, private APIs, or proprietary datasets are used.

## Explorer and planning

- Search river and segment names, filter by state and segment class, and
  select a reach from the list or map. Single-coordinate records are gauge
  points, not runnable reaches.
- Discharge distinguishes loading, unavailable, and zero CFS. Recent lookups
  expire after five minutes so periodic refreshes can retrieve new readings.
- Enable GPS explicitly using the location control. Browser permission and
  HTTPS (or localhost) are required.
- Add named waypoints and **user-designated** put-ins/take-outs. These are
  not verified legal access locations.
- Measure by clicking points; undo or clear to adjust the line.
- Save sections to an ordered itinerary. Distances are approximate, based
  on existing geometry—not navigable routes or authoritative river mileage.

Waypoints and itineraries are saved to this browser's local storage, not
synced to an account or another device. Clearing site data deletes them.
Storage errors are surfaced in the interface. Switching map styles
preserves river selection and planning overlays.

Flow and difficulty do **not** imply a river is safe or runnable. Geometry
and endpoints may be approximate. Verify conditions, access, closures,
weather, and your abilities before travel.

## Later phase: offline navigation

Offline map downloads, a service worker, and background GPS are **not**
implemented. Saved plans alone do not make the app usable offline. These
features require provider download permission, storage/eviction design,
offline testing, and potentially a native app for dependable background GPS.
