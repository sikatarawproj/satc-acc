import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    root: path.resolve(__dirname, '..'),
    setupFiles: ['./tests/helpers/setup.js'],
    include: ['./tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['frontend/src/js/modules/ux.js', 'frontend/src/js/core/utils.js'],
      reporter: ['text', 'lcov'],
    },
  },
});
