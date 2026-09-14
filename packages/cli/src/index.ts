/**
 * @ai-sdlc/cli
 * Command Line Interface for AI-SDLC Quality Gates and Governance
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { runGherkinExtract } from './commands/gherkin.js';
import { runGitPlan, runGitValidate } from './commands/git.js';
import { runInit } from './commands/init.js';
import { runReportQuality } from './commands/report.js';
import {
  runVerifyAll,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifyTesting,
  runVerifyTraceability,
} from './commands/verify.js';

const program = new Command();

program
  .name('aisdlc')
  .description('AI-SDLC: Spec-Driven Development, Governance & Quality Gates for AI & Humans')
  .version('1.0.0');

// --- verify command suite ---
const verifyCommand = program
  .command('verify')
  .description('Ejecuta verificadores deterministas de calidad, trazabilidad, gobierno y licencias');

verifyCommand
  .command('all', { isDefault: true })
  .description('Ejecuta la suite completa de calidad y gobierno (Quality Gate + RTM + Tasks + Tests + Licenses + PDaC)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --policy <path>', 'Ruta a quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Umbral máximo de Complejidad Ciclomática')
  .option('-K, --max-cognitive <number>', 'Umbral máximo de Complejidad Cognitiva')
  .option('-M, --min-maintainability <number>', 'Umbral mínimo de Mantenibilidad (0-100)')
  .option('-L, --max-lines <number>', 'Umbral máximo de líneas por función')
  .option('-m, --mode <mode>', 'Modo de cumplimiento: STRICT o PERMISSIVE')
  .action((opts) => {
    const passed = runVerifyAll({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('quality')
  .description('Release Gate de Calidad (Complejidad Ciclomática <= 10, Mantenibilidad >= 50)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --policy <path>', 'Ruta a quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Umbral máximo de Complejidad Ciclomática')
  .option('-K, --max-cognitive <number>', 'Umbral máximo de Complejidad Cognitiva')
  .option('-M, --min-maintainability <number>', 'Umbral mínimo de Mantenibilidad (0-100)')
  .option('-L, --max-lines <number>', 'Umbral máximo de líneas por función')
  .option('-m, --mode <mode>', 'Modo de cumplimiento: STRICT o PERMISSIVE')
  .action((opts) => {
    const passed = runVerifyQuality({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('traceability')
  .description('Audita la Matriz de Trazabilidad 360° (Producto -> Arquitectura -> Pruebas)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((opts) => {
    const passed = runVerifyTraceability({ root: opts.root });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('governance')
  .description('Audita el gobierno de tareas y modos de autonomía humana (AUTONOMOUS, HUMAN_REVIEW_PLAN, etc.)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((opts) => {
    const passed = runVerifyGovernance({ root: opts.root });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('testing')
  .description('Audita que el 100% de requisitos y tareas cuentan con pruebas verificables')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((opts) => {
    const passed = runVerifyTesting({ root: opts.root });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('licenses')
  .description('Verifica el cumplimiento de licencias OSS frente a license-policy.yaml')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --policy <path>', 'Ruta a license-policy.yaml')
  .option('-m, --manifest <path>', 'Ruta a license-manifest.yaml')
  .action((opts) => {
    const passed = runVerifyLicenses({ root: opts.root, policy: opts.policy, manifest: opts.manifest });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('pdac')
  .description('Verifica el grafo PDaC y evalúa derivas criptográficas de citaciones SHA-256')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((opts) => {
    const passed = runVerifyPdac({ root: opts.root });
    process.exit(passed ? 0 : 1);
  });

// --- report command suite ---
const reportCommand = program
  .command('report')
  .description('Genera informes formales de métricas en formato Markdown');

reportCommand
  .command('quality')
  .description('Genera el informe formal políglota de calidad de código (reports/QUALITY_REPORT.md)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --policy <path>', 'Ruta a quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Umbral máximo de Complejidad Ciclomática')
  .option('-K, --max-cognitive <number>', 'Umbral máximo de Complejidad Cognitiva')
  .option('-M, --min-maintainability <number>', 'Umbral mínimo de Mantenibilidad (0-100)')
  .option('-L, --max-lines <number>', 'Umbral máximo de líneas por función')
  .option('-m, --mode <mode>', 'Modo de cumplimiento: STRICT o PERMISSIVE')
  .action((opts) => {
    const passed = runReportQuality({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
    });
    process.exit(passed ? 0 : 1);
  });

// --- gherkin command suite ---
const gherkinCommand = program
  .command('gherkin')
  .description('Herramientas de sincronización y extracción BDD / Gherkin');

gherkinCommand
  .command('extract')
  .description('Extrae bloques ```gherkin``` de especificaciones Markdown a archivos .feature')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --path <path>', 'Archivo Markdown o directorio objetivo')
  .option('-a, --all', 'Procesa todas las especificaciones y requerimientos')
  .action((opts) => {
    runGherkinExtract({ root: opts.root, path: opts.path, all: opts.all });
    process.exit(0);
  });

// --- git command suite ---
const gitCommand = program
  .command('git')
  .description('Herramientas del modelo jerárquico de ramas Git de 4 tiers');

gitCommand
  .command('validate <branch>')
  .description('Valida la nomenclatura y jerarquía de una rama Git (Tier 1 a 4)')
  .action((branch) => {
    const passed = runGitValidate(branch);
    process.exit(passed ? 0 : 1);
  });

gitCommand
  .command('plan')
  .description('Planifica la jerarquía de ramas Git de 4 tiers para una versión y feature')
  .option('-r, --release <version>', 'Versión del release (ej. v1.1.0)', 'v1.1.0')
  .option('-f, --feature <feature>', 'Identificador de la feature (ej. CHG-001-telemetry)', 'CHG-001-telemetry')
  .option('-t, --tasks <tasks>', 'Lista de tareas separadas por comas (ej. TSK-001,TSK-002)', 'TSK-001,TSK-002')
  .action((opts) => {
    runGitPlan({ version: opts.release, feature: opts.feature, tasks: opts.tasks });
    process.exit(0);
  });

// --- init command ---
program
  .command('init [directory]')
  .description('Inicializa un nuevo repositorio con las directrices, esquemas y políticas de AI-SDLC')
  .option('-d, --dry-run', 'Simula la creación de archivos y directorios sin escribir en disco')
  .action((directory, opts) => {
    runInit(directory, { dryRun: opts.dryRun });
    process.exit(0);
  });

// Handle unknown commands gracefully
program.on('command:*', () => {
  console.error(pc.red(`\n[ERROR] Comando no reconocido: ${program.args.join(' ')}`));
  console.log(pc.yellow('Ejecuta `aisdlc --help` para ver los comandos disponibles.\n'));
  process.exit(1);
});

program.parse(process.argv);
