import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API base URL is configurable at runtime via VITE_API_URL.
// In development the Vite dev server proxies /api to the Express backend
// (default http://localhost:8000), so the frontend can simply call /api/...
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
