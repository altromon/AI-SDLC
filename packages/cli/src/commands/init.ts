/**
 * CLI Handler: aisdlc init
 */

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';

const STARTER_QUALITY_POLICY = `# ==============================================================================
# AI-SDLC: Software Quality, Coding Rules & Release Gate Policy
# ==============================================================================
version: "1.0"
project: "Standard AI-SDLC Project"
enforcement_mode: "STRICT"

scope:
  target_directories:
    - "src"
    - "lib"
    - "examples"
    - "tests"
  supported_extensions:
    - ".ts"
    - ".js"
    - ".py"
    - ".java"
    - ".go"
    - ".cs"
    - ".rs"
    - ".cpp"
    - ".c"
  exclude_patterns:
    - "node_modules"
    - "__pycache__"
    - ".pytest_cache"
    - "target"
    - "bin"
    - "obj"
    - ".git"
    - "reports"
    - "dist"
    - ".changeset"

thresholds:
  cyclomatic_complexity:
    max_per_function: 10
  cognitive_complexity:
    max_per_function: 15
  maintainability_index:
    min_acceptable_score: 50.0
  function_length:
    max_function_lines: 40
`;

const STARTER_LICENSE_POLICY = `# ==============================================================================
# AI-SDLC: Open Source License Compliance & Governance Policy
# ==============================================================================
version: "1.0"
project: "Standard AI-SDLC Project"
default_action: "DENY"

categories:
  permissive_free:
    action: "ALLOW"
    description: "Licencias de libre uso comercial. Solo requieren atribución."
    spdx_identifiers:
      - "MIT"
      - "Apache-2.0"
      - "BSD-2-Clause"
      - "BSD-3-Clause"
      - "ISC"
      - "Unlicense"
      - "CC0-1.0"
      - "0BSD"

  weak_copyleft_conditional:
    action: "REVIEW_REQUIRED"
    description: "Permitidas únicamente como librerías dinámicas desacopladas."
    spdx_identifiers:
      - "LGPL-2.1-only"
      - "LGPL-3.0-only"
      - "MPL-2.0"

  strong_copyleft_viral:
    action: "DENY"
    description: "Prohibidas por efecto viral que obliga a publicar el código fuente."
    spdx_identifiers:
      - "GPL-2.0-only"
      - "GPL-3.0-only"
      - "AGPL-3.0-only"
      - "AGPL-3.0-or-later"

  commercial_acquisition_required:
    action: "COMMERCIAL_APPROVAL_REQUIRED"
    description: "Código fuente disponible pero exige pago comercial en SaaS."
    spdx_identifiers:
      - "SSPL-1.0"
      - "BSL-1.1"
`;

const STARTER_TASK_TEMPLATE = `---
tasks:
  - id: "TSK-001-setup"
    title: "Initial component setup"
    complexity: "LOW"
    risk-level: "LOW"
    autonomy-mode: "AUTONOMOUS"
    assigned-to: "agent-developer"
    status: "PENDING"
    verification:
      method: "COMMAND_VERIFICATION"
      command-or-criteria: "pnpm test"
---

# Plan de Tareas: Componente
`;

const STARTER_REQUIREMENT_TEMPLATE = `---
id: "FR-SAMPLE-001"
type: "requirement"
title: "Funcionalidad de Ejemplo"
status: "active"
version: "1.0.0"
derives-from:
  - "UC-SAMPLE-USECASE"
cucumber-feature-file: "tests/features/fr-sample-001.feature"
verified-by-tests:
  - "tests/unit/sample.spec.ts"
---

# Requerimiento: Funcionalidad de Ejemplo

\`\`\`gherkin
Feature: Sample Feature
  Scenario: Basic execution
    Given system is ready
    When user triggers action
    Then system responds with 200 OK
\`\`\`
`;

export function runInit(targetDir: string = '.', options: { dryRun?: boolean } = {}): boolean {
  const destDir = path.resolve(process.cwd(), targetDir);
  console.log(pc.bold(pc.cyan(`\n🚀 [AI-SDLC] Inicializando estructura de gobernanza en: ${destDir}\n`)));

  const directories = [
    'process',
    'schemas/product',
    'schemas/security',
    'schemas/compliance',
    'schemas/architecture',
    'templates/product',
    'templates/security',
    'templates/compliance',
    'templates/architecture',
    'templates/delivery',
    'specs',
    'reports',
    'tests/features',
  ];

  for (const d of directories) {
    const fullDir = path.join(destDir, d);
    if (options.dryRun) {
      console.log(`  ${pc.blue('DRY-RUN')} Crear directorio: ${d}`);
    } else {
      fs.mkdirSync(fullDir, { recursive: true });
      console.log(`  ${pc.green('✔')} Directorio creado: ${d}`);
    }
  }

  const filesToWrite: { relPath: string; content: string }[] = [
    { relPath: 'quality-policy.yaml', content: STARTER_QUALITY_POLICY },
    { relPath: 'license-policy.yaml', content: STARTER_LICENSE_POLICY },
    { relPath: 'templates/delivery/tasks.template.md', content: STARTER_TASK_TEMPLATE },
    { relPath: 'templates/product/requirement.template.md', content: STARTER_REQUIREMENT_TEMPLATE },
  ];

  for (const f of filesToWrite) {
    const fullFilePath = path.join(destDir, f.relPath);
    if (options.dryRun) {
      console.log(`  ${pc.blue('DRY-RUN')} Crear archivo: ${f.relPath}`);
    } else {
      if (!fs.existsSync(fullFilePath)) {
        fs.writeFileSync(fullFilePath, f.content, 'utf-8');
        console.log(`  ${pc.green('✔')} Archivo generado: ${f.relPath}`);
      } else {
        console.log(`  ${pc.yellow('ℹ')} Ya existe (omitido): ${f.relPath}`);
      }
    }
  }

  console.log(pc.green('\n✔ Repositorio configurado con políticas y plantillas AI-SDLC.\n'));
  return true;
}
