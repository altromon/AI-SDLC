import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.spec.ts', 'examples/sentinel-core/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 65,
        branches: 65,
        functions: 80,
        statements: 65,
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
