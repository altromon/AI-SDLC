/**
 * AI-SDLC Native MCP Server Tools
 * Full catalog of SDD scaffolding, verification, reporting, and governance tools.
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  aggregatePrKpis,
  aggregateReleaseKpis,
  checkGherkinInSync,
  depositProductHandoffSidecar,
  detectAuthorIdentity,
  extractGherkinFeatures,
  generateDashboardReport,
  generateQualityReport,
  initProject,
  integrateSddChange,
  ProductHandoff,
  scaffoldSddChange,
  syncPdacDigests,
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
  writeReleaseKpiReport,
} from '@ai-sdlc/core';

export interface RegisterToolsOptions {
  rootDir?: string;
}

function resolveRoot(customRoot?: string, defaultRoot?: string): string {
  return customRoot ? path.resolve(customRoot) : defaultRoot || process.cwd();
}

function formatResponse(data: unknown, isError = false) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

export function registerAllTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const baseRoot = options.rootDir || process.cwd();

  // ============================================================================
  // 1. HERRAMIENTAS RESUMEN (Summary Tools)
  // ============================================================================

  // Tool: new (Inicializar nuevo proyecto o configurar repo existente)
  server.tool(
    'new',
    'Inicializa un nuevo proyecto o configura la estructura y gobernanza AI-SDLC en un repositorio existente (políticas, plantillas, hooks y CI opcional).',
    {
      targetDir: z
        .string()
        .optional()
        .describe("Directorio objetivo donde inicializar la estructura AI-SDLC (por defecto '.')"),
      ci: z
        .enum(['github', 'gitlab', 'azure', 'bitbucket'])
        .optional()
        .describe('Proveedor de CI/CD para el que generar workflows y pipelines'),
      dryRun: z
        .boolean()
        .optional()
        .describe('Si es true, simula la creación sin escribir archivos en disco'),
      agents: z
        .string()
        .optional()
        .describe('Entornos de agentes de IA a configurar (ej. "all", "cursor", "claude", "antigravity", "copilot", "mcp")'),
      architecture: z
        .enum(['minimal', 'full', 'complete', 'none'])
        .optional()
        .describe('Nivel de granularidad de plantillas de arquitectura ("minimal" para CMP y ADR, "full" para 12 secciones arc42/NAF, "none" para omitir)'),
    },
    async (params) => {
      try {
        const result = initProject({
          rootDir: baseRoot,
          targetDir: params.targetDir,
          ci: params.ci,
          agents: params.agents,
          architecture: params.architecture,
          dryRun: params.dryRun,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify (Ejecución consolidada de todos los Quality Gates)
  server.tool(
    'verify',
    'Ejecuta de forma consolidada la totalidad de los 9 Quality Gates deterministas de AI-SDLC y devuelve el estado integral del repositorio.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto (opcional)'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const qg = verifyQualityGate({ rootDir: root });
        const tr = verifyTraceability({ rootDir: root });
        const gv = verifyTasksGovernance({ rootDir: root });
        const tc = verifyTestingCoverage({ rootDir: root });
        const lc = verifyLicenses({ rootDir: root });
        const pd = verifyPdacGraph({ rootDir: root });
        const sc = verifyArtifactsSchemas({ rootDir: root });
        const dp = verifyArtifactDuplicates({ rootDir: root });
        const sec = verifySecrets({ rootDir: root });
        const sast = verifySast({ rootDir: root });

        const gates = [
          { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} funciones conformes` },
          { name: 'traceability', success: tr.success, summary: `${tr.orphanCount} requerimientos huérfanos` },
          { name: 'governance', success: gv.success, summary: `${gv.totalTasks} tareas auditadas` },
          { name: 'testing', success: tc.success, summary: `${tc.passedRequirements}/${tc.totalRequirements} reqs cubiertos` },
          { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} dependencias analizadas` },
          { name: 'pdac', success: pd.success, summary: `${pd.totalNodes} nodos alineados` },
          { name: 'schemas', success: sc.success, summary: `${sc.validCount}/${sc.totalEvaluated} artefactos válidos` },
          { name: 'duplicates', success: dp.success, summary: `${dp.errorCount} errores, ${dp.warningCount} avisos` },
          { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secretos, ${sast.violationsCount} SAST` },
        ];

        const allPassed = gates.every((g) => g.success);
        return formatResponse({
          success: allPassed,
          exitCode: allPassed ? 0 : (!sec.success ? 4 : 1),
          totalGates: gates.length,
          passedGates: gates.filter((g) => g.success).length,
          failedGates: gates.filter((g) => !g.success).length,
          gates,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: report (Generar todos los informes a la vez)
  server.tool(
    'report',
    'Genera de forma combinada todos los informes de AI-SDLC: dashboard web interactivo con grafo PDaC (HTML) e informe formal de calidad (Markdown).',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
      dashboardOutput: z
        .string()
        .optional()
        .describe("Ruta de salida para dashboard HTML (por defecto 'reports/dashboard.html')"),
      qualityPolicy: z.string().optional().describe('Ruta a quality-policy.yaml'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const dashRes = generateDashboardReport({
          rootDir: root,
          outputPath: params.dashboardOutput,
        });
        const qualRes = generateQualityReport({
          rootDir: root,
          policyPath: params.qualityPolicy,
        });

        return formatResponse({
          success: true,
          dashboard: {
            outputPath: dashRes.outputPath,
            totalNodes: dashRes.totalNodes,
            totalEdges: dashRes.totalEdges,
          },
          qualityReport: {
            totalFiles: qualRes.totalFiles,
            totalFunctions: qualRes.totalFunctions,
            avgMaintainability: qualRes.avgMaintainability,
            avgCyclomatic: qualRes.avgCyclomatic,
            verdict: qualRes.verdict,
          },
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 2. HERRAMIENTAS SDD (Scaffolding, Sync, Integration)
  // ============================================================================

  // Tool: sdd_change_new
  server.tool(
    'sdd_change_new',
    'Crea el andamiaje determinista completo de un nuevo cambio SDD (proposal, spec, design, tasks, handoff.yaml).',
    {
      name: z.string().describe('Nombre descriptivo del incremento o feature SDD'),
      id: z.string().optional().describe('Identificador explícito del cambio (ej. chg-002-mi-cambio)'),
      profile: z.enum(['patch', 'standard', 'critical']).optional().describe('Perfil de riesgo del cambio'),
      framework: z.enum(['openspec', 'speckit']).optional().describe('Framework SDD adoptado'),
      author: z.string().optional().describe('Nombre del autor o agente de desarrollo'),
      from: z.array(z.string()).optional().describe('Identificadores de requisitos existentes a citar'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = scaffoldSddChange({
          rootDir: root,
          name: params.name,
          changeId: params.id,
          profile: params.profile,
          framework: params.framework,
          author: params.author,
          from: params.from,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_check_fix
  server.tool(
    'sdd_check_fix',
    'Sincroniza deterministamente escenarios Gherkin a archivos .feature y actualiza digests SHA-256 PDaC sin alterar el código fuente.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const gherkinRes = extractGherkinFeatures({ rootDir: root });
        const pdacRes = syncPdacDigests({ rootDir: root });
        const gherkinSync = checkGherkinInSync({ rootDir: root });
        const pdacVerify = verifyPdacGraph({ rootDir: root });

        return formatResponse({
          success: gherkinSync.inSync && pdacVerify.success,
          extractedFeaturesCount: gherkinRes.features.length,
          totalScenarios: gherkinRes.totalScenarios,
          syncedDigestsCount: pdacRes.syncedCount,
          updatedFiles: pdacRes.updatedFiles,
          gherkinInSync: gherkinSync.inSync,
          pdacInSync: pdacVerify.success,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_deposit
  server.tool(
    'sdd_deposit',
    'Deposita o regenera el sidecar canónico de acompañamiento handoff.yaml (HOF-*) en un cambio SDD activo.',
    {
      change: z.string().describe('Identificador del cambio activo (ej. chg-001-telemetry)'),
      title: z.string().optional().describe('Título formal del handoff PDaC'),
      framework: z.enum(['openspec', 'speckit']).optional().describe('Framework SDD'),
      requirements: z.array(z.string()).optional().describe('Lista de IDs de requerimientos funcionales'),
      useCases: z.array(z.string()).optional().describe('Lista de IDs de casos de uso'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const handoff: ProductHandoff = {
          id: `HOF-${params.change.toUpperCase()}`,
          type: 'handoff',
          title: params.title || `Handoff PDaC para ${params.change}`,
          changeId: params.change,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          subgraph: {
            requirements: params.requirements || ['FR-001'],
            useCases: params.useCases || ['UC-001'],
          },
        };

        const depositedPath = depositProductHandoffSidecar({
          rootDir: root,
          changeId: params.change,
          framework: params.framework || 'openspec',
          handoff,
        });

        return formatResponse({
          success: true,
          depositedPath,
          handoffId: handoff.id,
          changeId: params.change,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_integrate
  server.tool(
    'sdd_integrate',
    'Integra y promueve un cambio SDD completado a la línea base canónica y archiva su directorio a completed/.',
    {
      change: z.string().optional().describe('Identificador del cambio a integrar'),
      auto: z.boolean().optional().describe('Detectar automáticamente el cambio activo completado'),
      author: z.string().optional().describe('Autor de la integración'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = integrateSddChange({
          rootDir: root,
          changeId: params.change || '',
          author: params.author,
          autoArchive: true,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: get_active_handoff
  server.tool(
    'get_active_handoff',
    'Consulta en memoria el subgrafo PDaC y el contenido de un cambio activo para inyección quirúrgica de contexto en el agente.',
    {
      change: z.string().describe('Identificador del cambio SDD activo (ej. chg-028-native-mcp-server)'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const activeDir = path.join(root, 'specs', 'changes', 'active', params.change);
        const completedDir = path.join(root, 'specs', 'changes', 'completed', params.change);
        const targetDir = fs.existsSync(activeDir) ? activeDir : completedDir;

        if (!fs.existsSync(targetDir)) {
          return formatResponse(
            { success: false, error: `No se encontró el cambio SDD '${params.change}'.` },
            true
          );
        }

        const files = ['handoff.yaml', 'proposal.md', 'spec.md', 'design.md', 'tasks.md'];
        const contents: Record<string, string> = {};
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          if (fs.existsSync(filePath)) {
            contents[file] = fs.readFileSync(filePath, 'utf-8');
          }
        }

        return formatResponse({
          success: true,
          changeId: params.change,
          directory: targetDir,
          isCompleted: !fs.existsSync(activeDir),
          files: contents,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 3. HERRAMIENTAS DE VERIFICACIÓN INDIVIDUAL (Granular Verification)
  // ============================================================================

  // Tool: verify_quality
  server.tool(
    'verify_quality',
    'Evalúa la complejidad ciclomática, cognitiva, mantenibilidad y longitud de funciones frente a quality-policy.yaml.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
      maxCyclomatic: z.number().optional().describe('Umbral máximo CC (por defecto de policy)'),
      maxCognitive: z.number().optional().describe('Umbral máximo complejidad cognitiva'),
      minMaintainability: z.number().optional().describe('Umbral mínimo MI'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyQualityGate({
          rootDir: root,
          thresholds: {
            max_cyclomatic: params.maxCyclomatic,
            max_cognitive: params.maxCognitive,
            min_maintainability: params.minMaintainability,
          },
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_schemas
  server.tool(
    'verify_schemas',
    'Valida los artefactos Markdown de especificación frente a los JSON Schemas canónicos (Draft 2020-12).',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyArtifactsSchemas({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_security
  server.tool(
    'verify_security',
    'Ejecuta escaneo determinista de secretos (Gitleaks) y análisis estático SAST (inyección de comandos, SQLi, SSRF).',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
      minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']).optional().describe('Severidad mínima SAST'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const secRes = verifySecrets({ rootDir: root });
        const sastRes = verifySast({ rootDir: root, minSeverity: params.minSeverity as any });
        const success = secRes.success && sastRes.success;

        return formatResponse(
          {
            success,
            exitCode: success ? 0 : (!secRes.success ? 4 : 1),
            secrets: {
              success: secRes.success,
              findingsCount: secRes.findingsCount,
              findings: secRes.findings,
            },
            sast: {
              success: sastRes.success,
              violationsCount: sastRes.violationsCount,
              violations: sastRes.violations,
            },
          },
          !success
        );
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_traceability
  server.tool(
    'verify_traceability',
    'Audita la matriz de trazabilidad 360° inversa (Upstream PDaC, Midstream arc42, Downstream BDD/tests).',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTraceability({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_governance
  server.tool(
    'verify_governance',
    'Audita el cumplimiento del gobierno de tareas y modos de autonomía humana (AUTONOMOUS, HUMAN_REVIEW_PLAN, etc.).',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTasksGovernance({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_testing
  server.tool(
    'verify_testing',
    'Audita que el 100% de los requisitos y tareas cuentan con pruebas verificables en disco.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTestingCoverage({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_licenses
  server.tool(
    'verify_licenses',
    'Audita el cumplimiento de licencias Open Source frente a license-policy.yaml.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
      policy: z.string().optional().describe('Ruta a license-policy.yaml'),
      depth: z.enum(['direct', 'transitive']).optional().describe('Profundidad de escaneo'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyLicenses({
          rootDir: root,
          policyPath: params.policy,
          depth: params.depth || 'transitive',
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_duplicates
  server.tool(
    'verify_duplicates',
    'Audita colisiones de identificadores, enunciados normativos redundantes y solapamientos de especificaciones.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyArtifactDuplicates({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_friction
  server.tool(
    'verify_friction',
    'Evalúa las reglas de fricción progresiva y guardrails anti-bypass (impide que cambios con perfil patch modifiquen rutas protegidas de seguridad, esquemas o arquitectura).',
    {
      change: z.string().optional().describe('Identificador del cambio SDD activo o ruta de spec (opcional)'),
      diffFiles: z.array(z.string()).optional().describe('Lista opcional de rutas de archivos modificados a auditar frente a guardrails'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyProgressiveFriction({
          rootDir: root,
          changeId: params.change,
          diffFiles: params.diffFiles,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_pdac
  server.tool(
    'verify_pdac',
    'Audita el grafo de producto (Product Definition as Code) y verifica de forma determinista la ausencia de derivas criptográficas (digests SHA-256) en citaciones.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
      autoSync: z.boolean().optional().describe('Si es true, sincroniza y recalcula automáticamente los digests desfasados en disco'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        if (params.autoSync) {
          const syncResult = syncPdacDigests({ rootDir: root });
          return formatResponse(syncResult, !syncResult.success);
        }
        const result = verifyPdacGraph({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 4. HERRAMIENTAS DE REPORTING Y TELEMETRÍA (Reports & Telemetry)
  // ============================================================================

  // Tool: report_dashboard
  server.tool(
    'report_dashboard',
    'Genera el dashboard web interactivo y grafo Cytoscape.js de la matriz RTM / PDaC en reports/dashboard.html.',
    {
      output: z.string().optional().describe('Ruta del archivo HTML de salida'),
      title: z.string().optional().describe('Título del dashboard web'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateDashboardReport({
          rootDir: root,
          outputPath: params.output,
          title: params.title,
        });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: report_quality
  server.tool(
    'report_quality',
    'Genera el informe formal políglota de calidad de código en reports/QUALITY_REPORT.md.',
    {
      policy: z.string().optional().describe('Ruta a quality-policy.yaml'),
      mode: z.enum(['STRICT', 'PERMISSIVE']).optional().describe('Modo de cumplimiento'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateQualityReport({
          rootDir: root,
          policyPath: params.policy,
          thresholds: params.mode ? { enforce_mode: params.mode } : undefined,
        });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: kpi_pr
  server.tool(
    'kpi_pr',
    'Calcula la agregación de KPIs y telemetría de commits (humano vs. agentes) para un Pull Request.',
    {
      base: z.string().optional().describe('Rama base de comparación (por defecto main)'),
      head: z.string().optional().describe('Rama origen o HEAD (por defecto HEAD)'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = aggregatePrKpis(params.base || 'main', params.head || 'HEAD', { cwd: root });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: kpi_release
  server.tool(
    'kpi_release',
    'Calcula el informe consolidado de KPIs de Release (Defect Injection Rate, ratio de retrabajo, volumen KLoC, tiempos y costes de tokens entre humano y modelos de IA).',
    {
      release: z.string().describe('Nombre de la rama de release a auditar (ej. release/v1.0.0)'),
      base: z.string().optional().describe('Rama base de comparación (por defecto main)'),
      outputDir: z.string().optional().describe('Directorio opcional donde generar los informes Markdown y JSON'),
      writeReports: z.boolean().optional().describe('Si es true, genera los archivos de reporte en disco'),
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const report = aggregateReleaseKpis(params.release, params.base || 'main', { cwd: root });
        let filesWritten: { markdownPath: string; jsonPath: string } | undefined;
        if (params.writeReports || params.outputDir) {
          filesWritten = writeReleaseKpiReport(report, { outputDir: params.outputDir });
        }
        return formatResponse({
          ...report,
          filesWritten,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: git_detect_author
  server.tool(
    'git_detect_author',
    'Detecta de forma universal e independiente de IDE si el autor actual es humano o un agente de IA.',
    {
      root: z.string().optional().describe('Directorio raíz del proyecto'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = detectAuthorIdentity({ cwd: root });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );
}
