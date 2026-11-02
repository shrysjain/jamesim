import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';
export default mergeConfig(viteConfig, defineConfig({ test: { include: ['src/**/*.test.ts'], maxWorkers: 1, testTimeout: 30000 } }));
