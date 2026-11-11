import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React admin screens build into ./dist, which the Worker serves.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
});
