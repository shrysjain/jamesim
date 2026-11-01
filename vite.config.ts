import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, strictPort: true,
    // Polling also picks up files written by external CAD preparation tools.
    watch: { usePolling: true, interval: 500, ignored: ['**/assets/source/**', '**/assets/intermediate/**', '**/.pnpm-store/**'] },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 1300 },
});
