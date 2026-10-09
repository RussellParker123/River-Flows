# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## River Master

River Master adds a section-aware Claude chat panel and scheduled background work.
The public chatbot has no administrative tools. A separate, authenticated coordinator
prioritizes work for the website maintainer, improvement agent, community agent,
river researcher, historical-flow analyst, and live-flow watcher.

### Publication policy

- Official flow observations may be collected automatically without an AI call.
  A gauge-to-reach association must be reviewed before measurements are described
  as verified for that reach. A nearby gauge alone is not sufficient evidence.
- Code fixes, deployments, river descriptions, and community replies are proposals
  requiring human review. The coordinator does not deploy code or post comments.
- AI answers are advisory, not safety assessments. Readings must include their
  source and observation time; missing or stale data must not become a zero reading
  or an invented flow. Static river descriptions are not automatically verified.
- Historical charts show recorded daily means, not instantaneous measurements.
  Missing observations are gaps, and statistics from the displayed period are not
  all-time records.

### Deployment prerequisites

This implementation targets Vercel server-side functions and Supabase Postgres.
It does not provision hosting, purchase an AI subscription, or enable paid calls
on its own. A Claude chat subscription does not include Anthropic API usage.
Apply the included database migration and configure server-only credentials and
an explicit budget before enabling AI. Never put Anthropic keys, service-role
keys, or cron authentication secrets in `REACT_APP_*` variables or source control.

Background collection runs on a schedule, even when no browser is open. Vercel
must support the configured cron frequency on your hosting plan; otherwise use
an authenticated external scheduler. Local `npm start` serves only the frontend,
so integrated chat testing requires the server-side functions as well.

### Operator review

Review each proposal's evidence and affected reach before making a change.
Research drafts are not published river guidance, and community drafts are not
posted comments. Approving a draft in storage does not execute it: a maintainer
must apply the reviewed change through the usual deployment or moderation process.

Before enabling scheduled work in production:

1. Apply the migration in a staging Supabase project first; check that anonymous
   users cannot read private proposals, usage, locks, or budget records.
2. Review gauge associations against authoritative station/reach information.
   Leave uncertain associations unapproved.
3. Set a monthly AI cap and current model pricing explicitly. Configure provider
   account limits as an additional safeguard; application reservations are
   conservative estimates, not a replacement for provider billing.
4. Test missing credentials, exhausted budgets, repeated requests, overlapping
   cron calls, upstream failures, and unavailable measurements before activation.
5. Monitor job results and usage. Disable the scheduler or remove the AI key to
   stop future paid calls; calls already in flight may still incur charges.

### Server configuration

Apply `supabase/migrations/202610090001_river_master.sql` using a database-owner
connection. Configure these variables in your server deployment, not the browser:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only database credential; never expose to visitors. |
| `ANTHROPIC_API_KEY` | Backend-only Anthropic API credential. |
| `ANTHROPIC_MODEL` | Claude API model identifier; defaults to `claude-sonnet-4-5`. Confirm availability in your account. |
| `RIVER_MASTER_MONTHLY_BUDGET_USD` | Explicit positive monthly application cap in USD. Missing or invalid values disable paid calls. |
| `RIVER_MASTER_MODEL_RATES` | JSON object keyed by the exact model identifier, with positive numeric `input` and `output` prices in USD per million tokens. Set these from current provider pricing. |
| `RIVER_MASTER_IP_HASH_SECRET` | Random secret of at least 32 characters for hashing rate-limit identifiers. |
| `CRON_SECRET` | Random secret of at least 24 characters; authenticates scheduled jobs and private status requests. |
| `RIVER_MASTER_OWN_ORIGIN` | Optional HTTPS origin of this website for its manifest health check; no path, credentials, query, or non-default port. |
| `RIVER_MASTER_COMMUNITY_COMMENTS_ENABLED` | Optional `true` opt-in to send bounded, privacy-filtered public comment excerpts to Claude; disabled by default. Review your privacy notice before enabling. |

Chat and coordinator calls share atomic database-backed reservations. Ambiguous
upstream failures retain their reservation rather than retrying a possibly billed
request. The monthly accounting window is UTC. Provider/API costs, hosting costs,
and database costs are separate. Setting a cap does not configure Anthropic billing.
Within a month, the stored cap can decrease automatically but cannot increase via
environment changes alone; raising it requires an explicit database-owner review
of that month's `rm_months` record. Keep configured model prices current and do not
lower prices below the provider's applicable rates.

Vercel schedules collection every 15 minutes and the coordinator daily at 06:00 UTC.
Collection stores instantaneous discharge and the last 30 days of official daily
means. Chat can reference persisted daily records but must not invent all-time
records or longer-term trends outside that coverage. The browser chart separately
requests a year of official daily means.
The coordinator rotates through rivers and saves specialist proposals and a
prioritized River Master report. It is not a continuous autonomous coding service:
its maintenance check observes the site manifest, and proposed fixes still need a
maintainer to implement, test, and deploy.

The authenticated `GET /api/river-master-status` endpoint reports usage and job
activity. Send the cron secret as a bearer token in the Authorization header
from an operator tool, never from the public chat panel. The same authentication is required for
`GET /api/river-master-jobs?job=collection` and
`GET /api/river-master-jobs?job=manager`.

Review gauge mappings in the private `rm_gauge_approvals` table: each approval
identifies the exact river name, state, segment name, and gauge ID, with reviewer,
evidence URL, and review timestamp. Approve only mappings supported by authoritative
evidence. Review proposals in `rm_proposals`; status changes record review but do
not execute public actions.

The selected section panel refreshes stored observations every five minutes via
`GET /api/river-observations` with exact `riverName`, `riverState`, and `segmentName`
query parameters. It displays a measurement as section-verified only when its
association was approved. Readings older than two hours are marked stale.
This read-only public endpoint exposes measurement provenance, not private
proposals, spending records, or administrative capabilities.

Research is limited to the configured official USGS sources and existing site
context; it does not browse arbitrary websites or automatically verify descriptions,
access points, closures, or hazards. The community agent does not post replies.
With comment access disabled it proposes engagement ideas without claiming to have
reviewed feedback. Enabling excerpts excludes identity fields, removes common contact
information and links, and withholds suspected credentials; filtering cannot
guarantee that user-written content contains no personal information.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
