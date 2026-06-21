import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts'],
    alias: {
      '@tyravel/collection': new URL('./packages/collection/src/index.ts', import.meta.url).pathname,
      '@tyravel/views': new URL('./packages/views/src/index.ts', import.meta.url).pathname,
    },
  },
});