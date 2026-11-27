// AI-SDLC: Immutable Strict Coding & Test Rules for TypeScript / JavaScript / Angular
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "examples/**",
      "templates/**",
      "scripts/*.cjs",
      "scripts/*.ts",
      "packages/cli/bin/**",
      "vitest.config.ts",
      "tests/**",
      "packages/*/tests/**",
    ],
  },
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"],
    rules: {
      "no-restricted-globals": [
        "error",
        { "name": "fit", "message": "Focused tests (fit) are forbidden by AI-SDLC." },
        { "name": "fdescribe", "message": "Focused suites (fdescribe) are forbidden by AI-SDLC." },
        { "name": "xit", "message": "Skipped tests (xit) are forbidden by AI-SDLC." },
        { "name": "xdescribe", "message": "Skipped suites (xdescribe) are forbidden by AI-SDLC." }
      ]
    }
  }
);
