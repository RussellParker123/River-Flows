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
