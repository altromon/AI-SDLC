/**
 * AI-SDLC: Polyglot Test File Discovery & Pattern Matching
 * Supports JS/TS, Python, .NET (C#/F#), Java/Kotlin, Go, Rust, and Gherkin (.feature),
 * plus custom glob/suffix patterns from quality-policy.yaml.
 */

export const DEFAULT_UNIT_TEST_PATTERNS: readonly string[] = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.test.tsx',
  '**/*.spec.js',
  '**/*.test.js',
  '**/*.spec.jsx',
  '**/*.test.jsx',
  '**/test_*.py',
  '**/*_test.py',
  '**/*Test.cs',
  '**/*Tests.cs',
  '**/*Spec.cs',
  '**/*Test.fs',
  '**/*Tests.fs',
  '**/*Test.java',
  '**/*Tests.java',
  '**/*IT.java',
  '**/*Test.kt',
  '**/*Tests.kt',
  '**/*_test.go',
  '**/*_test.rs',
  'tests/**/*.rs',
];

export const DEFAULT_TEST_ARTIFACT_PATTERNS: readonly string[] = [
  '**/*.feature',
  ...DEFAULT_UNIT_TEST_PATTERNS,
];

function escapeRegexChars(raw: string): string {
  return raw.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern: string): RegExp {
  const norm = pattern.replace(/\\/g, '/').trim();
  if (!norm.includes('*') && !norm.includes('/') && !norm.includes('?')) {
    return new RegExp(`${escapeRegexChars(norm)}$`);
  }
  const regexStr = norm.replace(/\*\*\/|\*\*|\*|\?|[^*?]+/g, (token) => {
    if (token === '**/') return '(?:.*/)?';
    if (token === '**') return '.*';
    if (token === '*') return '[^/]*';
    if (token === '?') return '[^/]';
    return escapeRegexChars(token);
  });
  return new RegExp(`^${regexStr}$`);
}

export interface CompiledTestMatcher {
  matches: (relativeOrFilePath: string) => boolean;
}

export function compileTestPatterns(
  customPatterns?: readonly string[],
  includeFeatureFiles = false
): CompiledTestMatcher {
  const base = includeFeatureFiles ? DEFAULT_TEST_ARTIFACT_PATTERNS : DEFAULT_UNIT_TEST_PATTERNS;
  const combined = customPatterns && customPatterns.length > 0
    ? [...base, ...customPatterns]
    : [...base];
  const regexes = combined.map(globToRegex);
  return {
    matches: (filePath: string): boolean => {
      const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
      return regexes.some((re) => re.test(norm));
    },
  };
}

export function isPolyglotUnitTestFile(
  filePath: string,
  customPatterns?: readonly string[]
): boolean {
  return compileTestPatterns(customPatterns, false).matches(filePath);
}

export function isPolyglotTestArtifact(
  filePath: string,
  customPatterns?: readonly string[]
): boolean {
  return compileTestPatterns(customPatterns, true).matches(filePath);
}
