import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The theme's cut-out candle photos (theme/assets/img/cutouts) are copied into the admin build at
// /cutouts/<id>.webp, so the Content preview shows the hero exactly like the store.
const CUTOUTS = fileURLToPath(new URL('../theme/assets/img/cutouts/', import.meta.url));
const themeCutouts = () => ({
  name: 'theme-cutouts',
  generateBundle() {
    for (const file of readdirSync(CUTOUTS).filter((f) => f.endsWith('.webp'))) {
      this.emitFile({ type: 'asset', fileName: `cutouts/${file}`, source: readFileSync(CUTOUTS + file) });
    }
  },
});

// The React admin screens build into ./dist, which the Worker serves.
export default defineConfig({
  plugins: [react(), themeCutouts()],
  build: { outDir: 'dist', emptyOutDir: true },
});
