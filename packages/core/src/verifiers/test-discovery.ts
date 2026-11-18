/**
 * AI-SDLC: Polyglot Test File Discovery & Pattern Matching
 * Supports JS/TS, Python, .NET (C#/F#), Java/Kotlin, Go, Rust, and Gherkin (.feature),
 * plus custom glob/suffix patterns from quality-policy.yaml.
 */

import type { UiModality } from '../types/index.js';
export type { UiModality } from '../types/index.js';

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

export const WEB_UI_COMPONENT_PATTERNS: readonly string[] = [
  '**/*.tsx',
  '**/*.jsx',
  '**/*.vue',
  '**/*.svelte',
  '**/*.component.ts',
  '**/*.razor',
  '**/*.cshtml',
  '**/components/**',
  '**/views/**',
  '**/pages/**',
  '**/widgets/**',
];

export const DESKTOP_UI_COMPONENT_PATTERNS: readonly string[] = [
  '**/*Window.cs',
  '**/*View.cs',
  '**/*Form.cs',
  '**/*Dialog.cs',
  '**/*Page.cs',
  '**/*UserControl.cs',
  '**/*.xaml',
  '**/*.axaml',
  '**/*.xaml.cs',
  '**/*.axaml.cs',
  '**/windows/**',
  '**/dialogs/**',
];

export const CONSOLE_UI_COMPONENT_PATTERNS: readonly string[] = [
  '**/tui/**',
  '**/cli/**',
  '**/commands/**',
  '**/console/**',
  '**/*Command.ts',
  '**/*Command.js',
  '**/*Command.cs',
  '**/*Command.py',
  '**/*Cli.ts',
  '**/*Cli.cs',
];

export const MOBILE_UI_COMPONENT_PATTERNS: readonly string[] = [
  '**/*Screen.kt',
  '**/*Activity.kt',
  '**/*Fragment.kt',
  '**/*ViewController.swift',
  '**/*View.swift',
  '**/*Screen.dart',
  '**/*Page.dart',
  '**/*Widget.dart',
  '**/screens/**',
];

export const DEFAULT_UI_COMPONENT_PATTERNS: readonly string[] = [
  ...WEB_UI_COMPONENT_PATTERNS,
  ...DESKTOP_UI_COMPONENT_PATTERNS,
  ...CONSOLE_UI_COMPONENT_PATTERNS,
  ...MOBILE_UI_COMPONENT_PATTERNS,
];

export const DEFAULT_UI_TEST_PATTERNS: readonly string[] = [
  'tests/e2e/**',
  'tests/ui/**',
  'tests/desktop/**',
  'tests/mobile/**',
  'tests/cli/**',
  'tests/console/**',
  '**/tests/e2e/**',
  '**/tests/ui/**',
  '**/tests/desktop/**',
  '**/tests/mobile/**',
  '**/tests/cli/**',
  '**/tests/console/**',
  '**/cli/tests/**',
  '**/*.e2e.*',
  '**/*.e2e.ts',
  '**/*.e2e.js',
  '**/*.ui.spec.*',
  '**/*.ui.test.*',
  '**/*.cli.spec.*',
  '**/*.cli.test.*',
  '**/*-cli.spec.*',
  '**/*-cli.test.*',
  '**/*Playwright*.*',
  '**/*FlaUI*.cs',
  '**/*UiTest*.cs',
  '**/*UITest*.cs',
  '**/*UiTests.cs',
  '**/*UITests.cs',
  '**/*CliTest*.*',
  '**/*ConsoleTest*.*',
  '**/*MobileTest*.*',
  '**/*WidgetTest*.dart',
  '**/*E2ETest.java',
  '**/*UITest.swift',
  '**/*_ui_test.py',
  '**/test_ui_*.py',
  '**/test_cli_*.py',
  '**/*_cli_test.py',
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

export function compilePatternList(patterns: readonly string[]): CompiledTestMatcher {
  const regexes = patterns.map(globToRegex);
  return {
    matches: (filePath: string): boolean => {
      const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
      return regexes.some((re) => re.test(norm));
    },
  };
}

const NON_COMPONENT_UI_FILES = /(?:^|\/)(?:index|types|constants|styles|main|app|setup|cli)\.[jt]sx?$/i;

const MODALITY_PRECEDENCE_RULES: ReadonlyArray<{ modality: UiModality; matcher: CompiledTestMatcher }> = [
  // Tier 1A: Unambiguous Web extensions/suffixes
  {
    modality: 'web',
    matcher: compilePatternList([
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.component.ts',
      '**/*.razor',
      '**/*.cshtml',
    ]),
  },
  // Tier 1B: Unambiguous Desktop extensions/suffixes
  {
    modality: 'desktop',
    matcher: compilePatternList([
      '**/*.xaml',
      '**/*.axaml',
      '**/*.xaml.cs',
      '**/*.axaml.cs',
      '**/*Window.cs',
      '**/*View.cs',
      '**/*Form.cs',
      '**/*Dialog.cs',
      '**/*Page.cs',
      '**/*UserControl.cs',
    ]),
  },
  // Tier 1C: Unambiguous Mobile extensions
  {
    modality: 'mobile',
    matcher: compilePatternList(['**/*.kt', '**/*.swift', '**/*.dart']),
  },
  // Tier 1D: Unambiguous Console suffixes
  {
    modality: 'console',
    matcher: compilePatternList([
      '**/*Command.ts',
      '**/*Command.js',
      '**/*Command.cs',
      '**/*Command.py',
      '**/*Cli.ts',
      '**/*Cli.cs',
    ]),
  },
  // Tier 2: Directory globs for generic extensions
  {
    modality: 'console',
    matcher: compilePatternList(['**/tui/**', '**/cli/**', '**/commands/**', '**/console/**']),
  },
  {
    modality: 'desktop',
    matcher: compilePatternList(['**/windows/**', '**/dialogs/**']),
  },
  {
    modality: 'mobile',
    matcher: compilePatternList(['**/screens/**']),
  },
  {
    modality: 'web',
    matcher: compilePatternList(['**/components/**', '**/views/**', '**/pages/**', '**/widgets/**']),
  },
];

const MODALITY_DRIVER_SIGNATURES: Readonly<Record<UiModality, RegExp>> = {
  web: /(?:@playwright\/test|\bplaywright\b|\bpage\.(?:goto|locator|getByRole|getByText|getByTestId|getByLabel|click|fill|waitForSelector)\b|\bexpect\(\s*(?:page|locator)\b|\bcypress\b|\bcy\.(?:visit|get|contains|intercept)\b|\brender\s*\(|\bscreen\.(?:getBy|findBy|queryBy)\w*|\bfireEvent\b|\buserEvent\b|\bTestBed\b|\bbUnit\b|\bRenderComponent\b)/,
  desktop: /(?:\bFlaUI\b|\bUIA3Automation\b|\bUIA2Automation\b|\bApplication\.Launch\b|\bFindFirstDescendant\b|\bAsButton\b|\bAsTextBox\b|\bMainWindowHandle\b|\bWinAppDriver\b|\bWindowsDriver\b|\bAvalonia\.Headless\b|\bAutomationElement\b)/,
  console: /(?:\bspawn\b|\bspawnSync\b|\bexecFile\b|\bexecFileSync\b|\bexecSync\b|\bexec\s*\(|\bchild_process\b|\bSpectre\.Console\.Testing\b|\bCommandAppTester\b|\bCliRunner\b|\bclick\.testing\b|\bnode-pty\b|\bpty\b|\bprocess\.stdout\b|\bprocess\.stderr\b|\bConsole\.SetOut\b|\bspyOn\(\s*console\s*,|\bconsole\.(?:log|error|warn)\s*=|\b(?:run|execute)[A-Z]\w*\s*\()/,
  mobile: /(?:\bWidgetTester\b|\btestWidgets\b|\bfind\.by\w+\b|\btester\.(?:tap|pump|pumpWidget|enterText)\b|\bXCUIApplication\b|\bEspresso\b|\bonView\s*\(|\bcomposeTestRule\b|\bAppium\b|\bMaestro\b|\bappId\s*:|\btapOn\s*:|\bassertVisible\s*:|\bDetox\b|\bdevice\.(?:launchApp|reloadReactNative)\b|\belement\(\s*by\.)/,
};

export function detectUiComponentModality(filePath: string): UiModality | null {
  const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const rule of MODALITY_PRECEDENCE_RULES) {
    if (rule.matcher.matches(norm)) return rule.modality;
  }
  return null;
}

export function inferFallbackUiModality(filePath: string): UiModality {
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  if (/\.(?:a?xaml(?:\.cs)?|cs)$/.test(lower)) return 'desktop';
  if (/\.(?:py|go|rs)$/.test(lower)) return 'console';
  if (/\.(?:kt|swift|dart)$/.test(lower)) return 'mobile';
  return 'web';
}

export function stripTestComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(?<!:)\/\/[^\r\n]*/g, ' ')
    .replace(/^\s*#[^\r\n]*/gm, ' ');
}

export function hasModalityDriverSignature(content: string, modality: UiModality): boolean {
  const cleaned = stripTestComments(content);
  return MODALITY_DRIVER_SIGNATURES[modality].test(cleaned);
}

export function isUiComponentFile(
  filePath: string,
  customPatterns?: readonly string[]
): boolean {
  const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (isPolyglotUnitTestFile(norm) || norm.endsWith('.d.ts') || NON_COMPONENT_UI_FILES.test(norm)) {
    return false;
  }
  const patterns = customPatterns && customPatterns.length > 0
    ? customPatterns
    : DEFAULT_UI_COMPONENT_PATTERNS;
  return compilePatternList(patterns).matches(norm);
}

export function isUiTestFile(
  filePath: string,
  customPatterns?: readonly string[]
): boolean {
  const patterns = customPatterns && customPatterns.length > 0
    ? [...DEFAULT_UI_TEST_PATTERNS, ...customPatterns]
    : DEFAULT_UI_TEST_PATTERNS;
  return compilePatternList(patterns).matches(filePath);
}
