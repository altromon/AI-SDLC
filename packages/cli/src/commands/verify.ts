/**
 * CLI Handler: aisdlc verify
 */

import pc from 'picocolors';
import {
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@ai-sdlc/core';

export interface QualityVerifyOptions {
  root?: string;
  policy?: string;
  silent?: boolean;
  maxCyclomatic?: number | string;
  maxCognitive?: number | string;
  minMaintainability?: number | string;
  maxLines?: number | string;
  enforceMode?: 'STRICT' | 'PERMISSIVE' | string;
}

export function runVerifyQuality(options: QualityVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Quality Gate (Complejidad y Mantenibilidad)...')));
  }

  const thresholds = {
    max_cyclomatic: options.maxCyclomatic !== undefined ? Number(options.maxCyclomatic) : undefined,
    max_cognitive: options.maxCognitive !== undefined ? Number(options.maxCognitive) : undefined,
    min_maintainability: options.minMaintainability !== undefined ? Number(options.minMaintainability) : undefined,
    max_function_lines: options.maxLines !== undefined ? Number(options.maxLines) : undefined,
    enforce_mode: options.enforceMode,
  };

  const result = verifyQualityGate({ rootDir, policyPath: options.policy, thresholds });

  if (!options.silent) {
    console.log(
      `  Umbrales activos:       CC <= ${result.policy.max_cyclomatic} | Cognitiva <= ${result.policy.max_cognitive} | MI >= ${result.policy.min_maintainability} | Líneas <= ${result.policy.max_function_lines} | Modo: ${result.policy.enforce_mode}`
    );
    console.log(`  Archivos analizados:    ${pc.bold(String(result.totalFiles))}`);
    console.log(`  Funciones evaluadas:    ${pc.bold(String(result.totalFunctions))}`);
    console.log(`  Funciones conformes:    ${pc.green(String(result.passCount))}`);
    console.log(`  Funciones con fallos:   ${result.failCount > 0 ? pc.red(String(result.failCount)) : pc.green('0')}`);

    if (result.failCount > 0) {
      console.log(pc.red('\n  Infracciones detectadas:'));
      for (const f of result.results.filter((r) => r.status === 'FAIL')) {
        console.log(`    ${pc.red('✖')} ${pc.bold(f.relPath)} [${f.functionName}]: ${f.violations.join(', ')}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Release Gate APROBADO\n') : pc.red('\n✖ Release Gate BLOQUEADO\n'));
  }
  return isOk;
}

export function runVerifyTraceability(options: { root?: string; silent?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Trazabilidad 360° (Producto -> Arquitectura -> Pruebas)...')));
  }

  const result = verifyTraceability({ rootDir });

  if (!options.silent) {
    console.log(`  Requerimientos totales: ${pc.bold(String(result.totalRequirements))}`);
    console.log(`  Requerimientos conformes: ${pc.green(String(result.totalRequirements - result.orphanCount))}`);
    console.log(`  Requerimientos huérfanos: ${result.orphanCount > 0 ? pc.red(String(result.orphanCount)) : pc.green('0')}`);

    if (result.orphanCount > 0) {
      console.log(pc.red('\n  Brechas de trazabilidad:'));
      for (const o of result.orphans) {
        console.log(`    ${pc.red('✖')} [${o.id}] Producto: ${o.productStatus}, Arquitectura: ${o.archStatus}, Pruebas: ${o.testStatus}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Trazabilidad 360° CONFORME (100%)\n') : pc.red('\n✖ Trazabilidad BLOQUEADA\n'));
  }
  return isOk;
}

export function runVerifyGovernance(options: { root?: string; silent?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Gobierno de Tareas y Clasificación de Autonomía...')));
  }

  const result = verifyTasksGovernance({ rootDir });

  if (!options.silent) {
    console.log(`  Tareas totales auditadas: ${pc.bold(String(result.totalTasks))}`);
    console.log(`  Tareas con verificación:  ${pc.green(String(result.verifiedCount))}`);
    console.log(`  Tareas sin verificación:  ${result.unverifiedCount > 0 ? pc.red(String(result.unverifiedCount)) : pc.green('0')}`);
    console.log(`  Distribución de autonomía:`);
    console.log(`    🟢 AUTONOMOUS:         ${result.modeCounts['AUTONOMOUS'] || 0}`);
    console.log(`    🟡 HUMAN_REVIEW_PLAN:   ${result.modeCounts['HUMAN_REVIEW_PLAN'] || 0}`);
    console.log(`    🟠 AMBIGUOUS:           ${result.modeCounts['AMBIGUOUS'] || 0}`);
    console.log(`    🔴 HIGH_RISK_MANUAL:    ${result.modeCounts['HIGH_RISK_MANUAL'] || 0}`);

    if (result.violations.length > 0) {
      console.log(pc.red('\n  Infracciones de gobierno:'));
      for (const v of result.violations) {
        console.log(`    ${pc.red('✖')} ${v}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Gobierno de Tareas CONFORME\n') : pc.red('\n✖ Gobierno de Tareas BLOQUEADO\n'));
  }
  return isOk;
}

export function runVerifyTesting(options: { root?: string; silent?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Cobertura de Pruebas en Requisitos y Tareas...')));
  }

  const result = verifyTestingCoverage({ rootDir });

  if (!options.silent) {
    console.log(`  Requisitos verificados:   ${pc.green(`${result.passedRequirements}/${result.totalRequirements}`)}`);
    console.log(`  Tareas verificadas:       ${pc.green(`${result.passedTasks}/${result.totalTasks}`)}`);

    if (result.failedRequirements > 0 || result.failedTasks > 0) {
      console.log(pc.red('\n  Elementos sin pruebas ejecutables:'));
      for (const r of result.requirements.filter((r) => r.status !== 'VERIFICADO_CON_PRUEBA')) {
        console.log(`    ${pc.red('✖')} [Requisito: ${r.id}] ${r.title} (${r.file})`);
      }
      for (const t of result.tasks.filter((t) => t.status !== 'VERIFICADO_CON_PRUEBA')) {
        console.log(`    ${pc.red('✖')} [Tarea: ${t.id}] ${t.title} (${t.file})`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Cobertura de Pruebas CONFORME (100%)\n') : pc.red('\n✖ Cobertura de Pruebas INSUFICIENTE\n'));
  }
  return isOk;
}

export interface LicenseVerifyOptions {
  root?: string;
  policy?: string;
  manifest?: string;
  dynamic?: boolean;
  tool?: 'native' | 'license-checker' | 'trivy' | 'syft';
  depth?: 'direct' | 'transitive';
  sbom?: boolean | string;
  notices?: boolean | string;
  silent?: boolean;
}

export function runVerifyLicenses(options: LicenseVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Cumplimiento de Licencias Open Source (SCA)...')));
  }

  const sbomPath = typeof options.sbom === 'string' ? options.sbom : undefined;
  const generateSbom = options.sbom !== undefined ? Boolean(options.sbom) : undefined;
  const noticesPath = typeof options.notices === 'string' ? options.notices : undefined;
  const generateNotices = options.notices !== undefined ? Boolean(options.notices) : undefined;

  const result = verifyLicenses({
    rootDir,
    policyPath: options.policy,
    manifestPath: options.manifest,
    dynamic: options.dynamic,
    tool: options.tool,
    depth: options.depth,
    generateSbom,
    sbomPath,
    generateNotices,
    noticesPath,
  });

  if (!options.silent) {
    console.log(`  Dependencias evaluadas:   ${pc.bold(String(result.totalEvaluated))}`);
    console.log(`  Dependencias conformes:   ${pc.green(String(result.permittedCount))}`);
    console.log(`  Violaciones de licencia:  ${result.violations.length > 0 ? pc.red(String(result.violations.length)) : pc.green('0')}`);
    if (result.sbomPath) {
      console.log(`  SBOM CycloneDX generado:  ${pc.cyan(result.sbomPath)}`);
    }
    if (result.noticesPath) {
      console.log(`  Avisos legales generados: ${pc.cyan(result.noticesPath)}`);
    }

    if (result.violations.length > 0) {
      console.log(pc.red('\n  Infracciones de licencia detectadas:'));
      for (const v of result.violations) {
        console.log(`    ${pc.red('✖')} [${v.category}] ${v.packageName} (${v.license}): ${v.reason}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Gobernanza de Licencias OSS CONFORME\n') : pc.red('\n✖ Gobernanza de Licencias OSS BLOQUEADA\n'));
  }
  return isOk;
}

export function runVerifyPdac(options: { root?: string; silent?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Grafo PDaC y Deriva Criptográfica (SHA-256)...')));
  }

  const result = verifyPdacGraph({ rootDir });

  if (!options.silent) {
    console.log(`  Nodos PDaC en línea base: ${pc.bold(String(result.totalNodes))}`);
    console.log(`  Citaciones evaluadas:     ${pc.bold(String(result.totalEdges))}`);
    console.log(`  Derivas criptográficas:   ${result.drifts.length > 0 ? pc.red(String(result.drifts.length)) : pc.green('0')}`);

    if (result.drifts.length > 0) {
      console.log(pc.red('\n  Derivas detectadas (Estado: STALE):'));
      for (const d of result.drifts) {
        console.log(`    ${pc.red('✖')} En ${d.sourceFile} citando ${d.targetId}: digest desalineado.`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Grafo PDaC Libre de Deriva\n') : pc.red('\n✖ Deriva Criptográfica Detectada\n'));
  }
  return isOk;
}

export function runVerifySchemas(options: { root?: string; path?: string; silent?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Conformidad con Esquemas JSON (Draft 2020-12)...')));
  }

  const result = verifyArtifactsSchemas({ rootDir, targetPath: options.path });

  if (!options.silent) {
    console.log(`  Artefactos evaluados:    ${pc.bold(String(result.totalEvaluated))}`);
    console.log(`  Artefactos conformes:    ${pc.green(String(result.validCount))}`);
    console.log(`  Infracciones de esquema: ${result.invalidCount > 0 ? pc.red(String(result.invalidCount)) : pc.green('0')}`);

    if (result.violations.length > 0) {
      console.log(pc.red('\n  Infracciones detectadas frente a esquemas JSON:'));
      for (const v of result.violations) {
        console.log(`    ${pc.red('✖')} [${v.id || v.filePath}] (${v.schemaId || 'esquema'}): ${v.message}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(isOk ? pc.green('\n✔ Esquemas de Artefactos CONFORME (100%)\n') : pc.red('\n✖ Esquemas de Artefactos BLOQUEADO\n'));
  }
  return isOk;
}

export interface FrictionVerifyOptions {
  root?: string;
  change?: string;
  diffFiles?: string[];
  silent?: boolean;
}

export function runVerifyFriction(options: FrictionVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.bold(pc.cyan('\n🛡️  [AI-SDLC] Verificando Fricción Progresiva y Anti-Bypass Guardrails...')));
  }

  const result = verifyProgressiveFriction({
    rootDir,
    changeId: options.change,
    diffFiles: options.diffFiles,
  });

  if (!options.silent) {
    console.log(`  Perfil detectado:        ${pc.magenta(result.profile)}`);
    console.log(`  Archivos evaluados:      ${pc.bold(String(result.evaluatedFiles.length))}`);
    if (result.bypassedRules.length > 0) {
      console.log(pc.red('\n  Infracciones Anti-Bypass detectadas:'));
      for (const rule of result.bypassedRules) {
        console.log(`    ${pc.red('✖')} ${rule}`);
      }
    }
    if (result.errors.length > 0) {
      console.log(pc.red('\n  Errores de validación de perfil:'));
      for (const err of result.errors) {
        console.log(`    ${pc.red('✖')} ${err}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(
      isOk
        ? pc.green('\n✔ Fricción Progresiva CONFORME (EXIT 0)\n')
        : pc.red('\n✖ Fricción Progresiva BLOQUEADO (EXIT 1)\n')
    );
  }
  return isOk;
}

export interface DuplicatesVerifyOptions {
  root?: string;
  similarity?: number | string;
  silent?: boolean;
}

export function runVerifyDuplicates(options: DuplicatesVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const similarityThreshold =
    options.similarity !== undefined ? Number(options.similarity) : undefined;

  if (!options.silent) {
    console.log(
      pc.bold(
        pc.cyan(
          '\n🔍 [AI-SDLC] Verificando Requisitos Duplicados y Redundancia (Shift-Left Pre-Flight)...'
        )
      )
    );
  }

  const result = verifyArtifactDuplicates({
    rootDir,
    titleSimilarityThreshold: similarityThreshold,
  });

  if (!options.silent) {
    console.log(`  Requisitos evaluados:    ${pc.bold(String(result.totalRequirements))}`);
    console.log(
      `  Errores de duplicidad:   ${result.errorCount > 0 ? pc.red(String(result.errorCount)) : pc.green('0')}`
    );
    console.log(
      `  Advertencias:            ${result.warningCount > 0 ? pc.yellow(String(result.warningCount)) : pc.green('0')}`
    );

    if (result.issues.length > 0) {
      console.log(pc.red('\n  Incidencias detectadas:'));
      for (const issue of result.issues) {
        const icon = issue.severity === 'ERROR' ? pc.red('✖') : pc.yellow('⚠');
        const badge =
          issue.severity === 'ERROR' ? pc.red(`[${issue.type}]`) : pc.yellow(`[${issue.type}]`);
        console.log(`    ${icon} ${badge} [${issue.id}] en ${issue.file}: ${issue.message}`);
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(
      isOk
        ? pc.green('\n✔ Verificación de Duplicados CONFORME (0 Colisiones)\n')
        : pc.red('\n✖ Verificación de Duplicados BLOQUEADA (Colisiones Detectadas)\n')
    );
  }
  return isOk;
}

export function runVerifyAll(options: QualityVerifyOptions = {}): boolean {
  if (!options.silent) {
    console.log(pc.bold(pc.magenta('================================================================')));
    console.log(pc.bold(pc.magenta('          AI-SDLC: SUITE COMPLETA DE QUALITY GATES Y GOBIERNO    ')));
    console.log(pc.bold(pc.magenta('================================================================')));
  }

  const root = options.root || process.cwd();
  const okQuality = runVerifyQuality(options);
  const okTrace = runVerifyTraceability({ root, silent: options.silent });
  const okGov = runVerifyGovernance({ root, silent: options.silent });
  const okTest = runVerifyTesting({ root, silent: options.silent });
  const okLic = runVerifyLicenses({ root, silent: options.silent });
  const okPdac = runVerifyPdac({ root, silent: options.silent });
  const okSchemas = runVerifySchemas({ root, silent: options.silent });
  const okDuplicates = runVerifyDuplicates({ root, silent: options.silent });

  const allPassed =
    okQuality &&
    okTrace &&
    okGov &&
    okTest &&
    okLic &&
    okPdac &&
    okSchemas &&
    okDuplicates;

  if (!options.silent) {
    console.log(pc.bold(pc.magenta('================================================================')));
    console.log(pc.bold('RESUMEN DE EVALUACIÓN DE CI/CD:'));
    console.log(`  1. Quality Gate (Complejidad/Mantenibilidad): ${okQuality ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  2. Trazabilidad 360° (RTM):                  ${okTrace ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  3. Gobierno y Modos de Autonomía:            ${okGov ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  4. Cobertura de Pruebas (Reqs & Tasks):      ${okTest ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  5. Licencias Open Source:                    ${okLic ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  6. PDaC & Deriva Criptográfica:              ${okPdac ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  7. Esquemas JSON de Artefactos:              ${okSchemas ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(`  8. Requisitos Duplicados (Shift-Left Gate):   ${okDuplicates ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(pc.bold(pc.magenta('================================================================')));

    if (allPassed) {
      console.log(pc.bold(pc.green('\n✨ VEREDICTO FINAL: REPOSITORIO CONFORME CON EL ESTÁNDAR AI-SDLC (EXIT 0)\n')));
    } else {
      console.log(pc.bold(pc.red('\n⛔ VEREDICTO FINAL: BLOQUEO POR INFRACCIONES DETECTADAS (EXIT 1)\n')));
    }
  }

  return allPassed;
}

