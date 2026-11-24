import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'packages/*/tests/**/*.spec.ts',
      'tests/unit/**/*.spec.ts',
      'examples/sentinel-core/tests/**/*.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 89,
        branches: 82,
        functions: 96,
        statements: 89,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        '**/templates/**',
        '**/examples/**',
        '**/scripts/**',
        '**/*.config.ts',
        'packages/*/bin/**',
      ],
    },
  },
});
