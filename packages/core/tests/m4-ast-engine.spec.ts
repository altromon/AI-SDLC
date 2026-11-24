/**
 * AI-SDLC: Native AST Orchestrator, Polyglot Scanner & TypeScript AST Unit Tests
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyntaxKind } from 'ts-morph';
import {
  analyzePolyglot,
  analyzeTypeScript,
  assertRequiredStack,
  isCliInstalled,
  orchestrateNativeAstAnalysis,
} from '../src/verifiers/ast/native-ast-orchestrator.js';
import {
  applyQuoteOrBrace,
  buildMetricsFromBlocks,
  calculatePolyglotMetrics,
  computeBraceCognitive,
  computeHalsteadMI,
  computePolyglotCognitive,
  computePolyglotCyclomatic,
  computePythonCognitive,
  consumeNormalQuote,
  consumeRawOrBlock,
  countCommentsAndLoc,
  detectCsJavaOrCppRawString,
  detectPolyglotSmells,
  detectRawStringOpen,
  detectRustOrGoRawString,
  extractBraceFunctions,
  extractPythonFunctionsPolyglot,
  flushPythonBlock,
  getCyclomaticPattern,
  handlePythonBodyLine,
  isCommentLine,
  isDocstringToggle,
  matchCStyleHeader,
  matchFunctionHeader,
  parsePythonDefLine,
  processBraceLine,
  processPythonLine,
  scanBracesInLine,
  shouldAppendPythonBody,
  stepActiveCodeToken,
  stripStringsAndComments,
  tryStartBraceFunction,
  updateBraceScanState,
  type BraceScanState,
  type RawFunctionBlock,
} from '../src/verifiers/ast/polyglot-scanner.js';
import {
  buildNodeMetrics,
  calculateLocAndHalstead,
  computeCognitiveFromAst,
  computeCyclomaticFromAst,
  createFallbackModuleMetrics,
  createTempSourceFile,
  detectAstCodeSmells,
  getSharedProject,
  isAnalyzableArrowOrExpr,
  isAnalyzableFunction,
  isBranchNode,
  isDeclarationFunction,
  isNestedFunctionBoundary,
  isProductionFile,
  resolveDeclarationName,
  resolveExpressionParentName,
  resolveFunctionName,
} from '../src/verifiers/ast/typescript-ast.js';

function withTempTsNode<T>(code: string, filePath: string, fn: (sf: ReturnType<typeof createTempSourceFile>) => T): T {
  const sf = createTempSourceFile(getSharedProject(), code, filePath);
  try {
    return fn(sf);
  } finally {
    sf.forget();
  }
}

describe('Native AST Orchestrator', () => {
  it('isCliInstalled detects node and rejects missing or blank commands', () => {
    expect(isCliInstalled('node')).toBe(true);
    expect(isCliInstalled('__nonexistent_aisdlc_cli_xyz__')).toBe(false);
    expect(isCliInstalled('')).toBe(false);
    expect(isCliInstalled('   ')).toBe(false);
  });

  it('assertRequiredStack passes when unset or installed and throws fail-closed when missing', () => {
    expect(() => assertRequiredStack(undefined)).not.toThrow();
    expect(() => assertRequiredStack('')).not.toThrow();
    expect(() => assertRequiredStack('node')).not.toThrow();
    expect(() => assertRequiredStack('__nonexistent_aisdlc_cli_xyz__')).toThrow(
      /\[AI-SDLC Fail-Closed\] Required toolchain CLI/
    );
  });

  it('analyzeTypeScript analyzes valid, empty, and malformed TS/TSX inputs', () => {
    const ok = analyzeTypeScript('export function add(a: number, b: number) { return a + b; }', 'src/a.tsx');
    expect(ok.language).toBe('typescript');
    expect(ok.functions.map((f) => f.functionName)).toContain('add');

    const empty = analyzeTypeScript('', 'src/empty.ts');
    expect(empty).toEqual({
      language: 'typescript',
      filePath: 'src/empty.ts',
      functions: [],
      unsafeTypesCount: 0,
      emptyStubsCount: 0,
    });

    const malformed = analyzeTypeScript('function broken( {', 'src/bad.ts');
    expect(malformed.language).toBe('typescript');
  });

  it('analyzePolyglot extracts functions for Go/Rust and handles unknown/empty extensions', () => {
    const go = analyzePolyglot('func Run() {\n  return\n}', 'cmd/main.go', '.go');
    expect(go.language).toBe('go');
    expect(go.functions.map((f) => f.functionName)).toContain('Run');

    const txt = analyzePolyglot('plain text', 'notes.txt', '.txt');
    expect(txt.language).toBe('txt');
    expect(txt.functions).toEqual([]);

    const noExt = analyzePolyglot('plain text', 'Makefile', '');
    expect(noExt.language).toBe('');
  });

  it('orchestrateNativeAstAnalysis uses path.extname for dot-in-directory extensionless files (Bug 3)', () => {
    const report = orchestrateNativeAstAnalysis('fn run() {}', 'v1.0/Makefile');
    expect(report.language).toBe('');
    expect(report.filePath).toBe('v1.0/Makefile');
  });
});

describe('Native AST Orchestrator (spawnSync dependency edge cases)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('handles non-zero status, error object, thrown error, and status 0 from spawnSync', async () => {
    const spawnSync = vi
      .fn()
      .mockReturnValueOnce({ status: 1, error: undefined })
      .mockReturnValueOnce({ status: 0, error: new Error('ENOENT') })
      .mockImplementationOnce(() => {
        throw new Error('boom');
      })
      .mockReturnValueOnce({ status: 0, error: undefined });

    vi.resetModules();
    vi.doMock('child_process', () => ({ spawnSync }));
    const mod = await import('../src/verifiers/ast/native-ast-orchestrator.js');

    expect(mod.isCliInstalled('fake-fail')).toBe(false);
    expect(mod.isCliInstalled('fake-err')).toBe(false);
    expect(mod.isCliInstalled('fake-throw')).toBe(false);
    expect(() => mod.assertRequiredStack('dotnet')).not.toThrow();
  });
});

describe('Polyglot Scanner — Python Helpers', () => {
  it('isDocstringToggle detects odd vs balanced triple-quote occurrences', () => {
    expect(isDocstringToggle('"""start')).toBe(true);
    expect(isDocstringToggle("'''start")).toBe(true);
    expect(isDocstringToggle('"""single line"""')).toBe(false);
    expect(isDocstringToggle('x = 1')).toBe(false);
  });

  it('shouldAppendPythonBody checks docstring state, blank lines, and indentation', () => {
    expect(shouldAppendPythonBody('dedented', 4, true)).toBe(true);
    expect(shouldAppendPythonBody('   ', 4, false)).toBe(true);
    expect(shouldAppendPythonBody('      return 1', 4, false)).toBe(true);
    expect(shouldAppendPythonBody('    return 1', 4, false)).toBe(false);
  });

  it('parsePythonDefLine parses def and async def unless inside docstring', () => {
    expect(parsePythonDefLine('def alpha(x):', false)).toEqual({ name: 'alpha', indent: 0 });
    expect(parsePythonDefLine('  async def beta_2(x):', false)).toEqual({ name: 'beta_2', indent: 2 });
    expect(parsePythonDefLine('def ignored():', true)).toBeNull();
    expect(parsePythonDefLine('# def commented():', false)).toBeNull();
  });

  it('flushPythonBlock pushes buffered block with startLine and resets state', () => {
    const blocks: RawFunctionBlock[] = [];
    const state = { currentFn: 'fn_a' as string | null, fnLines: ['def fn_a():', '  pass'], startLine: 2 };
    flushPythonBlock(state, blocks, 5);
    expect(blocks).toEqual([{ name: 'fn_a', body: 'def fn_a():\n  pass', startLine: 2 }]);
    expect(state).toEqual({ currentFn: null, fnLines: [], startLine: undefined });

    flushPythonBlock({ currentFn: null, fnLines: [] }, blocks, 6);
    expect(blocks).toHaveLength(1);
  });

  it('handlePythonBodyLine appends indented lines and flushes on dedent', () => {
    const blocks: RawFunctionBlock[] = [];
    const state = { currentFn: 'f' as string | null, fnLines: ['def f():'], baseIndent: 0, inDocstring: false, startLine: 0 };
    handlePythonBodyLine('  x = 1', state, blocks, 1);
    expect(state.fnLines).toHaveLength(2);
    handlePythonBodyLine('other = 2', state, blocks, 2);
    expect(blocks).toHaveLength(1);
    expect(state.currentFn).toBeNull();
  });

  it('processPythonLine toggles docstrings, starts defs, and routes body lines', () => {
    const blocks: RawFunctionBlock[] = [];
    const state = { currentFn: null as string | null, fnLines: [] as string[], baseIndent: 0, inDocstring: false, startLine: undefined as number | undefined };
    processPythonLine('"""', state, blocks, 0);
    expect(state.inDocstring).toBe(true);
    processPythonLine('def inside_doc():', state, blocks, 1);
    expect(state.currentFn).toBeNull();
    processPythonLine('"""', state, blocks, 2);
    processPythonLine('def real():', state, blocks, 3);
    processPythonLine('  return 1', state, blocks, 4);
    expect(state.currentFn).toBe('real');
    expect(state.startLine).toBe(3);
  });

  it('extractPythonFunctionsPolyglot extracts accurate 1-based declaration lines (Bug 2)', () => {
    const py = [
      'def first(a):',
      '    if a:',
      '        return 1',
      '    return 0',
      '',
      'async def second():',
      '    return 2',
    ].join('\n');
    const fns = extractPythonFunctionsPolyglot(py, 'app.py');
    expect(fns.map((f) => [f.functionName, f.line])).toEqual([
      ['first', 1],
      ['second', 6],
    ]);
    expect(extractPythonFunctionsPolyglot('', 'empty.py')).toEqual([]);
  });
});

describe('Polyglot Scanner — Brace Header & Lexer Helpers', () => {
  it('matchCStyleHeader matches JS/Java/C#/C++ headers and rejects control keywords', () => {
    expect(matchCStyleHeader('public async Task<int> RunAsync(int x) {')).toBe('RunAsync');
    expect(matchCStyleHeader('function helper(a) {')).toBe('helper');
    expect(matchCStyleHeader('if (ready) {')).toBeNull();
    expect(matchCStyleHeader('class Service {')).toBeNull();
    expect(matchCStyleHeader('int x = 1;')).toBeNull();
  });

  it('matchFunctionHeader handles Go, Rust, C-style, and comment exclusions', () => {
    expect(matchFunctionHeader('func (s *Srv) Handle[T any](x T) {', '.go')).toBe('Handle');
    expect(matchFunctionHeader('pub(crate) async unsafe fn parse<T>(v: T) -> i32 {', '.rs')).toBe('parse');
    expect(matchFunctionHeader('void tick() {', '.cpp')).toBe('tick');
    expect(matchFunctionHeader('// func ignored() {', '.go')).toBeNull();
  });

  it('detectRustOrGoRawString, detectCsJavaOrCppRawString, and detectRawStringOpen detect raw strings', () => {
    expect(detectRustOrGoRawString('r#"a"#', '.rs')).toEqual({ term: '"#', advance: 2 });
    expect(detectRustOrGoRawString('`go`', '.go')).toEqual({ term: '`', advance: 0 });
    expect(detectRustOrGoRawString('plain', '.rs')).toBeNull();

    expect(detectCsJavaOrCppRawString('$$"""hi"""', '.cs')).toEqual({ term: '"""', advance: 4 });
    expect(detectCsJavaOrCppRawString('@"hi"', '.cs')).toEqual({ term: '"', advance: 1 });
    expect(detectCsJavaOrCppRawString('R"tag(hi)tag"', '.cpp')).toEqual({ term: ')tag"', advance: 5 });
    expect(detectCsJavaOrCppRawString('normal', '.cpp')).toBeNull();

    expect(detectRawStringOpen('let s = r#"x"#;', 8, '.rs')).toEqual({ term: '"#', advance: 2 });
    expect(detectRawStringOpen('let s = 1;', 0, '.rs')).toBeNull();
  });

  it('consumeRawOrBlock advances past block comment closures and raw string terminators', () => {
    const block = { inBlock: true, rawTerm: null as string | null };
    expect(consumeRawOrBlock('*/', 0, block)).toEqual({ advance: 1, handled: true });
    expect(block.inBlock).toBe(false);

    const raw = { inBlock: false, rawTerm: '"#' as string | null };
    expect(consumeRawOrBlock('x"#', 0, raw)).toEqual({ advance: 0, handled: true });
    expect(consumeRawOrBlock('x"#', 1, raw)).toEqual({ advance: 1, handled: true });
    expect(raw.rawTerm).toBeNull();
    expect(consumeRawOrBlock('abc', 0, raw)).toEqual({ advance: 0, handled: false });
  });

  it('consumeNormalQuote handles escapes, closing quotes, and inactive states', () => {
    const q = { inString: '"' as string | null };
    expect(consumeNormalQuote('a\\"b"', 1, q)).toEqual({ advance: 1, handled: true });
    expect(consumeNormalQuote('a\\"b"', 4, q)).toEqual({ advance: 0, handled: true });
    expect(q.inString).toBeNull();
    expect(consumeNormalQuote('abc', 0, q)).toEqual({ advance: 0, handled: false });
  });

  it('applyQuoteOrBrace tracks quotes, braces, and sawBrace flag', () => {
    const st = { delta: 0, inString: null as string | null, sawBrace: false };
    applyQuoteOrBrace('"', st);
    expect(st.inString).toBe('"');
    st.inString = null;
    applyQuoteOrBrace('{', st);
    expect(st.delta).toBe(1);
    expect(st.sawBrace).toBe(true);
    applyQuoteOrBrace('}', st);
    expect(st.delta).toBe(0);
  });

  it('stepActiveCodeToken and scanBracesInLine ignore braces inside comments and raw strings', () => {
    const st = { delta: 0, inBlock: false, rawTerm: null as string | null, inString: null as string | null, sawBrace: false };
    expect(stepActiveCodeToken('// {}', 0, '.go', st)).toEqual({ advance: 0, stop: true });
    expect(stepActiveCodeToken('/* x */', 0, '.go', st)).toEqual({ advance: 1, stop: false });
    expect(st.inBlock).toBe(true);

    const scan = scanBracesInLine('func a() { s := `{}` /* } */ } // {', false, null, '.go');
    expect(scan).toEqual({ delta: 0, nowInBlock: false, nowRawTerm: null, sawBrace: true });
  });

  it('tryStartBraceFunction, updateBraceScanState, processBraceLine, and extractBraceFunctions handle single-line and multi-line fns (Bugs 1 & 2)', () => {
    const state: BraceScanState = { currentFn: null, braceCount: 0, fnLines: [], inBlockComment: false, rawTerm: null };
    tryStartBraceFunction('func Run() {}', state, '.go');
    expect(state.currentFn).toBe('Run');
    updateBraceScanState('func Run() {}', state, '.go');
    expect(state.braceCount).toBe(0);
    expect(state.sawBrace).toBe(true);

    const blocks: RawFunctionBlock[] = [];
    const scanState: BraceScanState = { currentFn: null, braceCount: 0, fnLines: [], inBlockComment: false, rawTerm: null };
    processBraceLine('func One() {}', scanState, blocks, 0, '.go');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(0);

    const goCode = ['package p', 'func Single() {}', 'func Multi(x int) int {', '  if x > 0 {', '    return x', '  }', '  return 0', '}'].join('\n');
    const extracted = extractBraceFunctions(goCode, 'main.go');
    expect(extracted.map((f) => [f.functionName, f.line])).toEqual([
      ['Single', 2],
      ['Multi', 3],
    ]);
    expect(extractBraceFunctions('func unclosed() {', 'bad.go')).toEqual([]);
  });
});

describe('Polyglot Scanner — Metrics, Smells & Complexity', () => {
  it('detectPolyglotSmells and buildMetricsFromBlocks handle clean and linter-suppressed modules', () => {
    expect(detectPolyglotSmells('# noqa')).toEqual(['Supresión no autorizada de linter']);
    expect(detectPolyglotSmells('return 1')).toEqual([]);

    const fallback = buildMetricsFromBlocks([], '# type: ignore\nx = 1', 'a.py');
    expect(fallback).toHaveLength(1);
    expect(fallback[0].functionName).toBe('main_module');
    expect(buildMetricsFromBlocks([], 'x = 1', 'a.py')).toEqual([]);
    const nonEmpty = buildMetricsFromBlocks([{ name: 'f', body: 'def f():\n  return 1', startLine: 0 }], '', 'a.py');
    expect(nonEmpty[0].functionName).toBe('f');
  });

  it('stripStringsAndComments removes comments, raw strings, and quoted literals', () => {
    const pyStripped = stripStringsAndComments('"""if"""\nx = "#"\n# for\nreturn x', '.py');
    expect(pyStripped).not.toContain('if');
    expect(pyStripped).not.toContain('for');

    const rsStripped = stripStringsAndComments('let s = r#"if"#; // while\n/* for */', '.rs');
    expect(rsStripped).not.toContain('if');
    expect(rsStripped).not.toContain('while');
    expect(rsStripped).not.toContain('for');
  });

  it('computeHalsteadMI clamps output to 0..100 and guards loc <= 0 against NaN (Defect 5)', () => {
    const normal = computeHalsteadMI('return a + b;', 1, 2, 1);
    expect(normal).toBeGreaterThan(50);
    expect(normal).toBeLessThanOrEqual(100);
    expect(Number.isNaN(computeHalsteadMI('', 1, 0, 0))).toBe(false);
    expect(Number.isNaN(computeHalsteadMI('', 1, -5, 0))).toBe(false);
  });

  it('isCommentLine, countCommentsAndLoc, and calculatePolyglotMetrics compute full FunctionMetrics', () => {
    expect(isCommentLine('# hi', true)).toBe(true);
    expect(isCommentLine('// hi', false)).toBe(true);
    expect(isCommentLine('return 1', false)).toBe(false);

    const counted = countCommentsAndLoc(['// c1', '// c2'], false);
    expect(counted).toEqual({ loc: 1, commentCount: 2, cleanLines: [] });

    const m = calculatePolyglotMetrics('func f() {\n// c\n  if x { return }\n}', 'f', 'a.go', 4);
    expect(m.line).toBe(5);
    expect(m.loc).toBe(3);
    expect(m.cyclomatic).toBe(2);
    expect(calculatePolyglotMetrics('func g() {}', 'g', 'a.go').line).toBe(1);
  });

  it('getCyclomaticPattern and computePolyglotCyclomatic count language-specific branches', () => {
    expect(getCyclomaticPattern('.py').source).toContain('elif');
    expect(getCyclomaticPattern('.go').source).toContain('select');
    expect(getCyclomaticPattern('.rs').source).toContain('match');
    expect(getCyclomaticPattern('.cs').source).toContain('foreach');
    expect(getCyclomaticPattern('.java').source).toContain('when');
    expect(getCyclomaticPattern('.cpp').source).toContain('catch');

    expect(computePolyglotCyclomatic('if a and b or c:', '.py')).toBe(4);
    expect(computePolyglotCyclomatic('return 1', '.go')).toBe(1);
  });

  it('computePythonCognitive, computeBraceCognitive, and computePolyglotCognitive measure nesting', () => {
    const pyLines = ['def f(x):', '    if x:', '        for i in x:', '            pass'];
    expect(computePythonCognitive(pyLines)).toBe(3);
    expect(computePythonCognitive([])).toBe(0);

    const braceLines = ['func f() {', '  if a {', '    for b {', '    }', '  }', '}'];
    expect(computeBraceCognitive(braceLines)).toBe(3);
    expect(computeBraceCognitive(['func f() {}'])).toBe(0);

    expect(computePolyglotCognitive(pyLines, true)).toBe(3);
    expect(computePolyglotCognitive(braceLines, false)).toBe(3);
  });
});

describe('TypeScript AST Engine', () => {
  it('getSharedProject returns singleton and createTempSourceFile resolves extensions', () => {
    const p1 = getSharedProject();
    expect(p1).toBe(getSharedProject());

    withTempTsNode('export const x = 1;', 'noext', (sf) => {
      expect(sf.getFilePath().endsWith('.ts')).toBe(true);
    });
    withTempTsNode('export const y = <div />;', 'comp.tsx', (sf) => {
      expect(sf.getFilePath().endsWith('.tsx')).toBe(true);
    });
  });

  it('resolveDeclarationName, resolveExpressionParentName, and resolveFunctionName resolve names', () => {
    const code = [
      'function top() {}',
      'class C { constructor() {} get v() { return 1; } set v(x: number) {} m() {} }',
      'const arrow = () => {};',
      'const obj = { prop: () => {} };',
      'it("spec name", () => {});',
      'run(cb, () => {});',
    ].join('\n');

    withTempTsNode(code, 'names.ts', (sf) => {
      const fns = sf.getDescendants().filter(isAnalyzableFunction);
      const names = fns.map((n) => resolveFunctionName(n));
      expect(names).toEqual(['top', 'constructor', 'get v', 'set v', 'm', 'arrow', 'prop', 'spec name']);
      expect(resolveDeclarationName(sf)).toBeNull();
      expect(resolveExpressionParentName(sf)).toBe('anonymous');
      const runCall = sf.getDescendantsOfKind(SyntaxKind.CallExpression)[1];
      expect(resolveExpressionParentName(runCall)).toBe('run');
    });
  });

  it('isBranchNode and isNestedFunctionBoundary classify AST nodes accurately', () => {
    const code = 'function outer(a: boolean, b: boolean) { if (a && b) { return 1; } function inner() {} return a ? 1 : 0; }';
    withTempTsNode(code, 'branch.ts', (sf) => {
      const outer = sf.getFunctionOrThrow('outer');
      const inner = outer.getFunctionOrThrow('inner');
      const ifStmt = outer.getFirstDescendantByKindOrThrow(SyntaxKind.IfStatement);
      const binAnd = outer.getFirstDescendantByKindOrThrow(SyntaxKind.BinaryExpression);

      expect(isBranchNode(ifStmt.getKind(), ifStmt)).toBe(true);
      expect(isBranchNode(binAnd.getKind(), binAnd)).toBe(true);
      expect(isBranchNode(SyntaxKind.Identifier, outer)).toBe(false);
      expect(isNestedFunctionBoundary(outer, outer)).toBe(false);
      expect(isNestedFunctionBoundary(inner, outer)).toBe(true);
      expect(isNestedFunctionBoundary(ifStmt, outer)).toBe(false);
    });
  });

  it('computeCyclomaticFromAst skips nested function subtrees (Bug 4) and computeCognitiveFromAst weights nesting', () => {
    const code = [
      'function outer(a: boolean) {',
      '  function inner(b: boolean, c: boolean) {',
      '    if (b && c) { return 1; }',
      '    return 0;',
      '  }',
      '  if (a) {',
      '    for (let i = 0; i < 2; i++) { if (i > 0) return i; }',
      '  }',
      '  return inner(a, a);',
      '}',
    ].join('\n');

    withTempTsNode(code, 'cc.ts', (sf) => {
      const outer = sf.getFunctionOrThrow('outer');
      expect(computeCyclomaticFromAst(outer)).toBe(4);
      expect(computeCognitiveFromAst(outer)).toBe(6);
    });
  });

  it('calculateLocAndHalstead computes LOC/MI and guards comment-only text', () => {
    const res = calculateLocAndHalstead('function f() {\n// note\nreturn 1;\n}', 1);
    expect(res.loc).toBe(3);
    expect(res.mi).toBeGreaterThan(50);

    const commentsOnly = calculateLocAndHalstead('// only comment\n/* block */', 1);
    expect(commentsOnly.loc).toBe(1);
    expect(Number.isNaN(commentsOnly.mi)).toBe(false);
  });

  it('isProductionFile and detectAstCodeSmells enforce production vs test smell rules', () => {
    expect(isProductionFile('src/app.ts')).toBe(true);
    expect(isProductionFile('packages/core/tests/a.spec.ts')).toBe(false);
    expect(isProductionFile('C:\\repo\\__tests__\\a.ts')).toBe(false);

    const stub = ['export function bad(x: an' + 'y) {', '  // @ts-' + 'ignore', '  // T' + 'ODO: wire', '  return <button onClick={() => {}} />;', '}'].join('\n');
    withTempTsNode(stub, 'src/ui.tsx', (sf) => {
      const prodSmells = detectAstCodeSmells(sf, stub, 'src/ui.tsx');
      expect(prodSmells).toHaveLength(4);
      const testSmells = detectAstCodeSmells(sf, stub, 'tests/ui.spec.ts');
      expect(testSmells).toHaveLength(2);
    });
  });

  it('isDeclarationFunction, isAnalyzableArrowOrExpr, isAnalyzableFunction, buildNodeMetrics, and createFallbackModuleMetrics work end-to-end', () => {
    const code = 'function dec() { return 1; }\nconst arr = () => 2;\n[1].map((n) => n + 1);';
    withTempTsNode(code, 'src/mod.ts', (sf) => {
      const dec = sf.getFunctionOrThrow('dec');
      const arrows = sf.getDescendantsOfKind(SyntaxKind.ArrowFunction);
      expect(isDeclarationFunction(dec)).toBe(true);
      expect(isDeclarationFunction(arrows[0])).toBe(false);
      expect(isAnalyzableArrowOrExpr(arrows[0])).toBe(true);
      expect(isAnalyzableArrowOrExpr(arrows[1])).toBe(false);
      expect(isAnalyzableFunction(dec)).toBe(true);
      expect(isAnalyzableFunction(arrows[1])).toBe(false);

      const m = buildNodeMetrics(dec, 'src/mod.ts');
      expect(m.functionName).toBe('dec');
      expect(m.line).toBe(1);
      expect(m.cyclomatic).toBe(1);

      expect(createFallbackModuleMetrics('src/mod.ts', ['smell'])).toEqual([
        { functionName: 'main_module', filePath: 'src/mod.ts', loc: 1, cyclomatic: 1, cognitive: 0, maintainability: 100, codeSmells: ['smell'] },
      ]);
    });
  });
});
