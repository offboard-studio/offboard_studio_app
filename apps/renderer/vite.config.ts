/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path'

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

  // Fallback olarak manual alias
  resolve: {
    alias: {
      '@pages': path.resolve(__dirname, '../../libs/pages/src'),
      '@components': path.resolve(__dirname, '../../libs/components/src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});