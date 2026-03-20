import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    watch: { usePolling: true },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  plugins: [legacy()],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, './public/assets'),
    },
  },
});
