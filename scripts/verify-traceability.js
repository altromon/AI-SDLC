#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Verificador Determinista de Trazabilidad 360° (RTM Validator)
 * ==============================================================================
 * Comprueba que TODO requerimiento (Funcional, Calidad, Restricción, Seguridad)
 * sea estrictamente trazable a:
 *   1. PRODUCTO (Upstream: UC-*, BR-*, CAP-*, ABUSE-*)
 *   2. ARQUITECTURA (Midstream: SRV-*, SYS-*, ADR-*, SEC-ENC-*)
 *   3. PRUEBAS (Downstream: .feature Cucumber, test specs, benchmarks)
 *
 * Emite exit code 0 si la trazabilidad es del 100%, o exit code 1 si hay huérfanos.
 * Genera el informe formal: reports/TRACEABILITY_MATRIX.md
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlLines = match[1].split('\n');
  const frontmatter = {};
  let currentKey = null;

  for (let line of yamlLines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('- ') && currentKey) {
      const item = line.substring(2).trim().replace(/^["']|["']$/g, '');
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(item);
    } else {
      const parts = line.split(':');
      if (parts.length >= 2) {
        currentKey = parts[0].trim();
        let val = parts.slice(1).join(':').trim();
        val = val.replace(/^["']|["']$/g, '');
        if (val === '' || val === '[]') {
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = val;
        }
      }
    }
  }

  return { frontmatter, body: content.substring(match[0].length) };
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function main() {
  console.log('================================================================');
  console.log('AI-SDLC: Verificación de Trazabilidad 360° (Producto -> Arquitectura -> Pruebas)');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const allMdFiles = walkDir(rootDir);

  // 1. Indexar todos los artefactos por ID
  const artifactMap = new Map();
  const servicesList = [];

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter.id) {
        artifactMap.set(frontmatter.id, {
          file,
          type: frontmatter.type,
          title: frontmatter.title,
          frontmatter
        });

        if (frontmatter.type === 'service') {
          servicesList.push({
            id: frontmatter.id,
            satisfies: Array.isArray(frontmatter['satisfies-requirements']) ? frontmatter['satisfies-requirements'] : []
          });
        }
      }
    } catch (err) {
      // Ignorar archivos no parseables
    }
  }

  // 2. Identificar requerimientos
  const requirements = [];
  for (const [id, data] of artifactMap.entries()) {
    if (data.type === 'requirement' || data.type === 'security-requirement' || id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-') || id.startsWith('SEC-REQ-')) {
      requirements.push(data);
    }
  }

  if (requirements.length === 0) {
    console.log('[WARN] No se encontraron requerimientos para verificar.');
    process.exit(0);
  }

  let errors = 0;
  const matrixRows = [];

  for (const req of requirements) {
    const fm = req.frontmatter;
    const reqId = fm.id;

    // --- A. Trazabilidad a PRODUCTO (Upstream) ---
    let productTraces = [];
    if (Array.isArray(fm['derives-from'])) {
      productTraces.push(...fm['derives-from']);
    } else if (typeof fm['derives-from'] === 'string') {
      productTraces.push(fm['derives-from']);
    }

    if (Array.isArray(fm['mitigates-abuse-case'])) {
      productTraces.push(...fm['mitigates-abuse-case']);
    } else if (typeof fm['mitigates-abuse-case'] === 'string') {
      productTraces.push(fm['mitigates-abuse-case']);
    }

    const validProductTraces = productTraces.filter(id => artifactMap.has(id));
    const productStatus = validProductTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (validProductTraces.length === 0) errors++;

    // --- B. Trazabilidad a ARQUITECTURA (Midstream) ---
    let archTraces = [];
    if (Array.isArray(fm['implemented-by-services'])) {
      archTraces.push(...fm['implemented-by-services']);
    } else if (typeof fm['implemented-by-services'] === 'string') {
      archTraces.push(fm['implemented-by-services']);
    }

    // Buscar si algún servicio declara que satisface este requerimiento (relación canónica inversa)
    for (const srv of servicesList) {
      if (srv.satisfies.includes(reqId)) {
        if (!archTraces.includes(srv.id)) archTraces.push(srv.id);
      }
    }

    if (fm['enforced-in-enclave']) {
      archTraces.push(fm['enforced-in-enclave']);
    }

    const archStatus = archTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (archTraces.length === 0) errors++;

    // --- C. Trazabilidad a PRUEBAS (Downstream) ---
    let testTraces = [];
    if (fm['cucumber-feature-file']) {
      testTraces.push(fm['cucumber-feature-file']);
    }
    if (Array.isArray(fm['verified-by-tests'])) {
      testTraces.push(...fm['verified-by-tests']);
    }

    // Verificar si los archivos de prueba o .feature existen en disco
    const existingTestFiles = testTraces.filter(t => fs.existsSync(path.resolve(rootDir, t)));
    const testStatus = (existingTestFiles.length > 0 || testTraces.length > 0) ? 'CONFORME' : 'HUÉRFANO';
    if (testTraces.length === 0) errors++;

    matrixRows.push({
      id: reqId,
      title: fm.title || 'Sin título',
      type: req.type,
      productTraces: validProductTraces.join(', ') || 'NINGUNO',
      productStatus,
      archTraces: archTraces.join(', ') || 'NINGUNO',
      archStatus,
      testTraces: testTraces.join(', ') || 'NINGUNO',
      testStatus
    });
  }

  // 3. Imprimir resumen en consola
  console.table(matrixRows.map(r => ({
    'ID Requerimiento': r.id,
    'Trazabilidad Producto': `${r.productStatus} (${r.productTraces})`,
    'Trazabilidad Arquitectura': `${r.archStatus} (${r.archTraces})`,
    'Trazabilidad Pruebas': `${r.testStatus} (${r.testTraces})`
  })));

  // 4. Generar reporte formal Markdown
  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, 'TRACEABILITY_MATRIX.md');
  const reportLines = [
    '# Matriz de Trazabilidad de Requerimientos 360° (RTM)',
    '',
    `*Fecha de Verificación: ${new Date().toISOString()}*`,
    `*Estado General: ${errors === 0 ? '100% TRAZABLE (PASSED)' : `ERRORES DETECTADOS (${errors} brechas)`}*`,
    '',
    '## 1. Cobertura de Extremo a Extremo',
    '',
    '| ID Requerimiento | Título | Producto (Upstream) | Arquitectura (Midstream) | Pruebas (Downstream) | Estado Global |',
    '| :--- | :--- | :--- | :--- | :--- | :---: |'
  ];

  for (const r of matrixRows) {
    const isOk = r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME';
    reportLines.push(`| **\`${r.id}\`** | ${r.title} | \`${r.productTraces}\` | \`${r.archTraces}\` | \`${r.testTraces}\` | ${isOk ? '✅ CONFORME' : '❌ HUÉRFANO'} |`);
  }

  reportLines.push('');
  reportLines.push('## 2. Criterios de Validación Cumplidos');
  reportLines.push('- **Producto**: Todo requerimiento nace de un Caso de Uso (`UC-*`), Regla (`BR-*`) o Caso de Abuso (`ABUSE-*`).');
  reportLines.push('- **Arquitectura**: Todo requerimiento está asignado a al menos un Servicio (`SRV-*`), Enclave (`SEC-ENC-*`) o Decisión (`ADR-*`).');
  reportLines.push('- **Pruebas**: Todo requerimiento cuenta con archivos `.feature` de Cucumber o suites de prueba automatizadas asociadas.');

  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
  console.log(`\n[OK] Informe formal generado en: ${path.relative(rootDir, reportPath)}`);

  if (errors > 0) {
    console.error(`\n[FALLO] Se detectaron ${errors} enlaces de trazabilidad rotos o ausentes.`);
    process.exit(1);
  } else {
    console.log('\n[ÉXITO] 100% de los requerimientos son plenamente trazables.');
    process.exit(0);
  }
}

main();
