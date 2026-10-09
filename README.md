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
serverless functions during local development, except for the River Master
endpoint served by the dedicated development middleware below.

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
  expire after five minutes; scheduled polls explicitly bypass the cache
  so slow responses do not delay the next fresh reading.
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

Export a versioned JSON plan to back it up or transfer it to another browser;
importing a valid plan replaces the current waypoints and itinerary. Invalid
files are rejected without replacing your plan. GPX export contains separate
tracks for mapped itinerary reaches and your personal waypoints, not directions
or verified access. Point-only records cannot establish a river track.
The trip overview highlights saved reaches and can fit them in the map.
Coordinate entry allows adding personal waypoints even without WebGL.
Treat exported waypoint locations as private information before sharing.

Flow and difficulty do **not** imply a river is safe or runnable. Geometry
and endpoints may be approximate. Verify conditions, access, closures,
weather, and your abilities before travel.

## Live River Master AI chat

Select a reach in the explorer to chat with River Master. This is a streaming
AI assistant, not a human guide or an emergency service. Email sign-in is
required; responses come from a real model through `/api/river-master`, not
scripted answers. Missing configuration and provider failures are shown as
errors rather than fabricated responses.

The server resolves the selected river/state/segment against the bundled
catalog and attempts a fresh USGS discharge lookup for an exact catalog gauge.
Gauge data includes provenance and observation time when available; nearby
coordinate-based lookups are not used as verified reach data. A discharge,
mapped difficulty, or AI answer never establishes runnable conditions, legal
access, closures, or safety.

### Server configuration

Use Node.js 22.12+ and set these **server-only** variables in `.env.local`
for development or in your serverless host's runtime environment:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Private OpenAI API credential |
| `OPENAI_MODEL` | Optional chat-completions model; defaults to `gpt-4o-mini` |
| `SUPABASE_URL` | Same Supabase project URL used by `src/supabaseClient.js` |
| `SUPABASE_PUBLISHABLE_KEY` | That project's publishable key (`SUPABASE_ANON_KEY` is also supported) |

Never prefix private credentials with `VITE_` or commit them. No service-role
key is needed: the API validates the caller's bearer session with Supabase
Auth before contacting the model. The existing browser Supabase project
configuration must match the server configuration.

Enable email authentication and configure Supabase's email template to include
`{{ .Token }}` so users can enter the emailed one-time code in the chat panel.
Configure SMTP delivery and Auth rate limits for your deployment. Test code
delivery and verification in the same project before enabling live chat.

`npm start` serves the chat API locally through Vite's server-only middleware.
`npm run preview` is static and does not serve the API. In production, deploy
`api/river-master.js` on a Node serverless-capable host (such as Vercel) alongside
the `build/` assets; exclude `/api/*` from SPA fallback rewrites and allow
streaming responses and outbound HTTPS to Supabase, OpenAI, and USGS.
A static-only deployment cannot provide AI chat.

The API bounds input, output, timeouts, and per-user request bursts. Its
in-memory limiter is **per process**, not a durable cross-instance quota.
Before public deployment, add platform/gateway rate limits, configure provider
spend limits, and protect Supabase sign-up from abuse; authentication alone is
not cost protection. No production credentials or hosted services are
provisioned by this repository.

Chat history stays in the current UI session and resets when changing reach,
account, or clearing the conversation. Supabase can persist the sign-in
session. Messages and river context are sent to the configured model provider;
its retention and privacy policies apply. Do not submit sensitive information.
Stop cancels the client request but cannot reverse provider work already done.

## Later phase: offline navigation

Offline map downloads, a service worker, and background GPS are **not**
implemented. Saved plans alone do not make the app usable offline. These
features require provider download permission, storage/eviction design,
offline testing, and potentially a native app for dependable background GPS.
