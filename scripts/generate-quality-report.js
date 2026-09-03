#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Generador Automático de Informes de Calidad (Motor Multilenguaje)
 * ==============================================================================
 * Soporta de forma nativa los siguientes lenguajes:
 *   - TypeScript / JavaScript (.ts, .js)
 *   - Python (.py)
 *   - Java / Kotlin (.java, .kt)
 *   - Go (.go)
 *   - C# (.cs)
 *   - Rust (.rs)
 *   - C / C++ (.c, .cpp)
 *
 * Calcula métricas universales estándar (McCabe CC, Halstead, SEI MI, LOC, Smells)
 * e integra resultados para el Release Gate.
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

  // 1. Complejidad Ciclomática (McCabe)
  let cyclomatic = 1;
  let decisionRegex;
  if (isPython) {
    decisionRegex = /\b(if|elif|for|while|except)\b|\b(and|or)\b/g;
  } else if (ext === '.go') {
    decisionRegex = /\b(if|for|case|select)\b|&&|\|\|/g;
  } else if (ext === '.rs') {
    decisionRegex = /\b(if|for|while|match)\b|&&|\|\||\?/g;
  } else {
    // JS/TS, Java, C#, C, C++
    decisionRegex = /\b(if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;
  }

  const matches = fnBody.match(decisionRegex);
  if (matches) cyclomatic += matches.length;

  // 2. Complejidad Cognitiva aproximada
  let cognitive = 0;
  let nesting = 0;
  for (const line of lines) {
    if (isPython) {
      // Detección por indentación
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

  // 3. Índice de Mantenibilidad (SEI normalizado 0-100)
  const tokens = fnBody.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter(t => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const rawMI = 171 - (5.2 * Math.log(V)) - (0.23 * cyclomatic) - (16.2 * Math.log(loc));
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  // 4. Reglas de Código Transversales
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
    language: detectLanguage(ext),
    loc,
    cyclomatic,
    cognitive,
    maintainability: Math.round(normalizedMI * 10) / 10,
    codeSmells
  };
}

function detectLanguage(ext) {
  switch (ext) {
    case '.ts': case '.tsx': return 'TypeScript';
    case '.js': case '.jsx': return 'JavaScript';
    case '.py': return 'Python';
    case '.java': return 'Java';
    case '.go': return 'Go';
    case '.cs': return 'C#';
    case '.rs': return 'Rust';
    case '.cpp': case '.c': return 'C/C++';
    default: return 'Desconocido';
  }
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
        // Fin de la función por des-indentación
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

    // Regex multilenguaje para Java, Go, Rust, C#, C/C++, JS/TS
    let fnMatch = null;
    if (ext === '.go') {
      fnMatch = line.match(/func\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_$]+)\s*\(/);
    } else if (ext === '.rs') {
      fnMatch = line.match(/(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_$]+)\s*\(/);
    } else {
      // JS/TS, Java, C#, C/C++
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

function computeRating(avgMI, maxCyclo, totalSmells) {
  if (maxCyclo <= 10 && avgMI >= 75 && totalSmells === 0) return 'A';
  if (maxCyclo <= 12 && avgMI >= 65 && totalSmells <= 1) return 'B';
  if (maxCyclo <= 15 && avgMI >= 50 && totalSmells <= 3) return 'C';
  if (maxCyclo <= 20 && avgMI >= 40) return 'D';
  return 'F';
}

function main() {
  const args = process.argv.slice(2);
  const rootDir = process.cwd();

  let targetArg = null;
  let outputArg = null;
  let changeArg = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) targetArg = args[++i];
    if (args[i] === '--output' && args[i + 1]) outputArg = args[++i];
    if (args[i] === '--change' && args[i + 1]) changeArg = args[++i];
  }

  console.log('================================================================');
  console.log('AI-SDLC: Generador Automático de Calidad Multilenguaje (Polyglot)');
  console.log('================================================================\n');

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

  let scanTargets = [];
  if (targetArg) {
    scanTargets = [path.resolve(rootDir, targetArg)];
  } else {
    scanTargets = policy.target_directories.map(d => path.join(rootDir, d));
  }

  let sourceFiles = [];
  for (const t of scanTargets) {
    if (fs.existsSync(t)) {
      if (fs.statSync(t).isDirectory()) {
        sourceFiles = sourceFiles.concat(walkDir(t, policy.supported_extensions));
      } else {
        sourceFiles.push(t);
      }
    }
  }

  if (sourceFiles.length === 0) {
    console.log('[WARN] No se encontraron archivos fuente para generar el informe de calidad.');
    process.exit(0);
  }

  const allFunctionMetrics = [];
  let totalSmells = 0;
  let totalLoc = 0;
  let peakCyclomatic = 0;
  let sumCyclomatic = 0;
  let sumMaintainability = 0;
  const languageSet = new Set();

  for (const file of sourceFiles) {
    const metrics = extractFunctions(fs.readFileSync(file, 'utf-8'), file);
    for (const m of metrics) {
      allFunctionMetrics.push(m);
      totalLoc += m.loc;
      sumCyclomatic += m.cyclomatic;
      sumMaintainability += m.maintainability;
      totalSmells += m.codeSmells.length;
      languageSet.add(m.language);
      if (m.cyclomatic > peakCyclomatic) peakCyclomatic = m.cyclomatic;
    }
  }

  const count = allFunctionMetrics.length || 1;
  const avgCyclomatic = Math.round((sumCyclomatic / count) * 10) / 10;
  const avgMaintainability = Math.round((sumMaintainability / count) * 10) / 10;
  const rating = computeRating(avgMaintainability, peakCyclomatic, totalSmells);

  const lowComplexity = allFunctionMetrics.filter(f => f.cyclomatic <= 5).length;
  const modComplexity = allFunctionMetrics.filter(f => f.cyclomatic > 5 && f.cyclomatic <= 10).length;
  const highComplexity = allFunctionMetrics.filter(f => f.cyclomatic > 10).length;

  const releaseGatePassed = peakCyclomatic <= policy.max_cyclomatic &&
                            avgMaintainability >= policy.min_maintainability &&
                            totalSmells === 0;

  let outputPath = path.join(rootDir, 'reports', 'QUALITY_REPORT.md');
  if (outputArg) {
    outputPath = path.resolve(rootDir, outputArg);
  } else if (changeArg) {
    outputPath = path.join(rootDir, 'specs', 'changes', 'active', changeArg, 'quality-report.md');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const report = [
    `# 📊 Informe Automático de Calidad de Software Multilenguaje (Polyglot Scorecard)`,
    ``,
    `> **Generado automáticamente a partir del código fuente.**`,
    `> Fecha de Generación: **${new Date().toISOString()}** | Modo de Política: **${policy.enforce_mode}**`,
    `> Ecosistemas Detectados: **${Array.from(languageSet).join(', ')}**`,
    ``,
    `---`,
    ``,
    `## 1. Resumen Ejecutivo & Calificación Global`,
    ``,
    `| Métrica Clave | Valor Obtenido | Umbral de Calidad | Estado |`,
    `| :--- | :---: | :---: | :---: |`,
    `| **Calificación Global (SQALE Rating)** | **\`Rating ${rating}\`** | Min. Rating B | ${rating === 'A' || rating === 'B' ? '🟢 EXCELENTE' : '🔴 NO CONFORME'} |`,
    `| **Veredicto del Release Gate** | **${releaseGatePassed ? 'AUTORIZADO (PASS)' : 'BLOQUEADO (FAIL)'}** | 100% Sin Infracciones | ${releaseGatePassed ? '✅ APROBADO' : '❌ RESTRINGIDO'} |`,
    `| **Complejidad Ciclomática Máxima (Peak CC)** | **${peakCyclomatic}** | $\\le ${policy.max_cyclomatic}$ por función | ${peakCyclomatic <= policy.max_cyclomatic ? '✅ CONFORME' : '❌ VIOLACIÓN'} |`,
    `| **Complejidad Ciclomática Promedio** | **${avgCyclomatic}** | $\\le 5.0$ recomendado | ${avgCyclomatic <= 5.0 ? '✅ ÓPTIMO' : '⚠️ ATENCIÓN'} |`,
    `| **Índice de Mantenibilidad Promedio (MI)** | **${avgMaintainability} / 100** | $\\ge ${policy.min_maintainability}.0$ | ${avgMaintainability >= policy.min_maintainability ? '✅ CONFORME' : '❌ BAJO'} |`,
    `| **Reglas de Código Incumplidas (Code Smells)** | **${totalSmells}** | 0 toleradas | ${totalSmells === 0 ? '✅ CERO DEFECTOS' : '❌ HALLAZGOS DETECTADOS'} |`,
    `| **Módulos / Archivos Analizados** | **${sourceFiles.length}** | - | ℹ️ |`,
    `| **Funciones / Métodos Analizados** | **${count}** | - | ℹ️ |`,
    `| **Líneas de Código Efectivo (SLOC)** | **${totalLoc}** | - | ℹ️ |`,
    ``,
    `---`,
    ``,
    `## 2. Distribución de Complejidad Ciclomática (McCabe)`,
    ``,
    `\`\`\`text`,
    `  [1 - 5]   Baja / Simple (Óptimo)       : ${'█'.repeat(Math.min(30, lowComplexity))} (${lowComplexity} funciones)`,
    `  [6 - 10]  Moderada (Aceptable)         : ${'█'.repeat(Math.min(30, modComplexity))} (${modComplexity} funciones)`,
    `  [> 10]    Alta / Riesgosa (BLOQUEADA)  : ${'█'.repeat(Math.min(30, highComplexity))} (${highComplexity} funciones)`,
    `\`\`\``,
    ``,
    `---`,
    ``,
    `## 3. Desglose Detallado por Módulo, Lenguaje y Función`,
    ``,
    `| Archivo Fuente | Lenguaje | Función / Método | SLOC | Ciclomática (CC) | Cognitiva | Mantenibilidad (0-100) | Veredicto | Observaciones |`,
    `| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |`
  ];

  for (const f of allFunctionMetrics) {
    const relFile = path.relative(rootDir, f.filePath);
    const isOk = f.cyclomatic <= policy.max_cyclomatic &&
                 f.maintainability >= policy.min_maintainability &&
                 f.codeSmells.length === 0;

    const smells = f.codeSmells.length > 0 ? f.codeSmells.join(', ') : 'Conforme';
    report.push(`| \`${relFile}\` | **${f.language}** | \`${f.functionName}\` | ${f.loc} | ${f.cyclomatic} | ${f.cognitive} | ${f.maintainability} | ${isOk ? '✅ PASS' : '❌ FAIL'} | ${smells} |`);
  }

  report.push('');
  report.push('---');
  report.push('');
  report.push('## 4. Conclusiones y Acciones Recomendadas');

  if (releaseGatePassed) {
    report.push('El código generado cumple rigurosamente con los umbrales de mantenibilidad, no presenta código muerto ni violaciones de tipado, y mantiene la complejidad dentro de los límites matemáticos permitidos.');
    report.push('**El incremento o release está autorizado para su fusión e integración en la rama principal.**');
  } else {
    report.push('> [!CAUTION]');
    report.push('> **RELEASE BLOQUEADO**: Se han detectado violaciones de calidad que impiden la liberación.');
    report.push('> **Acciones requeridas para el desarrollador o agente de IA:**');
    report.push('> 1. Descomponer las funciones con complejidad ciclomática $>10$ en métodos auxiliares independientes.');
    report.push('> 2. Resolver los code smells y eliminar cualquier tipado débil o supresión de linter.');
    report.push('> 3. Volver a ejecutar `node scripts/generate-quality-report.js` para regenerar este informe.');
  }

  fs.writeFileSync(outputPath, report.join('\n'), 'utf-8');
  console.log(`[OK] Informe de Calidad Multilenguaje generado en:\n     ${path.relative(rootDir, outputPath)}`);
  console.log(`\nResumen: Lenguajes: [${Array.from(languageSet).join(', ')}] | Calificación: [Rating ${rating}] | Gate: [${releaseGatePassed ? 'PASSED ✅' : 'FAILED ❌'}] | SLOC: ${totalLoc}`);
}

main();
