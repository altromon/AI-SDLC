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
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@ai-sdlc/core';

export interface VerifyBaseOptions {
  root?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

export function isJsonOutput(options: VerifyBaseOptions = {}): boolean {
  if (options.json !== undefined) {
    return Boolean(options.json);
  }
  if (options.format !== undefined) {
    return options.format.trim().toLowerCase() === 'json';
  }
  const env = process.env.AISDLC_FORMAT?.trim().toLowerCase() ||
              process.env.AISDLC_OUTPUT?.trim().toLowerCase();
  return env === 'json';
}

export interface VerifyJsonPayload<TSummary = Record<string, unknown>, TViolation = unknown> {
  gate: string;
  success: boolean;
  exitCode: number;
  summary: TSummary;
  violations: TViolation[];
  [key: string]: unknown;
}

export interface QualityVerifyOptions extends VerifyBaseOptions {
  policy?: string;
  maxCyclomatic?: number | string;
  maxCognitive?: number | string;
  minMaintainability?: number | string;
  maxLines?: number | string;
  enforceMode?: 'STRICT' | 'PERMISSIVE' | string;
}

export function runVerifyQuality(options: QualityVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
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

  if (useJson) {
    const violations = result.results
      .filter((r) => r.status === 'FAIL')
      .flatMap((r) =>
        r.violations.map((v) => ({
          file: r.relPath,
          function: r.functionName,
          metric: 'quality',
          message: v,
          metrics: {
            loc: r.loc,
            cyclomatic: r.cyclomatic,
            cognitive: r.cognitive,
            maintainability: r.maintainability,
          },
        }))
      );

    const payload: VerifyJsonPayload = {
      gate: 'quality',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalFiles: result.totalFiles,
        totalFunctions: result.totalFunctions,
        passCount: result.passCount,
        failCount: result.failCount,
      },
      violations,
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface TraceabilityVerifyOptions extends VerifyBaseOptions {}

export function runVerifyTraceability(options: TraceabilityVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Trazabilidad 360° (Producto -> Arquitectura -> Pruebas)...')));
  }

  const result = verifyTraceability({ rootDir });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'traceability',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalRequirements: result.totalRequirements,
        conformingCount: result.totalRequirements - result.orphanCount,
        orphanCount: result.orphanCount,
      },
      violations: result.orphans.map((o) => ({
        id: o.id,
        title: o.title,
        productStatus: o.productStatus,
        archStatus: o.archStatus,
        testStatus: o.testStatus,
        message: `Requisito huérfano [${o.id}]`,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface GovernanceVerifyOptions extends VerifyBaseOptions {}

export function runVerifyGovernance(options: GovernanceVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Gobierno de Tareas y Clasificación de Autonomía...')));
  }

  const result = verifyTasksGovernance({ rootDir });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'governance',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalTasks: result.totalTasks,
        verifiedCount: result.verifiedCount,
        unverifiedCount: result.unverifiedCount,
        modeCounts: result.modeCounts,
        riskCounts: result.riskCounts,
      },
      violations: result.violations.map((v) => ({ message: v })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface TestingVerifyOptions extends VerifyBaseOptions {}

export function runVerifyTesting(options: TestingVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Cobertura de Pruebas en Requisitos y Tareas...')));
  }

  const result = verifyTestingCoverage({ rootDir });

  if (useJson) {
    const reqViolations = result.requirements
      .filter((r) => r.status !== 'VERIFICADO_CON_PRUEBA')
      .map((r) => ({
        type: 'REQUIREMENT',
        id: r.id,
        title: r.title,
        file: r.file,
        message: `Requisito sin prueba verificable [${r.id}]`,
      }));

    const taskViolations = result.tasks
      .filter((t) => t.status !== 'VERIFICADO_CON_PRUEBA')
      .map((t) => ({
        type: 'TASK',
        id: t.id,
        title: t.title,
        file: t.file,
        message: `Tarea sin verificación de prueba [${t.id}]`,
      }));

    const payload: VerifyJsonPayload = {
      gate: 'testing',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalRequirements: result.totalRequirements,
        passedRequirements: result.passedRequirements,
        failedRequirements: result.failedRequirements,
        totalTasks: result.totalTasks,
        passedTasks: result.passedTasks,
        failedTasks: result.failedTasks,
      },
      violations: [...reqViolations, ...taskViolations],
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface LicenseVerifyOptions extends VerifyBaseOptions {
  policy?: string;
  manifest?: string;
  dynamic?: boolean;
  tool?: 'native' | 'license-checker' | 'trivy' | 'syft';
  depth?: 'direct' | 'transitive';
  sbom?: boolean | string;
  notices?: boolean | string;
}

export function runVerifyLicenses(options: LicenseVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
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

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'licenses',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalEvaluated: result.totalEvaluated,
        permittedCount: result.permittedCount,
        violationsCount: result.violations.length,
      },
      violations: result.violations.map((v) => ({
        package: v.packageName,
        version: v.version,
        license: v.license,
        category: v.category,
        message: v.reason,
      })),
      artifacts: {
        sbomPath: result.sbomPath,
        noticesPath: result.noticesPath,
      },
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface PdacVerifyOptions extends VerifyBaseOptions {}

export function runVerifyPdac(options: PdacVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Grafo PDaC y Deriva Criptográfica (SHA-256)...')));
  }

  const result = verifyPdacGraph({ rootDir });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'pdac',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalNodes: result.totalNodes,
        totalEdges: result.totalEdges,
        driftCount: result.drifts.length,
      },
      violations: result.drifts.map((d) => ({
        sourceId: d.sourceId,
        targetId: d.targetId,
        sourceFile: d.sourceFile,
        expectedDigest: d.expectedDigest,
        actualDigest: d.actualDigest,
        message: `Deriva criptográfica en ${d.sourceFile} citando ${d.targetId}`,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface SchemasVerifyOptions extends VerifyBaseOptions {
  path?: string;
}

export function runVerifySchemas(options: SchemasVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verificando Conformidad con Esquemas JSON (Draft 2020-12)...')));
  }

  const result = verifyArtifactsSchemas({ rootDir, targetPath: options.path });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'schemas',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalEvaluated: result.totalEvaluated,
        validCount: result.validCount,
        invalidCount: result.invalidCount,
      },
      violations: result.violations.map((v) => ({
        file: v.filePath,
        id: v.id,
        schemaId: v.schemaId,
        property: v.property,
        message: v.message,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface FrictionVerifyOptions extends VerifyBaseOptions {
  change?: string;
  diffFiles?: string[];
}

export function runVerifyFriction(options: FrictionVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🛡️  [AI-SDLC] Verificando Fricción Progresiva y Anti-Bypass Guardrails...')));
  }

  const result = verifyProgressiveFriction({
    rootDir,
    changeId: options.change,
    diffFiles: options.diffFiles,
  });

  if (useJson) {
    const violations = [
      ...result.bypassedRules.map((rule) => ({ type: 'ANTI_BYPASS', message: rule })),
      ...result.errors.map((err) => ({ type: 'PROFILE_ERROR', message: err })),
    ];
    const payload: VerifyJsonPayload = {
      gate: 'friction',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        profile: result.profile,
        evaluatedFilesCount: result.evaluatedFiles.length,
        bypassed: result.bypassed,
      },
      violations,
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface DuplicatesVerifyOptions extends VerifyBaseOptions {
  similarity?: number | string;
}

export function runVerifyDuplicates(options: DuplicatesVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const similarityThreshold =
    options.similarity !== undefined ? Number(options.similarity) : undefined;
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
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

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'duplicates',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalRequirements: result.totalRequirements,
        errorCount: result.errorCount,
        warningCount: result.warningCount,
      },
      violations: result.issues.map((i) => ({
        type: i.type,
        severity: i.severity,
        id: i.id,
        file: i.file,
        conflictingId: i.conflictingId,
        message: i.message,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

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

export interface SecretVerifyCliOptions extends VerifyBaseOptions {
  diff?: boolean;
  base?: string;
  gitleaks?: boolean;
  entropy?: number | string;
}

export function runVerifySecrets(options: SecretVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const entropyThreshold =
    options.entropy !== undefined ? Number(options.entropy) : undefined;
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan(
          '\n🔐 [AI-SDLC] Verificando Detección Determinista de Secretos y Credenciales (Gitleaks Gate)...'
        )
      )
    );
  }

  const result = verifySecrets({
    rootDir,
    diff: options.diff,
    baseBranch: options.base,
    gitleaks: options.gitleaks,
    entropyThreshold,
  });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'secrets',
      success: result.success,
      exitCode: result.success ? 0 : 4,
      summary: {
        totalFilesScanned: result.totalFilesScanned,
        findingsCount: result.findingsCount,
        scannedWithGitleaks: result.scannedWithGitleaks,
      },
      violations: result.findings.map((f) => ({
        ruleId: f.ruleId,
        file: f.relPath,
        line: f.lineNumber,
        type: f.type,
        maskedMatch: f.maskedMatch,
        message: f.message,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

  if (!options.silent) {
    console.log(`  Archivos analizados:     ${pc.bold(String(result.totalFilesScanned))}`);
    console.log(
      `  Fugas de credenciales:   ${result.findingsCount > 0 ? pc.red(String(result.findingsCount)) : pc.green('0')}`
    );
    console.log(
      `  Motor Gitleaks nativo:   ${result.scannedWithGitleaks ? pc.cyan('Activo / Integrado') : pc.dim('Escáner Determinista (@ai-sdlc/core)')}`
    );

    if (result.findings.length > 0) {
      console.log(pc.red('\n  Credenciales expuestas detectadas:'));
      for (const f of result.findings) {
        console.log(
          `    ${pc.red('✖')} [${f.ruleId}] ${pc.bold(`${f.relPath}:${f.lineNumber}`)}: ${f.maskedMatch} - ${f.message}`
        );
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(
      isOk
        ? pc.green('\n✔ Detección de Secretos CONFORME (0 Fugas de Credenciales)\n')
        : pc.red('\n✖ Detección de Secretos BLOQUEADA (Código de Salida 4: Secreto Expuesto)\n')
    );
  }
  return isOk;
}

export interface SastVerifyCliOptions extends VerifyBaseOptions {
  semgrep?: boolean;
  minSeverity?: string;
}

export function runVerifySast(options: SastVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan(
          '\n🛡️  [AI-SDLC] Verificando Seguridad Shift-Left SAST (Inyecciones y OWASP Top 10)...'
        )
      )
    );
  }

  const result = verifySast({
    rootDir,
    semgrep: options.semgrep,
    minSeverity: options.minSeverity as any,
  });

  if (useJson) {
    const payload: VerifyJsonPayload = {
      gate: 'sast',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      summary: {
        totalFilesScanned: result.totalFilesScanned,
        violationsCount: result.violationsCount,
      },
      violations: result.violations.map((v) => ({
        ruleId: v.ruleId,
        file: v.relPath,
        line: v.lineNumber,
        type: v.type,
        severity: v.severity,
        message: v.message,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return result.success;
  }

  if (!options.silent) {
    console.log(`  Archivos evaluados:      ${pc.bold(String(result.totalFilesScanned))}`);
    console.log(
      `  Vulnerabilidades SAST:   ${result.violationsCount > 0 ? pc.red(String(result.violationsCount)) : pc.green('0')}`
    );

    if (result.violations.length > 0) {
      console.log(pc.red('\n  Vulnerabilidades detectadas:'));
      for (const v of result.violations) {
        console.log(
          `    ${pc.red('✖')} [${v.severity}] [${v.ruleId}] ${pc.bold(`${v.relPath}:${v.lineNumber}`)}: ${v.message}`
        );
      }
    }
  }

  const isOk = result.success;
  if (!options.silent) {
    console.log(
      isOk
        ? pc.green('\n✔ Análisis SAST CONFORME (0 Vulnerabilidades Críticas)\n')
        : pc.red('\n✖ Análisis SAST BLOQUEADO (Vulnerabilidades Detectadas)\n')
    );
  }
  return isOk;
}

export interface SecurityVerifyCliOptions extends VerifyBaseOptions {
  diff?: boolean;
  base?: string;
  gitleaks?: boolean;
  semgrep?: boolean;
  entropy?: number | string;
  minSeverity?: string;
}

export function runVerifySecurity(options: SecurityVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const entropyThreshold =
    options.entropy !== undefined ? Number(options.entropy) : undefined;

  const resultSecrets = verifySecrets({
    rootDir,
    diff: options.diff,
    baseBranch: options.base,
    gitleaks: options.gitleaks,
    entropyThreshold,
  });

  const resultSast = verifySast({
    rootDir,
    semgrep: options.semgrep,
    minSeverity: options.minSeverity as any,
  });

  const okSecrets = resultSecrets.success;
  const okSast = resultSast.success;
  const isOk = okSecrets && okSast;

  if (useJson) {
    const exitCode = isOk ? 0 : (!okSecrets ? 4 : 1);
    const payload: VerifyJsonPayload = {
      gate: 'security',
      success: isOk,
      exitCode,
      summary: {
        secretsScanned: resultSecrets.totalFilesScanned,
        secretFindings: resultSecrets.findingsCount,
        sastScanned: resultSast.totalFilesScanned,
        sastViolations: resultSast.violationsCount,
      },
      violations: [
        ...resultSecrets.findings.map((f) => ({
          type: 'SECRET',
          ruleId: f.ruleId,
          file: f.relPath,
          line: f.lineNumber,
          message: f.message,
        })),
        ...resultSast.violations.map((v) => ({
          type: 'SAST',
          ruleId: v.ruleId,
          file: v.relPath,
          line: v.lineNumber,
          severity: v.severity,
          message: v.message,
        })),
      ],
    };
    console.log(JSON.stringify(payload, null, 2));
    return isOk;
  }

  const okS = runVerifySecrets({ ...options, silent: options.silent });
  const okA = runVerifySast({ ...options, silent: options.silent });
  return okS && okA;
}

export function runVerifyAll(options: QualityVerifyOptions = {}): boolean {
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.magenta('================================================================')));
    console.log(pc.bold(pc.magenta('          AI-SDLC: SUITE COMPLETA DE QUALITY GATES Y GOBIERNO    ')));
    console.log(pc.bold(pc.magenta('================================================================')));
  }

  const root = options.root || process.cwd();
  const okQuality = runVerifyQuality({ ...options, root, silent: isSilent, json: false });
  const okTrace = runVerifyTraceability({ root, silent: isSilent, json: false });
  const okGov = runVerifyGovernance({ root, silent: isSilent, json: false });
  const okTest = runVerifyTesting({ root, silent: isSilent, json: false });
  const okLic = runVerifyLicenses({ root, silent: isSilent, json: false });
  const okPdac = runVerifyPdac({ root, silent: isSilent, json: false });
  const okSchemas = runVerifySchemas({ root, silent: isSilent, json: false });
  const okDuplicates = runVerifyDuplicates({ root, silent: isSilent, json: false });
  const okSecurity = runVerifySecurity({ root, silent: isSilent, json: false });

  const allPassed =
    okQuality &&
    okTrace &&
    okGov &&
    okTest &&
    okLic &&
    okPdac &&
    okSchemas &&
    okDuplicates &&
    okSecurity;

  if (useJson) {
    const gatesSummary: Record<string, { success: boolean }> = {
      quality: { success: okQuality },
      traceability: { success: okTrace },
      governance: { success: okGov },
      testing: { success: okTest },
      licenses: { success: okLic },
      pdac: { success: okPdac },
      schemas: { success: okSchemas },
      duplicates: { success: okDuplicates },
      security: { success: okSecurity },
    };

    const passedCount = Object.values(gatesSummary).filter((g) => g.success).length;
    const failedCount = 9 - passedCount;
    const exitCode = allPassed ? 0 : (!okSecurity ? 4 : 1);

    const violations = Object.entries(gatesSummary)
      .filter(([, g]) => !g.success)
      .map(([name]) => ({ gate: name, message: `Gate ${name} no superó los criterios de verificación` }));

    const payload: VerifyJsonPayload = {
      gate: 'all',
      success: allPassed,
      exitCode,
      summary: {
        totalGates: 9,
        passedGates: passedCount,
        failedGates: failedCount,
      },
      gates: gatesSummary,
      violations,
    };
    console.log(JSON.stringify(payload, null, 2));
    return allPassed;
  }

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
    console.log(`  9. Seguridad Shift-Left (Secretos & SAST):   ${okSecurity ? pc.green('PASSED') : pc.red('FAILED')}`);
    console.log(pc.bold(pc.magenta('================================================================')));

    if (allPassed) {
      console.log(pc.bold(pc.green('\n✨ VEREDICTO FINAL: REPOSITORIO CONFORME CON EL ESTÁNDAR AI-SDLC (EXIT 0)\n')));
    } else {
      console.log(pc.bold(pc.red('\n⛔ VEREDICTO FINAL: BLOQUEO POR INFRACCIONES DETECTADAS (EXIT 1)\n')));
    }
  }

  return allPassed;
}


