#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Verificador Determinista de Trazabilidad 360° (RTM Validator)
 * ==============================================================================
 * Comprueba que TODO requerimiento (Funcional, Calidad, Seguridad) cuente con
 * cobertura completa entre:
 *   1. PRODUCTO (Upstream: Handoff PDaC HOF-*, UC-*, BR-*, ABUSE-*)
 *   2. ARQUITECTURA (Midstream: arc42 / NAF v4, CMP-*, ADR-*, SEC-ENC-*)
 *   3. PRUEBAS (Downstream: .feature Cucumber con tags y escenarios verificados)
 *
 * Emite exit code 0 si la trazabilidad es del 100%, o exit code 1 si hay huérfanos.
 * Genera el informe formal: reports/TRACEABILITY_MATRIX.md
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { verifyTraceability } from '../packages/core/src/verifiers/traceability.js';

export function main(): void {
  console.log('================================================================');
  console.log('AI-SDLC: Verificación de Trazabilidad 360° (PDaC HOF-* -> arc42 -> BDD)');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const result = verifyTraceability({ rootDir });

  if (result.totalRequirements === 0) {
    console.log('[WARN] No se encontraron requerimientos para verificar.');
    process.exit(0);
  }

  // Imprimir resumen en consola con tabla
  console.table(
    result.rows.map((r) => ({
      'ID Requerimiento': r.id,
      'Handoff PDaC': r.hofId || 'LÍNEA BASE',
      'Trazabilidad Producto': `${r.productStatus} (${r.productTraces})`,
      'Trazabilidad Arquitectura': `${r.archStatus} (${r.archTraces})`,
      'Trazabilidad Pruebas': `${r.testStatus} (${r.testTraces})`,
    }))
  );

  // Generar reporte formal Markdown
  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, 'TRACEABILITY_MATRIX.md');
  fs.writeFileSync(reportPath, result.reportMarkdown, 'utf-8');
  console.log(`\n[OK] Informe formal generado en: ${path.relative(rootDir, reportPath)}`);

  if (!result.success) {
    console.error(`\n[FALLO] Se detectaron ${result.orphanCount} brechas de trazabilidad 360°.`);
    process.exit(1);
  } else {
    console.log('\n[ÉXITO] 100% de los requerimientos cuentan con trazabilidad 360° conforme.');
    process.exit(0);
  }
}

main();
