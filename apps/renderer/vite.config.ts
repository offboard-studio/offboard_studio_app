/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/renderer',

  server: {
    port: Number(process.env.PORT) || 3001,
    host: 'localhost',
  },

  preview: {
    port: Number(process.env.PORT) || 3001,
    host: 'localhost',
  },

  plugins: [react(), nxViteTsPaths()],
});
