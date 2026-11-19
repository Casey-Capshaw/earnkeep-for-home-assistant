// EarnKeep - Vite build config
// Builds a single ES module JS file for the HA custom panel with CSS inlined.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../custom_components/earn_keep/frontend'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/ha-panel-entry.ts'),
      output: {
        entryFileNames: 'earn-keep-panel.js',
        assetFileNames: 'assets/[name][extname]',
        format: 'es',
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
