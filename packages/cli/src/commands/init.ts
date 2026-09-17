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
category: "functional"
derives-from:
  - "UC-SAMPLE-USECASE"
verifiable-by: "cucumber-bdd"
acceptance-format: "gherkin"
cucumber-tags:
  - "@FR-SAMPLE-001"
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

const STARTER_GITLAB_CI = `# ==============================================================================
# AI-SDLC: GitLab CI/CD Pipeline Template
# ==============================================================================

stages:
  - validate
  - test
  - integrate

default:
  image: node:20
  cache:
    key:
      files:
        - pnpm-lock.yaml
    paths:
      - .pnpm-store

variables:
  PNPM_HOME: "$CI_PROJECT_DIR/.pnpm"

before_script:
  - corepack enable
  - corepack prepare pnpm@10 --activate
  - pnpm config set store-dir .pnpm-store
  - pnpm install --frozen-lockfile
  - pnpm approve-builds --all
  - pnpm run build

quality-gates:
  stage: validate
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_COMMIT_BRANCH =~ /^release\\/.*/'
  script:
    - node packages/cli/bin/aisdlc.js check

test-and-verify:
  stage: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_COMMIT_BRANCH =~ /^release\\/.*/'
  script:
    - pnpm test
    - node packages/cli/bin/aisdlc.js verify all

sdd-canonical-integration:
  stage: integrate
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $CI_PIPELINE_SOURCE == "push"'
    - if: '$CI_COMMIT_BRANCH =~ /^release\\/.*/ && $CI_PIPELINE_SOURCE == "push"'
    - if: '$CI_PIPELINE_SOURCE == "web"'
  variables:
    GIT_STRATEGY: clone
    GIT_DEPTH: 0
  script:
    - npx tsx scripts/sdd-integrate-ci.ts
    - |
      if [ -f sdd-integrate.env ]; then
        source sdd-integrate.env
      fi
      if [ "$INTEGRATED" = "true" ]; then
        git config user.name "gitlab-ci-bot"
        git config user.email "gitlab-ci-bot@noreply.gitlab.com"
        git add -A
        if ! git diff --cached --quiet; then
          git commit -m "chore(sdd): integrate \${CHANGE_ID} into canonical baseline [skip ci]"
          git push "https://oauth2:\${CI_JOB_TOKEN}@\${CI_SERVER_HOST}/\${CI_PROJECT_PATH}.git" "HEAD:\${CI_COMMIT_BRANCH}"
        fi
      fi
`;

const STARTER_AZURE_PIPELINES = `# ==============================================================================
# AI-SDLC: Azure DevOps Pipelines Template
# ==============================================================================

trigger:
  branches:
    include:
      - main
      - release/*

pr:
  branches:
    include:
      - main
      - release/*

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: ValidateAndTest
    displayName: 'Verificación y Quality Gates'
    jobs:
      - job: QualityAndTests
        displayName: 'Quality Gates, Linting & Tests'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Instalar Node.js 20'

          - script: |
              corepack enable
              corepack prepare pnpm@10 --activate
              pnpm install --frozen-lockfile
              pnpm approve-builds --all
              pnpm run build
            displayName: 'Instalar dependencias y compilar monorepo'

          - script: |
              node packages/cli/bin/aisdlc.js check
            displayName: 'Ejecutar pre-vuelo AI-SDLC (check)'

          - script: |
              pnpm test
            displayName: 'Ejecutar suite de pruebas unitarias'

          - script: |
              node packages/cli/bin/aisdlc.js verify all
            displayName: 'Ejecutar Release Gate Completo (verify all)'

  - stage: CanonicalIntegration
    displayName: 'Integración Canónica Post-Merge SDD'
    dependsOn: ValidateAndTest
    condition: and(succeeded(), in(variables['Build.SourceBranch'], 'refs/heads/main', 'refs/heads/release/'))
    jobs:
      - job: SddPromote
        displayName: 'Consolidar especificaciones canónicas SDD'
        steps:
          - checkout: self
            persistCredentials: true
            fetchDepth: 0

          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Instalar Node.js 20'

          - script: |
              corepack enable
              corepack prepare pnpm@10 --activate
              pnpm install --frozen-lockfile
              pnpm approve-builds --all
              pnpm run build
            displayName: 'Instalar dependencias'

          - script: |
              npx tsx scripts/sdd-integrate-ci.ts
            name: SddIntegrate
            displayName: 'Detectar e integrar incremento SDD'

          - script: |
              git config user.name "azure-pipelines[bot]"
              git config user.email "azure-pipelines[bot]@dev.azure.com"
              git add -A
              if ! git diff --cached --quiet; then
                git commit -m "chore(sdd): integrate $(SddIntegrate.change_id) into canonical baseline [skip ci]"
                git push origin HEAD:$(Build.SourceBranchName)
              fi
            condition: eq(variables['SddIntegrate.integrated'], 'true')
            displayName: 'Sincronizar cambios canónicos en repositorio'
`;

const STARTER_BITBUCKET_PIPELINES = `# ==============================================================================
# AI-SDLC: Bitbucket Pipelines Template
# ==============================================================================

image: node:20

definitions:
  caches:
    pnpm: $BITBUCKET_CLONE_DIR/.pnpm-store
  steps:
    - step: &build-and-verify
        name: Quality Gates & Verification
        caches:
          - pnpm
        script:
          - corepack enable
          - corepack prepare pnpm@10 --activate
          - pnpm config set store-dir $BITBUCKET_CLONE_DIR/.pnpm-store
          - pnpm install --frozen-lockfile
          - pnpm approve-builds --all
          - pnpm run build
          - node packages/cli/bin/aisdlc.js check
          - pnpm test
          - node packages/cli/bin/aisdlc.js verify all

    - step: &sdd-integrate
        name: SDD Canonical Integration
        caches:
          - pnpm
        script:
          - corepack enable
          - corepack prepare pnpm@10 --activate
          - pnpm config set store-dir $BITBUCKET_CLONE_DIR/.pnpm-store
          - pnpm install --frozen-lockfile
          - pnpm approve-builds --all
          - pnpm run build
          - npx tsx scripts/sdd-integrate-ci.ts
          - |
            if [ -f sdd-integrate.env ]; then
              source sdd-integrate.env
            fi
            if [ "$INTEGRATED" = "true" ]; then
              git config user.name "bitbucket-pipelines[bot]"
              git config user.email "pipelines[bot]@bitbucket.org"
              git add -A
              if ! git diff --cached --quiet; then
                git commit -m "chore(sdd): integrate \${CHANGE_ID} into canonical baseline [skip ci]"
                git push origin HEAD:$BITBUCKET_BRANCH
              fi
            fi

pipelines:
  pull-requests:
    '**':
      - step: *build-and-verify

  branches:
    main:
      - step: *build-and-verify
      - step: *sdd-integrate
    'release/*':
      - step: *build-and-verify
      - step: *sdd-integrate
`;

const STARTER_GITHUB_CI = `name: CI - AI-SDLC Quality Gates & Testing

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [ 18.x, 20.x, 22.x ]

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install Dependencies
        run: |
          pnpm install --frozen-lockfile
          pnpm approve-builds --all

      - name: Build Monorepo Packages (@ai-sdlc/core & @ai-sdlc/cli)
        run: pnpm run build

      - name: Run Vitest Unit & Integration Suites
        run: pnpm test

      - name: Dogfooding - Run AI-SDLC Full Verification Suite
        run: node packages/cli/bin/aisdlc.js verify all
`;

const STARTER_GITHUB_SDD_INTEGRATE = `name: SDD Canonical Integration on Merge

on:
  pull_request:
    types: [closed]
    branches:
      - main
      - 'release/**'
  workflow_dispatch:
    inputs:
      change_id:
        description: 'ID del cambio SDD a integrar manualmente (ej. chg-001-telemetry)'
        required: false
        type: string

permissions:
  contents: write
  pull-requests: read

concurrency:
  group: sdd-integrate-\${{ github.ref }}
  cancel-in-progress: false

jobs:
  integrate-sdd:
    name: SDD Canonical Integration
    if: github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.base.ref || github.ref_name }}
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Dependencies
        run: |
          pnpm install --frozen-lockfile
          pnpm approve-builds --all

      - name: Build Packages
        run: pnpm run build

      - name: Detect and Integrate SDD Change
        id: integrate
        env:
          PR_HEAD_REF: \${{ github.event.pull_request.head.ref }}
          PR_TITLE: \${{ github.event.pull_request.title }}
          PR_BODY: \${{ github.event.pull_request.body }}
          MANUAL_CHANGE_ID: \${{ github.event.inputs.change_id }}
        run: |
          npx tsx scripts/sdd-integrate-ci.ts

      - name: Commit and Push Canonical Baseline Changes
        if: steps.integrate.outputs.integrated == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          if ! git diff --cached --quiet; then
            CHANGE_ID="\${{ steps.integrate.outputs.change_id }}"
            git commit -m "chore(sdd): integrate \${CHANGE_ID} into canonical baseline [skip ci]"
            git push
            echo "✔ Integración canónica commiteada y sincronizada en el repositorio."
          else
            echo "ℹ No se generaron modificaciones pendientes en el working tree."
          fi
`;

const VALID_CI_PROVIDERS = ['github', 'gitlab', 'azure', 'bitbucket'] as const;
export type SupportedCiProvider = (typeof VALID_CI_PROVIDERS)[number];

export function runInit(
  targetDir: string = '.',
  options: { dryRun?: boolean; ci?: string } = {}
): boolean {
  const destDir = path.resolve(process.cwd(), targetDir);
  console.log(pc.bold(pc.cyan(`\n🚀 [AI-SDLC] Inicializando estructura de gobernanza en: ${destDir}\n`)));

  let ciProvider: SupportedCiProvider | undefined;
  if (options.ci) {
    const normalized = options.ci.trim().toLowerCase();
    if (!VALID_CI_PROVIDERS.includes(normalized as SupportedCiProvider)) {
      console.error(pc.red(`\n✖ [ERROR] Proveedor CI no reconocido: '${options.ci}'.`));
      console.log(pc.yellow(`Opciones válidas: ${VALID_CI_PROVIDERS.join(', ')}.\n`));
      return false;
    }
    ciProvider = normalized as SupportedCiProvider;
  }

  const directories = [
    'process',
    'schemas/product',
    'schemas/security',
    'schemas/compliance',
    'schemas/architecture',
    'schemas/sdd',
    'schemas/manuals',
    'templates/product',
    'templates/security',
    'templates/compliance',
    'templates/architecture',
    'templates/sdd',
    'templates/manuals',
    'templates/ci',
    'specs',
    'reports',
    'tests/features',
  ];

  if (ciProvider === 'github') {
    directories.push('.github/workflows');
  }

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
    { relPath: 'templates/sdd/tasks.template.md', content: STARTER_TASK_TEMPLATE },
    { relPath: 'templates/product/requirement.template.md', content: STARTER_REQUIREMENT_TEMPLATE },
    { relPath: 'templates/ci/.gitlab-ci.yml', content: STARTER_GITLAB_CI },
    { relPath: 'templates/ci/azure-pipelines.yml', content: STARTER_AZURE_PIPELINES },
    { relPath: 'templates/ci/bitbucket-pipelines.yml', content: STARTER_BITBUCKET_PIPELINES },
  ];

  if (ciProvider === 'gitlab') {
    filesToWrite.push({ relPath: '.gitlab-ci.yml', content: STARTER_GITLAB_CI });
  } else if (ciProvider === 'azure') {
    filesToWrite.push({ relPath: 'azure-pipelines.yml', content: STARTER_AZURE_PIPELINES });
  } else if (ciProvider === 'bitbucket') {
    filesToWrite.push({ relPath: 'bitbucket-pipelines.yml', content: STARTER_BITBUCKET_PIPELINES });
  } else if (ciProvider === 'github') {
    filesToWrite.push(
      { relPath: '.github/workflows/ci.yml', content: STARTER_GITHUB_CI },
      { relPath: '.github/workflows/sdd-integrate-on-merge.yml', content: STARTER_GITHUB_SDD_INTEGRATE }
    );
  }

  for (const f of filesToWrite) {
    const fullFilePath = path.join(destDir, f.relPath);
    const parentDir = path.dirname(fullFilePath);
    if (options.dryRun) {
      console.log(`  ${pc.blue('DRY-RUN')} Crear archivo: ${f.relPath}`);
    } else {
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      if (!fs.existsSync(fullFilePath)) {
        fs.writeFileSync(fullFilePath, f.content, 'utf-8');
        console.log(`  ${pc.green('✔')} Archivo generado: ${f.relPath}`);
      } else {
        console.log(`  ${pc.yellow('ℹ')} Ya existe (omitido): ${f.relPath}`);
      }
    }
  }

  if (ciProvider) {
    console.log(pc.cyan(`\n  ✔ Configuración de CI/CD generada para proveedor: ${pc.bold(ciProvider)}`));
  }

  console.log(pc.green('\n✔ Repositorio configurado con políticas y plantillas AI-SDLC.\n'));
  return true;
}
