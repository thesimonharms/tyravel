import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'scripts/**/*.test.ts'],
    alias: {
      '@pondoknusa/collection': new URL('./packages/collection/src/index.ts', import.meta.url).pathname,
      '@pondoknusa/views': new URL('./packages/views/src/index.ts', import.meta.url).pathname,
    },
  },
});