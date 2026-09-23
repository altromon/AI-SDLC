import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.spec.ts', 'examples/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 85,
        statements: 70,
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
