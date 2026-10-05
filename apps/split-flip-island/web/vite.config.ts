import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev talks to the deployed API and photos through the app's domain.
// Override with VITE_PROXY_TARGET if needed.
const target = process.env.VITE_PROXY_TARGET ?? 'https://split-flip-island.knckr.com';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target, changeOrigin: true },
      '/leagues': { target, changeOrigin: true }
    },
    fs: { allow: ['..'] }
  }
});
