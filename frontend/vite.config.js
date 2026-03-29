import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Since user requested public/index.html, adapt Vite slightly or use base logic
  // Typically Vite wants index.html at root. For simplicity, we can let default work and just serve it.
  // Alternatively, just proxy / to /public. Best is standard root mapping:
  root: '.',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
  },
  base: './',
});
