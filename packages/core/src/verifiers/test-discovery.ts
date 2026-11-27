/**
 * AI-SDLC: Polyglot Test File Discovery & Pattern Matching
 * Supports JS/TS, Python, .NET (C#/F#), Java/Kotlin, Go, Rust, and Gherkin (.feature),
 * plus custom glob/suffix patterns from quality-policy.yaml.
 */

import type { UiModality } from '../types/index.js';
import { POLYGLOT_EXCLUDED_DIRS, POLYGLOT_LANGUAGE_REGISTRY } from './polyglot-registry.js';
export type { UiModality } from '../types/index.js';
export { POLYGLOT_EXCLUDED_DIRS };

export const DEFAULT_UNIT_TEST_PATTERNS: readonly string[] = Object.values(
  POLYGLOT_LANGUAGE_REGISTRY
).flatMap((spec) => spec.unitTestPatterns);

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
  '**/*_e2e_test.go',
  '**/*_ui_test.go',
  '**/*_e2e_test.rs',
  '**/*_ui_test.rs',
];

export function escapeRegexChars(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function globToRegex(pattern: string): RegExp {
  const norm = pattern.replace(/\\/g, '/').trim();
  if (!norm) return /^(?!)$/;
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

export const MODALITY_DRIVER_SIGNATURES: Readonly<Record<UiModality, RegExp>> = {
  web: /(?:@playwright\/test|\bplaywright\b|\bpage\.(?:goto|locator|getByRole|getByText|getByTestId|getByLabel|click|fill|waitForSelector)\b|\bexpect\(\s*(?:page|locator)\b|\bcypress\b|\bcy\.(?:visit|get|contains|intercept)\b|\brender\s*\(|\bscreen\.(?:getBy|findBy|queryBy)\w*|\bfireEvent\b|\buserEvent\b|\bTestBed\b|\bbUnit\b|\bRenderComponent\b|\bMicrosoft\.Playwright\b|\bPageTest\b|\bIPage\b|\b(?:Goto|Click|Fill|WaitForSelector)Async\b|\bGetBy(?:Role|Text|TestId|Label)\b|\b[Ee]xpect\(\s*(?:[Pp]age|[Ll]ocator)\b|\bcom\.microsoft\.playwright\b|\bPlaywright\.create\s*\(|\bassertThat\s*\(\s*page\b|\bplaywright\.(?:sync|async)_api\b|\b(?:sync|async)_playwright\b|\bpage\.(?:get_by_role|get_by_text|get_by_test_id|get_by_label|wait_for_selector)\b|playwright-go|\bpw\.Chromium\b|\bpage\.(?:Goto|Locator|GetByRole|GetByText|GetByTestId|GetByLabel)\b|playwright::Playwright|\bgoto_builder\b|\bwait_for_selector\b)/,
  desktop: /(?:\bFlaUI\b|\bUIA3Automation\b|\bUIA2Automation\b|\bApplication\.Launch\b|\bFindFirstDescendant\b|\bAsButton\b|\bAsTextBox\b|\bMainWindowHandle\b|\bWinAppDriver\b|\bWindowsDriver\b|\bAvalonia\.Headless\b|\bAutomationElement\b)/,
  console: /(?:\bspawn\b|\bspawnSync\b|\bexecFile\b|\bexecFileSync\b|\bexecSync\b|(?<!\.)\bexec\s*\(|\bexec\.Command\b|\bcobra\b|\bassert_cmd\b|Command::cargo_bin|\bchild_process\b|\bSpectre\.Console\.Testing\b|\bCommandAppTester\b|\bCliRunner\b|\bclick\.testing\b|\bnode-pty\b|\bpty\b|\bprocess\.stdout\b|\bprocess\.stderr\b|\bConsole\.SetOut\b|\bspyOn\(\s*console\s*,|\bconsole\.(?:log|error|warn)\s*=|\b(?:run|execute)[A-Z]\w*\s*\()/,
  mobile: /(?:\bWidgetTester\b|\btestWidgets\b|\bfind\.by\w+\b|\btester\.(?:tap|pump|pumpWidget|enterText)\b|\bXCUIApplication\b|\bEspresso\b|\bonView\s*\(|\bcomposeTestRule\b|\bAppium\b|\bMaestro\b|\bappId\s*:|\btapOn\s*:|\bassertVisible\s*:|\bDetox\b|\bdevice\.(?:launchApp|reloadReactNative)\b|\belement\(\s*by\.)/,
};

const DEFAULT_UI_COMPONENT_MATCHER = compilePatternList(DEFAULT_UI_COMPONENT_PATTERNS);
const DEFAULT_UI_TEST_MATCHER = compilePatternList(DEFAULT_UI_TEST_PATTERNS);
const QUOTE_CHARS = new Set(["'", '"', '`']);

export function isHashCommentStart(line: string, idx: number): boolean {
  if (line[idx] !== '#') return false;
  return idx === 0 || line[idx - 1] === ' ' || line[idx - 1] === '\t' || line[idx - 1] === '\n' || line[idx - 1] === '\r';
}

export function stripLineHashComment(line: string): string {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') { i++; }
      else if (ch === quote) { quote = ''; }
      continue;
    }
    if (QUOTE_CHARS.has(ch)) { quote = ch; continue; }
    if (isHashCommentStart(line, i)) return line.slice(0, i);
  }
  return line;
}

export function nextAfter(content: string, from: number, tok: string, includeTok: boolean): number {
  const idx = content.indexOf(tok, from);
  if (idx === -1) return content.length;
  return includeTok ? idx + tok.length : idx;
}

export function readQuotedLiteral(content: string, start: number): { text: string; next: number } {
  const quote = content[start];
  let j = start + 1;
  while (j < content.length) {
    if (content[j] === '\\') { j += 2; continue; }
    if (content[j] === quote) { j++; break; }
    j++;
  }
  return { text: content.slice(start, j), next: j };
}

export function readCommentToken(content: string, i: number): { text: string; next: number } | null {
  if (content.startsWith('/*', i)) return { text: ' ', next: nextAfter(content, i + 2, '*/', true) };
  if (content.startsWith('<!--', i)) return { text: ' ', next: nextAfter(content, i + 4, '-->', true) };
  if (content.startsWith('//', i) && content[i - 1] !== ':') return { text: ' ', next: nextAfter(content, i + 2, '\n', false) };
  if (isHashCommentStart(content, i)) return { text: '', next: nextAfter(content, i + 1, '\n', false) };
  return null;
}

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
  const out: string[] = [];
  let i = 0;
  while (i < content.length) {
    const seg = QUOTE_CHARS.has(content[i])
      ? readQuotedLiteral(content, i)
      : (readCommentToken(content, i) ?? { text: content[i], next: i + 1 });
    out.push(seg.text);
    i = seg.next;
  }
  return out.join('');
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
  const matcher = customPatterns && customPatterns.length > 0
    ? compilePatternList(customPatterns)
    : DEFAULT_UI_COMPONENT_MATCHER;
  return matcher.matches(norm);
}

export function isUiTestFile(
  filePath: string,
  customPatterns?: readonly string[]
): boolean {
  const matcher = customPatterns && customPatterns.length > 0
    ? compilePatternList([...DEFAULT_UI_TEST_PATTERNS, ...customPatterns])
    : DEFAULT_UI_TEST_MATCHER;
  return matcher.matches(filePath);
}
