import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [
      react(),
      {
        name: 'river-master-local-api',
        configureServer(server) {
          let handlerPromise;
          server.middlewares.use((req, res, next) => {
            if (req.url?.split('?')[0] !== '/api/river-master') return next();
            handlerPromise ||= server.ssrLoadModule('/api/river-master.js')
              .then(module => module.createRiverMasterHandler({ env }))
              .catch(error => { handlerPromise = undefined; throw error; });
            handlerPromise.then(handler => handler(req, res)).catch(() => {
              if (res.headersSent) {
                res.end();
                return;
              }
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'River Master is unavailable. Check the server configuration.' }));
            });
          });
        },
      },
    ],
    build: { outDir: 'build' },
    server: { port: 3000 },
  };
});
