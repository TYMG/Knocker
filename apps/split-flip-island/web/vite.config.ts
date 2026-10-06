import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev talks to the deployed API and photos through the app's domain.
// Override with VITE_PROXY_TARGET if needed.
const target = process.env.VITE_PROXY_TARGET ?? 'https://split-flip-island.knckr.com';

// The deployed site is behind the demo password. To develop against it, enter the password
// in a browser, copy the sfi_gate cookie's value, and start dev with GATE_COOKIE=<value>.
const headers = process.env.GATE_COOKIE ? { cookie: `sfi_gate=${process.env.GATE_COOKIE}` } : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target, changeOrigin: true, headers },
      '/leagues': { target, changeOrigin: true, headers }
    },
    fs: { allow: ['..'] }
  }
});
