import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Polling helps file watching work reliably across the Docker/Windows boundary.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
