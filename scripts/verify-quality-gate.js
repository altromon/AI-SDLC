#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Motor Determinista de Quality Gate (Soporte Multilenguaje)
 * ==============================================================================
 * Soporta de forma nativa:
 *   TypeScript, JavaScript, Python, Java, Go, C#, Rust, C/C++
 *
 * Bloquea la liberación (Exit code 1) si cualquier función vulnera los umbrales
 * de Complejidad Ciclomática (>10) o Mantenibilidad (<50) definidos en quality-policy.yaml.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS = ['.ts', '.js', '.py', '.java', '.go', '.cs', '.rs', '.cpp', '.c'];

function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const policy = {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50.0,
    max_function_lines: 40,
    enforce_mode: 'STRICT',
    target_directories: ['src', 'lib', 'examples', 'tests'],
    supported_extensions: DEFAULT_EXTENSIONS
  };

  let inScope = false;
  let inTargets = false;
  let inExtensions = false;

  for (const line of lines) {
    const cleanLine = line.split('#')[0].trim();
    if (!cleanLine) continue;

    if (cleanLine.startsWith('scope:')) {
      inScope = true;
      continue;
    }
    if (inScope && cleanLine.startsWith('target_directories:')) {
      inTargets = true;
      inExtensions = false;
      policy.target_directories = [];
      continue;
    }
    if (inScope && cleanLine.startsWith('supported_extensions:')) {
      inExtensions = true;
      inTargets = false;
      policy.supported_extensions = [];
      continue;
    }
    if (inTargets && cleanLine.startsWith('- ')) {
      policy.target_directories.push(cleanLine.substring(2).replace(/['"]/g, '').trim());
      continue;
    }
    if (inExtensions && cleanLine.startsWith('- ')) {
      policy.supported_extensions.push(cleanLine.substring(2).replace(/['"]/g, '').trim());
      continue;
    }
    if (cleanLine.endsWith(':') && !cleanLine.startsWith('- ')) {
      inTargets = false;
      inExtensions = false;
      inScope = false;
    }

    if (cleanLine.startsWith('max_per_function:')) {
      const val = parseInt(cleanLine.split(':')[1].trim(), 10);
      if (!isNaN(val)) policy.max_cyclomatic = val;
    } else if (cleanLine.startsWith('min_acceptable_score:')) {
      const val = parseFloat(cleanLine.split(':')[1].trim());
      if (!isNaN(val)) policy.min_maintainability = val;
    } else if (cleanLine.startsWith('max_function_lines:')) {
      const val = parseInt(cleanLine.split(':')[1].trim(), 10);
      if (!isNaN(val)) policy.max_function_lines = val;
    } else if (cleanLine.startsWith('enforcement_mode:')) {
      policy.enforce_mode = cleanLine.split(':')[1].trim().replace(/['"]/g, '');
    }
  }

  return policy;
}

function calculateMetrics(fnBody, fnName, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isPython = ext === '.py';

  const lines = fnBody.split('\n').map(l => l.trim()).filter(l => {
    if (l.length === 0) return false;
    if (isPython) return !l.startsWith('#');
    return !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*');
  });

  const loc = Math.max(1, lines.length);

  let cyclomatic = 1;
  let decisionRegex;
  if (isPython) {
    decisionRegex = /\b(if|elif|for|while|except)\b|\b(and|or)\b/g;
  } else if (ext === '.go') {
    decisionRegex = /\b(if|for|case|select)\b|&&|\|\|/g;
  } else if (ext === '.rs') {
    decisionRegex = /\b(if|for|while|match)\b|&&|\|\||\?/g;
  } else {
    decisionRegex = /\b(if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;
  }

  const matches = fnBody.match(decisionRegex);
  if (matches) cyclomatic += matches.length;

  let cognitive = 0;
  let nesting = 0;
  for (const line of lines) {
    if (isPython) {
      const indent = line.length - line.trimStart().length;
      if (/\b(if|elif|for|while|except)\b/.test(line)) {
        cognitive += (1 + Math.floor(indent / 4));
      }
    } else {
      if (line.includes('{')) nesting++;
      if (line.includes('}')) nesting = Math.max(0, nesting - 1);
      if (/\b(if|for|while|catch|match|select)\b/.test(line)) {
        cognitive += (1 + nesting);
      }
    }
  }

  const tokens = fnBody.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter(t => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const rawMI = 171 - (5.2 * Math.log(V)) - (0.23 * cyclomatic) - (16.2 * Math.log(loc));
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  const codeSmells = [];
  if (['.ts', '.js'].includes(ext) && /\bany\b/.test(fnBody)) {
    codeSmells.push('Uso prohibido de "any"');
  }
  if (/\/\/\s*@ts-ignore|\/\/\s*eslint-disable|#\s*noqa|#\s*type:\s*ignore|@SuppressWarnings/.test(fnBody)) {
    codeSmells.push('Supresión no autorizada de linter');
  }
  if (loc > 40) {
    codeSmells.push(`Función extensa (${loc} líneas > límite 40)`);
  }

  return {
    functionName: fnName,
    filePath,
    loc,
    cyclomatic,
    cognitive,
    maintainability: Math.round(normalizedMI * 10) / 10,
    codeSmells
  };
}

function extractFunctionsPython(content, filePath) {
  const functions = [];
  const lines = content.split('\n');
  let currentFn = null;
  let fnLines = [];
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const match = rawLine.match(/^(\s*)(?:async\s+)?def\s+([a-zA-Z0-9_$]+)\s*\(/);

    if (match) {
      if (currentFn && fnLines.length > 0) {
        functions.push(calculateMetrics(fnLines.join('\n'), currentFn, filePath));
      }
      currentFn = match[2];
      baseIndent = match[1].length;
      fnLines = [rawLine];
    } else if (currentFn) {
      const lineIndent = rawLine.length - rawLine.trimStart().length;
      if (rawLine.trim().length === 0 || lineIndent > baseIndent) {
        fnLines.push(rawLine);
      } else {
        functions.push(calculateMetrics(fnLines.join('\n'), currentFn, filePath));
        currentFn = null;
        fnLines = [];
      }
    }
  }

  if (currentFn && fnLines.length > 0) {
    functions.push(calculateMetrics(fnLines.join('\n'), currentFn, filePath));
  }

  if (functions.length === 0) {
    functions.push(calculateMetrics(content, 'module_scope', filePath));
  }

  return functions;
}

function extractFunctionsBraceLanguages(content, filePath) {
  const functions = [];
  const lines = content.split('\n');
  let currentFn = null;
  let braceCount = 0;
  let fnLines = [];

  const ext = path.extname(filePath).toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let fnMatch = null;
    if (ext === '.go') {
      fnMatch = line.match(/func\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_$]+)\s*\(/);
    } else if (ext === '.rs') {
      fnMatch = line.match(/(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_$]+)\s*\(/);
    } else {
      fnMatch = line.match(/(?:(?:public|private|protected|static|async|export|fn)\s+)*(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+\s*)?\{|(?:it|test)\s*\(\s*['"]([^'"]+)['"])/);
    }

    const keywordExclusions = ['if', 'for', 'while', 'switch', 'catch', 'select', 'match'];
    if (!currentFn && fnMatch) {
      const candidate = fnMatch[1] || fnMatch[2] || fnMatch[3] || fnMatch[4];
      if (candidate && !keywordExclusions.includes(candidate)) {
        currentFn = candidate;
        braceCount = 0;
        fnLines = [];
      }
    }

    if (currentFn) {
      fnLines.push(line);
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && fnLines.length > 1) {
        functions.push(calculateMetrics(fnLines.join('\n'), currentFn, filePath));
        currentFn = null;
        fnLines = [];
      }
    }
  }

  if (functions.length === 0) {
    functions.push(calculateMetrics(content, 'main_module', filePath));
  }

  return functions;
}

function extractFunctions(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.py') {
    return extractFunctionsPython(content, filePath);
  }
  return extractFunctionsBraceLanguages(content, filePath);
}

function walkDir(dir, extensions = DEFAULT_EXTENSIONS) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '__pycache__', '.pytest_cache', 'target', 'bin', 'obj', '.git', 'reports'].includes(file)) {
        results = results.concat(walkDir(fullPath, extensions));
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function main() {
  console.log('================================================================');
  console.log('AI-SDLC: Verificación de Quality Gate (Multilenguaje)');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const policyFile = path.join(rootDir, 'quality-policy.yaml');

  let policy = {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50.0,
    max_function_lines: 40,
    enforce_mode: 'STRICT',
    target_directories: ['src', 'lib', 'examples', 'tests'],
    supported_extensions: DEFAULT_EXTENSIONS
  };

  if (fs.existsSync(policyFile)) {
    policy = parseSimpleYaml(fs.readFileSync(policyFile, 'utf-8'));
  }

  let sourceFiles = [];
  for (const d of policy.target_directories) {
    const fullDir = path.join(rootDir, d);
    if (fs.existsSync(fullDir)) {
      sourceFiles = sourceFiles.concat(walkDir(fullDir, policy.supported_extensions));
    }
  }

  let totalViolations = 0;
  const analysisResults = [];

  for (const file of sourceFiles) {
    const metrics = extractFunctions(fs.readFileSync(file, 'utf-8'), file);
    for (const m of metrics) {
      const isCycloViolation = m.cyclomatic > policy.max_cyclomatic;
      const isCognitiveViolation = m.cognitive > policy.max_cognitive;
      const isMaintainabilityViolation = m.maintainability < policy.min_maintainability;
      const hasCodeSmells = m.codeSmells.length > 0;

      const passed = !isCycloViolation && !isCognitiveViolation && !isMaintainabilityViolation && !hasCodeSmells;
      if (!passed) totalViolations++;

      analysisResults.push({
        ...m,
        relPath: path.relative(rootDir, m.filePath),
        status: passed ? 'PASS' : 'FAIL',
        violations: [
          ...(isCycloViolation ? [`Complejidad Ciclomática (${m.cyclomatic} > ${policy.max_cyclomatic})`] : []),
          ...(isCognitiveViolation ? [`Complejidad Cognitiva (${m.cognitive} > ${policy.max_cognitive})`] : []),
          ...(isMaintainabilityViolation ? [`Mantenibilidad (${m.maintainability} < ${policy.min_maintainability})`] : []),
          ...m.codeSmells
        ]
      });
    }
  }

  console.table(analysisResults.map(r => ({
    'Archivo': r.relPath,
    'Función': r.functionName,
    'Ciclomática (<=10)': `${r.cyclomatic} ${r.cyclomatic > policy.max_cyclomatic ? '❌' : '✅'}`,
    'Cognitiva (<=15)': `${r.cognitive} ${r.cognitive > policy.max_cognitive ? '❌' : '✅'}`,
    'Mantenibilidad (>=50)': `${r.maintainability} ${r.maintainability < policy.min_maintainability ? '❌' : '✅'}`,
    'Estado Gate': r.status === 'PASS' ? '✅ PASS' : '❌ BLOQUEADO'
  })));

  if (totalViolations > 0 && policy.enforce_mode === 'STRICT') {
    console.error(`\n[BLOQUEO DE RELEASE] El Quality Gate ha fallado con ${totalViolations} violaciones.`);
    process.exit(1);
  } else {
    console.log(`\n[ÉXITO] Quality Gate 100% superado (${analysisResults.length} funciones analizadas en múltiples lenguajes).`);
    process.exit(0);
  }
}

main();
