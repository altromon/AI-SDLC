/**
 * CLI Handler: aisdlc check
 * Unified Pre-flight check command with optional non-destructive auto-fix.
 */

import pc from 'picocolors';
import {
  checkGherkinInSync,
  extractGherkinFeatures,
  PreflightCheckOptions,
  PreflightCheckResult,
  PreflightGateSummary,
  syncPdacDigests,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyQualityGate,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@ai-sdlc/core';

export function runAutoFix(rootDir: string, silent?: boolean): { gherkinCount: number; digestsCount: number } {
  const gherkinRes = extractGherkinFeatures({ rootDir });
  const pdacRes = syncPdacDigests({ rootDir });

  if (!silent) {
    if (gherkinRes.features.length > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Sincronizados ${pc.bold(String(gherkinRes.features.length))} archivos .feature (${gherkinRes.totalScenarios} escenarios).`);
    }
    if (pdacRes.syncedCount > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Sincronizados ${pc.bold(String(pdacRes.syncedCount))} digests SHA-256 en ${pdacRes.updatedFiles.length} archivos.`);
    }
  }

  return { gherkinCount: gherkinRes.features.length, digestsCount: pdacRes.syncedCount };
}

export function auditGherkinGate(rootDir: string, wasAutoFixed: boolean): PreflightGateSummary {
  const syncCheck = checkGherkinInSync({ rootDir });
  if (wasAutoFixed) {
    return {
      name: 'Sincronización BDD (Gherkin -> .feature)',
      status: 'FIXED',
      message: `${syncCheck.totalFeatures} especificaciones sincronizadas automáticamente`,
    };
  }
  if (!syncCheck.inSync) {
    const totalOut = syncCheck.missingFiles.length + syncCheck.outOfSyncFiles.length;
    return {
      name: 'Sincronización BDD (Gherkin -> .feature)',
      status: 'FAILED',
      message: `${totalOut} archivo(s) .feature desfasados o faltantes`,
      remediation: "Ejecuta 'aisdlc check --fix' para extraer y regenerar los archivos .feature.",
    };
  }
  return {
    name: 'Sincronización BDD (Gherkin -> .feature)',
    status: 'PASSED',
    message: `${syncCheck.totalFeatures} especificaciones al día en disco`,
  };
}

export function auditPdacGate(rootDir: string, wasAutoFixed: boolean): PreflightGateSummary {
  const res = verifyPdacGraph({ rootDir });
  if (res.success) {
    return {
      name: 'Integridad PDaC y Deriva SHA-256',
      status: wasAutoFixed ? 'FIXED' : 'PASSED',
      message: `${res.totalNodes} nodos y ${res.totalEdges} citaciones criptográficamente alineadas`,
    };
  }
  return {
    name: 'Integridad PDaC y Deriva SHA-256',
    status: 'FAILED',
    message: `${res.drifts.length} deriva(s) de digest detectada(s) (STALE)`,
    remediation: "Ejecuta 'aisdlc check --fix' para sincronizar automáticamente los digests de las citaciones.",
  };
}

export function auditQualityGate(rootDir: string): PreflightGateSummary {
  const res = verifyQualityGate({ rootDir });
  if (res.success) {
    return {
      name: 'Quality Gate (Complejidad y Mantenibilidad)',
      status: 'PASSED',
      message: `${res.passCount}/${res.totalFunctions} funciones conformes (CC <= 10, LOC <= 40)`,
    };
  }
  const firstFail = res.results.find((r) => r.status === 'FAIL');
  const detail = firstFail ? ` (ej. ${firstFail.functionName}: ${firstFail.violations.join(', ')})` : '';
  return {
    name: 'Quality Gate (Complejidad y Mantenibilidad)',
    status: 'FAILED',
    message: `${res.failCount} función(es) superan los umbrales de calidad${detail}`,
    remediation: 'Refactoriza las funciones infractoras reduciendo ramas condicionales y líneas de código.',
  };
}

export function auditTraceabilityGate(rootDir: string): PreflightGateSummary {
  const res = verifyTraceability({ rootDir });
  if (res.success) {
    return {
      name: 'Trazabilidad 360° (RTM Inversa)',
      status: 'PASSED',
      message: `${res.totalRequirements} requerimientos con cobertura 360° (0 huérfanos)`,
    };
  }
  const orphanIds = res.orphans.map((o) => o.id).slice(0, 3).join(', ');
  return {
    name: 'Trazabilidad 360° (RTM Inversa)',
    status: 'FAILED',
    message: `${res.orphanCount} requerimiento(s) huérfano(s) (${orphanIds})`,
    remediation: 'Conecta los requisitos huérfanos con sus componentes en arc42 o suites de pruebas.',
  };
}

export function auditGovernanceGate(rootDir: string): PreflightGateSummary {
  const res = verifyTasksGovernance({ rootDir });
  if (res.success) {
    return {
      name: 'Gobierno de Tareas y Clasificación de Autonomía',
      status: 'PASSED',
      message: `${res.totalTasks} tareas auditadas y conformes con modos de autonomía`,
    };
  }
  return {
    name: 'Gobierno de Tareas y Clasificación de Autonomía',
    status: 'FAILED',
    message: `${res.violations.length} infracción(es) de gobierno detectadas`,
    remediation: 'Revisa tasks.md para asignar criterios verificables y modos de autonomía válidos.',
  };
}

export function auditTestingGate(rootDir: string): PreflightGateSummary {
  const res = verifyTestingCoverage({ rootDir });
  if (res.success) {
    return {
      name: 'Cobertura de Pruebas en Requisitos y Tareas',
      status: 'PASSED',
      message: `${res.passedRequirements}/${res.totalRequirements} reqs y ${res.passedTasks}/${res.totalTasks} tareas verificadas`,
    };
  }
  return {
    name: 'Cobertura de Pruebas en Requisitos y Tareas',
    status: 'FAILED',
    message: `${res.failedRequirements} req(s) y ${res.failedTasks} tarea(s) sin pruebas verificables`,
    remediation: 'Añade pruebas ejecutables (.spec o .feature) para los requerimientos y tareas pendientes.',
  };
}

export function auditLicensesGate(rootDir: string): PreflightGateSummary {
  const res = verifyLicenses({ rootDir });
  if (res.success) {
    return {
      name: 'Gobernanza de Licencias Open Source',
      status: 'PASSED',
      message: `${res.permittedCount} dependencias conformes con license-policy.yaml`,
    };
  }
  const badPkgs = res.violations.map((v) => `${v.packageName} (${v.license})`).slice(0, 2).join(', ');
  return {
    name: 'Gobernanza de Licencias Open Source',
    status: 'FAILED',
    message: `${res.violations.length} licencia(s) prohibida(s) detectada(s): ${badPkgs}`,
    remediation: 'Reemplaza los paquetes con licencias restringidas o solicita aprobación en license-policy.yaml.',
  };
}

export function auditSchemasGate(rootDir: string): PreflightGateSummary {
  const res = verifyArtifactsSchemas({ rootDir });
  if (res.success) {
    return {
      name: 'Conformidad con Esquemas JSON (Draft 2020-12)',
      status: 'PASSED',
      message: `${res.validCount}/${res.totalEvaluated} artefactos conformes con sus esquemas`,
    };
  }
  const firstViolation = res.violations[0]?.message || 'Estructura inválida';
  return {
    name: 'Conformidad con Esquemas JSON (Draft 2020-12)',
    status: 'FAILED',
    message: `${res.invalidCount} artefacto(s) no cumplen el esquema JSON: ${firstViolation}`,
    remediation: "Ejecuta 'aisdlc verify schemas' para auditar y subsana los campos obligatorios.",
  };
}

export function renderDashboard(
  gates: PreflightGateSummary[],
  autoFixExecuted: boolean,
  gherkinCount: number,
  digestsCount: number
): void {
  console.log(pc.bold(pc.cyan('\n==============================================================================')));
  console.log(pc.bold(pc.cyan('             AI-SDLC: DASHBOARD CONSOLIDADO DE PRE-VUELO (aisdlc check)       ')));
  console.log(pc.bold(pc.cyan('==============================================================================\n')));

  if (autoFixExecuted) {
    console.log(pc.bold(`  ${pc.magenta('MODO AUTO-FIX ACTIVO:')} Se aplicaron sincronizaciones previas no destructivas:`));
    console.log(`    - Escenarios Gherkin sincronizados: ${pc.bold(String(gherkinCount))}`);
    console.log(`    - Digests SHA-256 sincronizados:    ${pc.bold(String(digestsCount))}\n`);
  }

  for (const gate of gates) {
    const badge =
      gate.status === 'PASSED'
        ? pc.green('✔ PASSED    ')
        : gate.status === 'FIXED'
          ? pc.cyan('🔧 AUTO-FIX ')
          : pc.red('✖ FAILED    ');

    console.log(`  [${badge}] ${pc.bold(gate.name)}`);
    console.log(`               ${pc.dim(gate.message)}`);
  }

  const failedGates = gates.filter((g) => g.status === 'FAILED');
  if (failedGates.length > 0) {
    console.log(pc.bold(pc.red('\n------------------------------------------------------------------------------')));
    console.log(pc.bold(pc.red('  ACCIONES REQUERIDAS PARA SUBSANAR ERRORES BLOQUEANTES:')));
    console.log(pc.bold(pc.red('------------------------------------------------------------------------------')));
    failedGates.forEach((g, idx) => {
      console.log(`  ${pc.bold(String(idx + 1))}. ${pc.yellow(g.name)}:`);
      console.log(`     👉 ${pc.bold(g.remediation || 'Revisa los archivos afectados.')}`);
    });
    console.log(pc.bold(pc.red('\n⛔ VEREDICTO: PRE-VUELO BLOQUEADO (EXIT 1)\n')));
  } else {
    console.log(pc.bold(pc.green('\n==============================================================================')));
    console.log(pc.bold(pc.green('✨ VEREDICTO: PRE-VUELO APROBADO (EXIT 0) - Repositorio listo para Pull Request')));
    console.log(pc.bold(pc.green('==============================================================================\n')));
  }
}

export function executePreflightCheck(options: PreflightCheckOptions = {}): PreflightCheckResult {
  const rootDir = options.root || process.cwd();
  let gherkinCount = 0;
  let digestsCount = 0;

  if (options.fix) {
    const fixResult = runAutoFix(rootDir, options.silent);
    gherkinCount = fixResult.gherkinCount;
    digestsCount = fixResult.digestsCount;
  }

  const gates: PreflightGateSummary[] = [
    auditGherkinGate(rootDir, options.fix === true && gherkinCount > 0),
    auditPdacGate(rootDir, options.fix === true && digestsCount > 0),
    auditQualityGate(rootDir),
    auditTraceabilityGate(rootDir),
    auditGovernanceGate(rootDir),
    auditTestingGate(rootDir),
    auditLicensesGate(rootDir),
    auditSchemasGate(rootDir),
  ];

  const success = gates.every((g) => g.status === 'PASSED' || g.status === 'FIXED');

  if (!options.silent) {
    renderDashboard(gates, Boolean(options.fix), gherkinCount, digestsCount);
  }

  return {
    success,
    autoFixExecuted: Boolean(options.fix),
    gherkinSynced: gherkinCount,
    digestsSynced: digestsCount,
    gates,
  };
}

export function runCheck(options: PreflightCheckOptions = {}): boolean {
  const result = executePreflightCheck(options);
  return result.success;
}
