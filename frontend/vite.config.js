import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/upload': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/status': 'http://127.0.0.1:8000',
      '/reset': 'http://127.0.0.1:8000',
    }
  },
  build: {
    outDir: 'dist',
  },
  base: './',
});
