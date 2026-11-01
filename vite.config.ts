import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { runtimeAssetsPlugin } from './scripts/runtime-assets-plugin.ts';

export default defineConfig({
  plugins: [react(), runtimeAssetsPlugin()],
  server: {
    port: 5173, strictPort: true,
    // Polling also picks up files written by external CAD preparation tools.
    watch: { usePolling: true, interval: 500, ignored: ['**/assets/source/**', '**/assets/intermediate/**', '**/.pnpm-store/**'] },
  },
  build: { target: 'es2022', copyPublicDir: false, license: { fileName: 'licenses/dependencies.md' }, chunkSizeWarningLimit: 1300,
    rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'physics', test: /node_modules[\\/]@dimforge[\\/]rapier3d-compat/, includeDependenciesRecursively: false },
      { name: 'three', test: /node_modules[\\/]three[\\/]/, includeDependenciesRecursively: false },
    ] } } },
  },
});
