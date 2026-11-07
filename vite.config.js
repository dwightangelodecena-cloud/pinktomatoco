import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Runs the Vercel functions in /api during local development.
function localApi(env) {
  return {
    name: 'local-api',
    configureServer(server) {
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith('BIGCOMMERCE_')) process.env[key] = value;
      }
      server.middlewares.use('/api', async (req, res, next) => {
        const name = req.url.split('?')[0].replace(/^\//, '');
        if (!/^[a-z-]+$/.test(name)) return next();
        try {
          const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
          await handler(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApi(loadEnv(mode, process.cwd(), ''))],
}));
