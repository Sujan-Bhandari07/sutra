import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  resolve: {
    alias: {
      '@sutra/shared': join(import.meta.dirname, '../.././libs/shared/src/index.ts'),
      '@sutra/db': join(import.meta.dirname, '../.././libs/db/src/index.ts'),
      '@sutra/redis': join(import.meta.dirname, '../.././libs/redis/src/index.ts'),
    },
  },
  plugins: [react()],
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,app,pages,specs}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web',
      provider: 'v8' as const,
    }
  },
}));
