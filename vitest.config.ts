import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.spec.ts', 'examples/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 80,
        statements: 85,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        '**/templates/**',
        '**/examples/**',
      ],
    },
  },
});
