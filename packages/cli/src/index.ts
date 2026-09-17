/**
 * @ai-sdlc/cli
 * Command Line Interface for AI-SDLC Quality Gates and Governance
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { runCheck } from './commands/check.js';
import { runGherkinExtract } from './commands/gherkin.js';
import { runGitCheckout, runGitPlan, runGitValidate } from './commands/git.js';
import { runInit } from './commands/init.js';
import { runReportQuality } from './commands/report.js';
import { runChangeNew, runSddDeposit, runSddIntegrate, runSddVerify } from './commands/sdd.js';
import {
  runVerifyAll,
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifySast,
  runVerifySchemas,
  runVerifySecrets,
  runVerifySecurity,
  runVerifyTesting,
  runVerifyTraceability,
} from './commands/verify.js';

const program = new Command();

program
  .name('aisdlc')
  .description('AI-SDLC: Spec-Driven Development, Governance & Quality Gates for AI & Humans')
  .version('1.0.0');

// --- check command (unified pre-flight with auto-fix) ---
program
  .command('check')
  .description('Comando unificado de pre-vuelo: valida Quality Gates con auto-fix no destructivo opcional')
  .option('--fix', 'Sincroniza automáticamente escenarios Gherkin (.feature) y digests criptográficos de citaciones PDaC')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((opts) => {
    const passed = runCheck({
      fix: opts.fix,
      root: opts.root,
    });
    process.exit(passed ? 0 : 1);
  });

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
  .description('Verifica el cumplimiento de licencias OSS frente a license-policy.yaml (SCA dinámico y SBOM)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --policy <path>', 'Ruta a license-policy.yaml')
  .option('-m, --manifest <path>', 'Ruta a license-manifest.yaml')
  .option('--no-dynamic', 'Desactiva el escaneo dinámico y exige archivo de manifiesto estático')
  .option('--sbom [path]', 'Genera archivo SBOM en formato estándar CycloneDX 1.5 JSON')
  .option('--notices [path]', 'Genera archivo de avisos y atribuciones legales THIRD_PARTY_NOTICES.md')
  .option('--tool <tool>', 'Herramienta SCA: native, trivy, syft', 'native')
  .option('--depth <depth>', 'Profundidad de análisis: direct o transitive', 'transitive')
  .action((opts) => {
    const passed = runVerifyLicenses({
      root: opts.root,
      policy: opts.policy,
      manifest: opts.manifest,
      dynamic: opts.dynamic,
      tool: opts.tool,
      depth: opts.depth,
      sbom: opts.sbom,
      notices: opts.notices,
    });
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

verifyCommand
  .command('schemas')
  .description('Verifica la conformidad de los artefactos Markdown frente a sus esquemas JSON canónicos (Draft 2020-12)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-p, --path <path>', 'Ruta al archivo o directorio objetivo')
  .action((opts) => {
    const passed = runVerifySchemas({ root: opts.root, path: opts.path });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('duplicates')
  .description('Audita requisitos duplicados, colisiones de IDs, redundancia léxica y solapamientos BDD')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-s, --similarity <number>', 'Umbral de similitud léxica para títulos (0.0 a 1.0)', '0.85')
  .action((opts) => {
    const passed = runVerifyDuplicates({ root: opts.root, similarity: opts.similarity });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('security')
  .description('Verificación unificada de seguridad: detección determinista de secretos (Gitleaks) y SAST shift-left')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-d, --diff', 'Escanea únicamente las líneas añadidas en el diff git de la rama actual')
  .option('-b, --base <branch>', 'Rama base para el cálculo del diff git (por defecto: origin/main o HEAD)')
  .option('-g, --gitleaks', 'Delega o contrasta con el binario nativo de Gitleaks si está disponible')
  .option('-s, --semgrep', 'Delega en el CLI de Semgrep si está instalado')
  .option('-e, --entropy <number>', 'Umbral mínimo de entropía de Shannon (0.0 a 8.0)', '4.3')
  .option('-m, --min-severity <level>', 'Severidad mínima para fallo SAST: CRITICAL, HIGH, MEDIUM', 'HIGH')
  .action((opts) => {
    const passed = runVerifySecurity({
      root: opts.root,
      diff: opts.diff,
      base: opts.base,
      gitleaks: opts.gitleaks,
      semgrep: opts.semgrep,
      entropy: opts.entropy,
      minSeverity: opts.minSeverity,
    });
    process.exit(passed ? 0 : 4);
  });

verifyCommand
  .command('secrets')
  .description('Verifica la ausencia de credenciales, API keys y certificados expuestos (Gitleaks Gate)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-d, --diff', 'Escanea únicamente las líneas añadidas en el diff git de la rama actual')
  .option('-b, --base <branch>', 'Rama base para el cálculo del diff git (por defecto: origin/main o HEAD)')
  .option('-g, --gitleaks', 'Delega o contrasta con el binario nativo de Gitleaks si está disponible')
  .option('-e, --entropy <number>', 'Umbral mínimo de entropía de Shannon (0.0 a 8.0)', '4.3')
  .action((opts) => {
    const passed = runVerifySecrets({
      root: opts.root,
      diff: opts.diff,
      base: opts.base,
      gitleaks: opts.gitleaks,
      entropy: opts.entropy,
    });
    process.exit(passed ? 0 : 4);
  });

verifyCommand
  .command('sast')
  .description('Análisis estático de seguridad (SAST) shift-left para patrones críticos (SQLi, exec, SSRF)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-s, --semgrep', 'Delega en el CLI de Semgrep si está instalado')
  .option('-m, --min-severity <level>', 'Severidad mínima para fallo: CRITICAL, HIGH, MEDIUM', 'HIGH')
  .action((opts) => {
    const passed = runVerifySast({
      root: opts.root,
      semgrep: opts.semgrep,
      minSeverity: opts.minSeverity,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('friction [change]')
  .description('Verifica la fricción progresiva y las protecciones Anti-Bypass para parches rápidos')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((change, opts) => {
    const passed = runVerifyFriction({ root: opts.root, change });
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

gitCommand
  .command('checkout <task>')
  .description('Navega y crea automáticamente ramas en cascada de 4 tiers para una tarea')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .action((task, opts) => {
    const passed = runGitCheckout(task, { root: opts.root });
    process.exit(passed ? 0 : 1);
  });


// --- change command suite ---
const changeCommand = program
  .command('change')
  .description('Gestión del ciclo de vida y andamiaje de cambios SDD');

changeCommand
  .command('new <name>')
  .description('Crea el andamiaje completo de un nuevo cambio SDD (proposal, spec, design, tasks, handoff.yaml)')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('--from <ids...>', 'Identificador o lista de identificadores a citar (UC-*, FR-*, etc.)')
  .option('--id <changeId>', 'Identificador explícito para el cambio (ej. chg-002-mi-cambio)')
  .option('-p, --profile <profile>', 'Perfil de riesgo del cambio: patch, standard o critical', 'standard')
  .option('-f, --framework <framework>', 'Framework SDD: openspec o speckit', 'openspec')
  .option('-a, --author <author>', 'Nombre del autor o agente desarrollador')
  .action((name, opts) => {
    const passed = runChangeNew({
      root: opts.root,
      name,
      from: opts.from,
      id: opts.id,
      profile: opts.profile,
      framework: opts.framework,
      author: opts.author,
    });
    process.exit(passed ? 0 : 1);
  });

// --- sdd command suite ---
const sddCommand = program
  .command('sdd')
  .description('Herramientas de integración con ecosistemas SDD (OpenSpec y Spec Kit)');

sddCommand
  .command('new <name>')
  .description('Alias de `aisdlc change new`: crea el andamiaje completo de un nuevo cambio SDD')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('--from <ids...>', 'Identificador o lista de identificadores a citar (UC-*, FR-*, etc.)')
  .option('--id <changeId>', 'Identificador explícito para el cambio (ej. chg-002-mi-cambio)')
  .option('-p, --profile <profile>', 'Perfil de riesgo del cambio: patch, standard o critical', 'standard')
  .option('-f, --framework <framework>', 'Framework SDD: openspec o speckit', 'openspec')
  .option('-a, --author <author>', 'Nombre del autor o agente desarrollador')
  .action((name, opts) => {
    const passed = runChangeNew({
      root: opts.root,
      name,
      from: opts.from,
      id: opts.id,
      profile: opts.profile,
      framework: opts.framework,
      author: opts.author,
    });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('deposit')
  .description('Deposita un subgrafo de producto como archivo de acompañamiento (sidecar handoff.yaml)')
  .requiredOption('-c, --change <id>', 'Identificador del cambio (ej. chg-001-telemetry)')
  .option('-f, --framework <framework>', 'Framework SDD: openspec o speckit', 'openspec')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-t, --title <title>', 'Título del handoff PDaC')
  .option('--requirements <reqs>', 'Lista de IDs de requerimientos separados por comas')
  .option('--use-cases <ucs>', 'Lista de IDs de casos de uso separados por comas')
  .action((opts) => {
    const passed = runSddDeposit({
      root: opts.root,
      change: opts.change,
      framework: opts.framework,
      title: opts.title,
      requirements: opts.requirements,
      useCases: opts.useCases,
    });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('verify')
  .description('Valida la conformidad de los archivos de acompañamiento handoff.yaml (HOF-*) en los cambios')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-f, --framework <framework>', 'Framework SDD: openspec o speckit')
  .action((opts) => {
    const passed = runSddVerify({ root: opts.root, framework: opts.framework });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('integrate')
  .description('Integra y sincroniza los cambios SDD implementados en la especificación canónica (producto, requisitos y arquitectura)')
  .option('-c, --change <id>', 'Identificador del cambio (ej. chg-001-telemetry)')
  .option('--auto', 'Detecta automáticamente el cambio activo a integrar en base a la rama, PR o diff')
  .option('--head-ref <ref>', 'Rama origen para la resolución automática')
  .option('--pr-title <title>', 'Título del Pull Request para la resolución automática')
  .option('--pr-body <body>', 'Cuerpo del Pull Request para la resolución automática')
  .option('-r, --root <path>', 'Directorio raíz del proyecto')
  .option('-a, --author <author>', 'Nombre del autor o agente que realiza la integración')
  .option('--no-archive', 'No archivar el cambio a specs/changes/completed tras la integración')
  .action((opts) => {
    const passed = runSddIntegrate({
      root: opts.root,
      change: opts.change,
      auto: opts.auto,
      headRef: opts.headRef,
      prTitle: opts.prTitle,
      prBody: opts.prBody,
      author: opts.author,
      autoArchive: opts.archive !== false,
    });
    process.exit(passed ? 0 : 1);
  });

// --- init command ---
program
  .command('init [directory]')
  .description('Inicializa un nuevo repositorio con las directrices, esquemas y políticas de AI-SDLC')
  .option('-d, --dry-run', 'Simula la creación de archivos y directorios sin escribir en disco')
  .option('--ci <provider>', 'Proveedor de CI/CD para generar pipeline (github, gitlab, azure, bitbucket)')
  .action((directory, opts) => {
    const passed = runInit(directory, { dryRun: opts.dryRun, ci: opts.ci });
    process.exit(passed ? 0 : 1);
  });

// Handle unknown commands gracefully
program.on('command:*', () => {
  console.error(pc.red(`\n[ERROR] Comando no reconocido: ${program.args.join(' ')}`));
  console.log(pc.yellow('Ejecuta `aisdlc --help` para ver los comandos disponibles.\n'));
  process.exit(1);
});

program.parse(process.argv);
