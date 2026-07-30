import { defineConfig } from 'vitest/config';

// Root test project for all games' pure logic. Games keep their own Vite builds;
// these tests import the source TS modules directly and run under jsdom so that
// browser APIs (localStorage, document) used by game/storage code are available.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
