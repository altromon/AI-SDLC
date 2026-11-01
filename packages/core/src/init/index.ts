/**
 * AI-SDLC: Core Project Initialization and Governance Setup
 */

import * as fs from 'fs';
import * as path from 'path';
import { installGitHooks } from '../git/hook-installer.js';
import {
  STARTER_ANTIGRAVITY_RULES,
  STARTER_CURSOR_CORE_RULES,
  STARTER_CURSOR_PRODUCT_RULES,
  STARTER_CURSOR_QUALITY_RULES,
  STARTER_CLAUDE_RULES,
  STARTER_COPILOT_RULES,
  STARTER_CURSOR_MCP,
  STARTER_ANTIGRAVITY_MCP,
  STARTER_VSCODE_MCP,
  SPECIALIZED_AGENT_TEMPLATES,
  LIFECYCLE_SKILL_TEMPLATES,
  renderAntigravityAgentFile,
  renderAntigravitySkillFile,
  renderClaudeAgentFile,
  renderClaudeSkillFile,
  renderCopilotAgentFile,
  renderCopilotSkillFile,
  renderCursorAgentFile,
  renderCursorSkillFile,
} from './agent-templates.js';
import {
  getArchitectureTemplates,
  VALID_ARCHITECTURE_GRANULARITIES,
  ArchitectureGranularity,
} from './architecture-templates.js';
import {
  STARTER_BASE_TEMPLATES,
  STARTER_TEMPLATES_SDD_PULL_REQUEST_TEMPLATE_MD,
  STARTER__GITHUB_PULL_REQUEST_TEMPLATE_MD,
} from './starter-templates.js';
import { STARTER_SCHEMAS } from './starter-schemas.js';

export const VALID_CI_PROVIDERS = ['github', 'gitlab', 'azure', 'bitbucket'] as const;
export type SupportedCiProvider = (typeof VALID_CI_PROVIDERS)[number];

export const STARTER_QUALITY_POLICY = `# ==============================================================================
# AI-SDLC: Software Quality, Coding Rules & Release Gate Policy
# ==============================================================================
version: "1.0"
project: "Standard AI-SDLC Project"
enforcement_mode: "STRICT"

scope:
  target_directories:
    - "src"
    - "lib"
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
    - "examples"
    - "scratch"
    - "templates"

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

export const STARTER_LICENSE_POLICY = `# ==============================================================================
# AI-SDLC: Open Source License Compliance & Governance Policy
# ==============================================================================
version: "1.0"
project: "Standard AI-SDLC Project"
default_action: "DENY"

categories:
  permissive_free:
    action: "ALLOW"
    description: "Permissive commercial use licenses. Attribution only required."
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
    description: "Allowed only as dynamically linked decoupled libraries."
    spdx_identifiers:
      - "LGPL-2.1-only"
      - "LGPL-3.0-only"
      - "MPL-2.0"

  strong_copyleft_viral:
    action: "DENY"
    description: "Forbidden due to viral copyleft forcing source code disclosure."
    spdx_identifiers:
      - "GPL-2.0-only"
      - "GPL-3.0-only"
      - "AGPL-3.0-only"
      - "AGPL-3.0-or-later"

  commercial_acquisition_required:
    action: "COMMERCIAL_APPROVAL_REQUIRED"
    description: "Source-available code requiring commercial license for SaaS deployment."
    spdx_identifiers:
      - "SSPL-1.0"
      - "BSL-1.1"
`;

export const STARTER_PRIVACY_POLICY = `# ==============================================================================
# AI-SDLC: Data Protection & Privacy-by-Design Governance Policy (PDaC)
# ==============================================================================
version: "1.0"
project: "Standard AI-SDLC Project"
regulatory_frameworks:
  - "GDPR"
  - "LOPDGDD"
  - "ISO-27701"
default_pii_action: "DENY_UNCLASSIFIED"

classification_levels:
  PUBLIC:
    encryption_at_rest: false
    encryption_in_transit: true
    allow_in_logs: true
    allow_in_llm_prompts: true
  INTERNAL:
    encryption_at_rest: true
    encryption_in_transit: true
    allow_in_logs: true
    allow_in_llm_prompts: true
  CONFIDENTIAL_PII:
    encryption_at_rest: true
    encryption_in_transit: true
    allow_in_logs: false
    masking_in_logs: "HASH_OR_REDACT"
    allow_in_llm_prompts: false
    require_retention_policy: true
    require_erasure_mechanism: true
  RESTRICTED_SENSITIVE_PII:
    encryption_at_rest: true
    field_level_encryption: true
    encryption_in_transit: true
    allow_in_logs: false
    allow_in_llm_prompts: false
    require_dpia_approval: true
    require_explicit_consent_or_art9_basis: true

cross_border_transfers:
  allowed_regions:
    - "EU"
    - "EEA"
  require_scc_for_external: true
  approved_subprocessors: []
`;

export const STARTER_TASK_TEMPLATE = `---
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

# Task Plan: Component
`;

export const STARTER_REQUIREMENT_TEMPLATE = `---
id: "FR-SAMPLE-001"
type: "requirement"
title: "Sample Feature"
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

# Requirement: Sample Feature

\`\`\`gherkin
Feature: Sample Feature
  Scenario: Basic execution
    Given system is ready
    When user triggers action
    Then system responds with 200 OK
\`\`\`
`;

export const STARTER_WORKFLOW_HANDOFF_TEMPLATE = `# Workflow Handoff Template

> **Canonical reference:** [\`process/09_agent_protocols.md\`](../../process/09_agent_protocols.md) and [\`process/01_governance_and_roles.md\`](../../process/01_governance_and_roles.md).
>
> **Activation Criterion by Autonomy Mode:**
> - 🟢 **\`AUTONOMOUS\` (or exclusive supervision at the end in PR/CI):** OMITTED. The agent executes and delivers without interrupting the user with this handoff block.
> - 🟡 **\`HUMAN_REVIEW_PLAN\` | 🟠 \`AMBIGUOUS\` | 🔴 \`HIGH_RISK_MANUAL\`:** MANDATORY. Upon completing the phase or proposal, the agent emits this block and **halts**, granting visibility to the user and relinquishing control.

---

### 🔄 Workflow Handoff

- **Completed Phase / Activity**: \`[Current phase, e.g. Product Definition / Threat Modeling / Privacy Modeling / Architecture / SDD Implementation]\`
- **Acting Role**: \`[agent-product-analyst | agent-threat-modeler | agent-privacy-officer | agent-system-architect | agent-developer | agent-expert-user | agent-security-auditor | agent-compliance-checker]\`
- **Task Autonomy Mode**: \`[HUMAN_REVIEW_PLAN | AMBIGUOUS | HIGH_RISK_MANUAL]\`
- **Produced Deliverables**:
  - [x] \`[Path or ID of generated artifact, e.g. specs/product/uc-mission.md]\`
  - [x] \`[Path or ID of generated artifact, e.g. quality-report.md]\`

- **Recommended Next Role(s) in Workflow**:
  - \`[Suggested role name, e.g. agent-threat-modeler]\`: \`[Technical rationale, e.g. Model STRIDE adversaries and mitigate abuse cases]\`
  - *(Optional)* \`[Alternative role, e.g. agent-expert-user]\`: \`[Technical rationale, e.g. Evaluate UX and MVP boundary]\`

- **Suggested Invocation Prompt**:
  > "Act as \`[next-role]\` and proceed with the \`[next phase]\` phase on the generated deliverables: \`[key artifacts]\`."

- **Human Action Window (User Sovereignty and Priority)**:
  - ✋ **Review and Validate**: Inspect generated artifacts and validate alignment with project vision before proceeding.
  - ✏️ **Edit Directly**: Modify requirements, code, or acceptance criteria directly at any time.
  - 🛑 **Pause, Divert, or Discard**: Freeze workflow, redirect toward another goal, or discard proposal.
  - ▶️ **Delegate to Next Agent**: If satisfied with output, execute suggested prompt to continue the chain.

---
`;

export const STARTER_GITLAB_CI = `# ==============================================================================
# AI-SDLC: GitLab CI/CD Pipeline Template
# ==============================================================================

stages:
  - validate
  - test
  - integrate

default:
  image: node:20

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
    - npx @aisdlc/cli check

test-and-verify:
  stage: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_COMMIT_BRANCH =~ /^release\\/.*/'
  script:
    - pnpm test
    - npx @aisdlc/cli verify all

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
    - npx @aisdlc/cli sdd integrate --auto || true
    - |
      git config user.name "gitlab-ci-bot"
      git config user.email "gitlab-ci-bot@noreply.gitlab.com"
      git add -A
      if ! git diff --cached --quiet; then
        git commit -m "chore(sdd): integrate changes into canonical baseline [skip ci]"
        git push "https://oauth2:\${CI_JOB_TOKEN}@\${CI_SERVER_HOST}/\${CI_PROJECT_PATH}.git" "HEAD:\${CI_COMMIT_BRANCH}"
      fi
`;

export const STARTER_AZURE_PIPELINES = `# ==============================================================================
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
              npx @aisdlc/cli check
            displayName: 'Ejecutar pre-vuelo AI-SDLC (check)'

          - script: |
              pnpm test
            displayName: 'Ejecutar suite de pruebas unitarias'

          - script: |
              npx @aisdlc/cli verify all
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
              npx @aisdlc/cli sdd integrate --auto || true
            name: SddIntegrate
            displayName: 'Detectar e integrar incremento SDD'

          - script: |
              git config user.name "azure-pipelines[bot]"
              git config user.email "azure-pipelines[bot]@dev.azure.com"
              git add -A
              if ! git diff --cached --quiet; then
                git commit -m "chore(sdd): integrate changes into canonical baseline [skip ci]"
                git push origin HEAD:$(Build.SourceBranchName)
              fi
            displayName: 'Sincronizar cambios canónicos en repositorio'
`;

export const STARTER_BITBUCKET_PIPELINES = `# ==============================================================================
# AI-SDLC: Bitbucket Pipelines Template
# ==============================================================================

image: node:20

definitions:
  steps:
    - step: &build-and-verify
        name: Quality Gates & Verification
        script:
          - corepack enable
          - corepack prepare pnpm@10 --activate
          - pnpm config set store-dir $BITBUCKET_CLONE_DIR/.pnpm-store
          - pnpm install --frozen-lockfile
          - pnpm approve-builds --all
          - pnpm run build
          - npx @aisdlc/cli check
          - pnpm test
          - npx @aisdlc/cli verify all

    - step: &sdd-integrate
        name: SDD Canonical Integration
        script:
          - corepack enable
          - corepack prepare pnpm@10 --activate
          - pnpm config set store-dir $BITBUCKET_CLONE_DIR/.pnpm-store
          - pnpm install --frozen-lockfile
          - pnpm approve-builds --all
          - pnpm run build
          - npx @aisdlc/cli sdd integrate --auto || true
          - |
            git config user.name "bitbucket-pipelines[bot]"
            git config user.email "pipelines[bot]@bitbucket.org"
            git add -A
            if ! git diff --cached --quiet; then
              git commit -m "chore(sdd): integrate changes into canonical baseline [skip ci]"
              git push origin HEAD:$BITBUCKET_BRANCH
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

export const STARTER_GITHUB_CI = `name: CI - AI-SDLC Quality Gates & Testing

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

      - name: Install Dependencies
        run: |
          pnpm install --frozen-lockfile
          pnpm approve-builds --all

      - name: Build Packages
        run: pnpm run build

      - name: Run Vitest Unit & Integration Suites
        run: pnpm test

      - name: AI-SDLC Quality Gate & Full Verification
        run: npx @aisdlc/cli verify all
`;

export const STARTER_GITHUB_PR_KPI = `name: AI-SDLC PR KPI Aggregator

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  aggregate-kpis:
    name: Aggregate PR KPIs & Telemetry
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: |
          pnpm install --frozen-lockfile

      - name: Calculate and Emit PR KPIs
        id: kpi
        run: |
          npx @aisdlc/cli kpi pr --base origin/\${{ github.base_ref }} --head HEAD >> $GITHUB_STEP_SUMMARY
`;

export const STARTER_GITHUB_DEPLOY_DASHBOARD = `name: Deploy AI-SDLC Dashboard to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy-dashboard:
    name: Build & Publish Interactive Dashboard
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Generate AI-SDLC Interactive Dashboard
        run: |
          mkdir -p reports
          npx --yes @aisdlc/cli report dashboard --output reports/index.html
          cp reports/index.html reports/dashboard.html
          touch reports/.nojekyll

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: reports

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      - name: Emit Summary to GitHub Actions
        if: always() && steps.deployment.outcome == 'success'
        run: |
          echo "### 🌐 AI-SDLC Interactive Dashboard Published" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "The interactive PDaC / RTM graph, Quality Gate telemetry, and release metrics are live at:" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "👉 **[Open Live Dashboard](\${{ steps.deployment.outputs.page_url }})**" >> $GITHUB_STEP_SUMMARY
`;

export const STARTER_GITHUB_SDD_INTEGRATE = `name: SDD Canonical Integration on Merge

on:
  pull_request:
    types: [closed]
    branches:
      - main
      - 'release/**'
  workflow_dispatch:
    inputs:
      change_id:
        description: 'Manual SDD change ID to integrate (e.g. chg-001-telemetry)'
        required: false
        type: string

permissions:
  contents: write
  pull-requests: read

concurrency:
  group: sdd-integrate-\${{ github.event.pull_request.base.ref || github.ref_name }}
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
          npx @aisdlc/cli sdd integrate --auto || true

      - name: Commit and Push Canonical Baseline Changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          if ! git diff --cached --quiet; then
            git commit -m "chore(sdd): integrate changes into canonical baseline [skip ci]"
            TARGET_BRANCH="\${{ github.event.pull_request.base.ref || github.ref_name }}"
            MAX_RETRIES=3
            RETRY_COUNT=0
            DELAY=2

            while [ \$RETRY_COUNT -lt \$MAX_RETRIES ]; do
              echo "Synchronizing with remote branch \$TARGET_BRANCH (pull --rebase)..."
              git pull --rebase origin "\$TARGET_BRANCH"
              if git push origin "\$TARGET_BRANCH"; then
                echo "✔ Canonical integration committed and synchronized in repository."
                exit 0
              fi
              RETRY_COUNT=\$((RETRY_COUNT + 1))
              if [ \$RETRY_COUNT -lt \$MAX_RETRIES ]; then
                echo "⚠ Push rejected (concurrency detected). Retrying in \${DELAY}s (attempt \$RETRY_COUNT/\$MAX_RETRIES)..."
                sleep \$DELAY
                DELAY=\$((DELAY * 2))
              fi
            done

            echo "❌ Error: Failed to push canonical integration after \$MAX_RETRIES attempts."
            exit 1
          else
            echo "ℹ No pending modifications generated in working tree."
          fi
`;

export * from './starter-schemas.js';
export * from './starter-templates.js';
export const STARTER_PULL_REQUEST_TEMPLATE = STARTER_TEMPLATES_SDD_PULL_REQUEST_TEMPLATE_MD;
export const STARTER_GITHUB_PULL_REQUEST_TEMPLATE = STARTER__GITHUB_PULL_REQUEST_TEMPLATE_MD;
export * from './agent-templates.js';
export * from './architecture-templates.js';

export const VALID_AGENT_TARGETS = ['cursor', 'claude', 'antigravity', 'copilot', 'mcp', 'all'] as const;
export type AgentTarget = (typeof VALID_AGENT_TARGETS)[number];

export interface InitProjectOptions {
  rootDir?: string;
  targetDir?: string;
  ci?: string;
  agents?: string | boolean | string[];
  architecture?: ArchitectureGranularity | string;
  dryRun?: boolean;
  force?: boolean;
}

export interface InitProjectResult {
  success: boolean;
  targetDir: string;
  directoriesCreated: string[];
  filesCreated: string[];
  filesUpdated: string[];
  ciProvider?: SupportedCiProvider;
  agentsConfigured: string[];
  architectureGranularity?: ArchitectureGranularity;
  gitHookInstalled: boolean;
  error?: string;
}

const DISABLED_AGENT_VALUES = new Set<unknown>([false, 'none', 'false', '']);
const ALL_AGENT_VALUES = new Set<unknown>([undefined, null, true, 'all']);

export function resolveAgentTargets(agents?: string | boolean | string[]): Set<string> {
  const result = new Set<string>();
  if (DISABLED_AGENT_VALUES.has(agents)) return result;
  if (ALL_AGENT_VALUES.has(agents)) {
    VALID_AGENT_TARGETS.forEach((t) => result.add(t));
    return result;
  }
  const rawList = Array.isArray(agents) ? agents : String(agents).split(',');
  for (const raw of rawList) {
    const item = raw.trim().toLowerCase();
    if (item === 'all') {
      VALID_AGENT_TARGETS.forEach((t) => result.add(t));
      return result;
    }
    if (VALID_AGENT_TARGETS.includes(item as AgentTarget)) {
      result.add(item);
    }
  }
  return result;
}

function appendAntigravityFiles(dirs: string[], files: { relPath: string; content: string }[]): void {
  dirs.push('.agent/rules', '.agent/agents', '.agent/skills');
  files.push({ relPath: '.agent/rules/ai-sdlc.md', content: STARTER_ANTIGRAVITY_RULES });
  for (const agent of SPECIALIZED_AGENT_TEMPLATES) {
    const content = renderAntigravityAgentFile(agent);
    files.push({ relPath: `.agent/agents/${agent.id}.md`, content });
  }
  for (const skill of LIFECYCLE_SKILL_TEMPLATES) {
    dirs.push(`.agent/skills/${skill.id}`);
    files.push({ relPath: `.agent/skills/${skill.id}/SKILL.md`, content: renderAntigravitySkillFile(skill) });
  }
}

function appendCursorFiles(dirs: string[], files: { relPath: string; content: string }[]): void {
  dirs.push('.cursor/rules');
  files.push(
    { relPath: '.cursor/rules/ai-sdlc-core.mdc', content: STARTER_CURSOR_CORE_RULES },
    { relPath: '.cursor/rules/ai-sdlc-product.mdc', content: STARTER_CURSOR_PRODUCT_RULES },
    { relPath: '.cursor/rules/ai-sdlc-quality.mdc', content: STARTER_CURSOR_QUALITY_RULES }
  );
  for (const agent of SPECIALIZED_AGENT_TEMPLATES) {
    files.push({ relPath: `.cursor/rules/${agent.id}.mdc`, content: renderCursorAgentFile(agent) });
  }
  for (const skill of LIFECYCLE_SKILL_TEMPLATES) {
    files.push({ relPath: `.cursor/rules/${skill.id}.mdc`, content: renderCursorSkillFile(skill) });
  }
}

function appendClaudeFiles(dirs: string[], files: { relPath: string; content: string }[]): void {
  dirs.push('.claude/agents', '.claude/skills');
  files.push({ relPath: 'CLAUDE.md', content: STARTER_CLAUDE_RULES });
  for (const agent of SPECIALIZED_AGENT_TEMPLATES) {
    const content = renderClaudeAgentFile(agent);
    dirs.push(`.claude/skills/${agent.id}`);
    files.push(
      { relPath: `.claude/agents/${agent.id}.md`, content },
      { relPath: `.claude/skills/${agent.id}/SKILL.md`, content }
    );
  }
  for (const skill of LIFECYCLE_SKILL_TEMPLATES) {
    dirs.push(`.claude/skills/${skill.id}`);
    files.push({ relPath: `.claude/skills/${skill.id}/SKILL.md`, content: renderClaudeSkillFile(skill) });
  }
}

function appendCopilotFiles(dirs: string[], files: { relPath: string; content: string }[]): void {
  dirs.push('.github', '.github/agents');
  files.push({ relPath: '.github/copilot-instructions.md', content: STARTER_COPILOT_RULES });
  for (const agent of SPECIALIZED_AGENT_TEMPLATES) {
    files.push({ relPath: `.github/agents/${agent.id}.agent.md`, content: renderCopilotAgentFile(agent) });
  }
  for (const skill of LIFECYCLE_SKILL_TEMPLATES) {
    files.push({ relPath: `.github/agents/${skill.id}.agent.md`, content: renderCopilotSkillFile(skill) });
  }
}

function isTargetIncluded(targets: Set<string>, name: string): boolean {
  return targets.has('all') || targets.has(name);
}

function appendMcpFiles(dirs: string[], files: { relPath: string; content: string }[]): void {
  dirs.push('.cursor', '.vscode');
  files.push(
    { relPath: '.cursor/mcp.json', content: STARTER_CURSOR_MCP },
    { relPath: 'antigravity.mcp.json', content: STARTER_ANTIGRAVITY_MCP },
    { relPath: '.vscode/mcp.json', content: STARTER_VSCODE_MCP }
  );
}

export function collectAgentFiles(targets: Set<string>): {
  dirs: string[];
  files: { relPath: string; content: string }[];
} {
  const dirs: string[] = [];
  const files: { relPath: string; content: string }[] = [];

  if (isTargetIncluded(targets, 'antigravity')) appendAntigravityFiles(dirs, files);
  if (isTargetIncluded(targets, 'cursor')) appendCursorFiles(dirs, files);
  if (isTargetIncluded(targets, 'claude')) appendClaudeFiles(dirs, files);
  if (isTargetIncluded(targets, 'copilot')) appendCopilotFiles(dirs, files);

  appendMcpFiles(dirs, files);
  return { dirs, files };
}

function writeSingleFile(
  fullFilePath: string,
  content: string,
  relPath: string,
  opts: { dryRun?: boolean; force?: boolean },
  results: { filesCreated: string[]; filesUpdated: string[] }
): void {
  const exists = fs.existsSync(fullFilePath);
  if (opts.dryRun) {
    if (exists && opts.force) results.filesUpdated.push(relPath);
    else if (!exists) results.filesCreated.push(relPath);
    return;
  }
  const parentDir = path.dirname(fullFilePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  if (!exists) {
    fs.writeFileSync(fullFilePath, content, 'utf-8');
    results.filesCreated.push(relPath);
  } else if (opts.force) {
    fs.writeFileSync(fullFilePath, content, 'utf-8');
    results.filesUpdated.push(relPath);
  }
}

function writeProjectFiles(
  destDir: string,
  files: { relPath: string; content: string }[],
  dryRun?: boolean,
  force?: boolean
): { filesCreated: string[]; filesUpdated: string[] } {
  const results = { filesCreated: [] as string[], filesUpdated: [] as string[] };
  for (const f of files) {
    const fullFilePath = path.join(destDir, f.relPath);
    writeSingleFile(fullFilePath, f.content, f.relPath, { dryRun, force }, results);
  }
  return results;
}

function validateCiProvider(ci?: string): { valid: boolean; provider?: SupportedCiProvider; error?: string } {
  if (!ci) return { valid: true };
  const normalized = ci.trim().toLowerCase();
  if (normalized === 'none') return { valid: true };
  if (!VALID_CI_PROVIDERS.includes(normalized as SupportedCiProvider)) {
    return {
      valid: false,
      error: `Unrecognized CI provider: '${ci}'. Valid options: ${VALID_CI_PROVIDERS.join(', ')}.`,
    };
  }
  return { valid: true, provider: normalized as SupportedCiProvider };
}

function validateArchitectureGranularity(arch?: unknown): { valid: boolean; granularity: ArchitectureGranularity; error?: string } {
  if (arch === undefined || arch === null) return { valid: true, granularity: 'minimal' };
  const rawArch = String(arch).trim().toLowerCase();
  if (!VALID_ARCHITECTURE_GRANULARITIES.includes(rawArch as ArchitectureGranularity)) {
    return {
      valid: false,
      granularity: 'minimal',
      error: `Unrecognized architecture granularity level: '${arch}'. Valid options: ${VALID_ARCHITECTURE_GRANULARITIES.join(', ')}.`,
    };
  }
  return { valid: true, granularity: rawArch as ArchitectureGranularity };
}

const BASE_DIRECTORIES: readonly string[] = [
  'process',
  'compliance',
  'schemas/product',
  'schemas/security',
  'schemas/privacy',
  'schemas/compliance',
  'schemas/architecture',
  'schemas/safety',
  'schemas/sdd',
  'schemas/manuals',
  'schemas/workflow',
  'schemas/ide',
  'templates/product',
  'templates/security',
  'templates/privacy',
  'templates/compliance',
  'templates/architecture',
  'templates/safety',
  'templates/sdd',
  'templates/manuals',
  'templates/ci',
  'templates/workflow',
  'specs',
  'reports',
  'tests/features',
];

function getBaseDirectories(ciProvider?: SupportedCiProvider): string[] {
  const dirs = [...BASE_DIRECTORIES, '.cursor', '.vscode'];
  if (ciProvider === 'github' || !ciProvider) {
    dirs.push('.github', '.github/workflows');
  }
  return dirs;
}

function getCiWorkflowFiles(ciProvider?: SupportedCiProvider): { relPath: string; content: string }[] {
  if (ciProvider === 'gitlab') return [{ relPath: '.gitlab-ci.yml', content: STARTER_GITLAB_CI }];
  if (ciProvider === 'azure') return [{ relPath: 'azure-pipelines.yml', content: STARTER_AZURE_PIPELINES }];
  if (ciProvider === 'bitbucket') return [{ relPath: 'bitbucket-pipelines.yml', content: STARTER_BITBUCKET_PIPELINES }];
  if (ciProvider === 'github') {
    return [
      { relPath: '.github/workflows/ci.yml', content: STARTER_GITHUB_CI },
      { relPath: '.github/workflows/sdd-integrate-on-merge.yml', content: STARTER_GITHUB_SDD_INTEGRATE },
      { relPath: '.github/workflows/pr-kpi-summary.yml', content: STARTER_GITHUB_PR_KPI },
      { relPath: '.github/workflows/deploy-dashboard.yml', content: STARTER_GITHUB_DEPLOY_DASHBOARD },
    ];
  }
  return [];
}

function createDirectoriesOnDisk(destDir: string, directories: string[], dryRun?: boolean): string[] {
  const created: string[] = [];
  for (const d of directories) {
    if (!dryRun) fs.mkdirSync(path.join(destDir, d), { recursive: true });
    created.push(d);
  }
  return created;
}

function collectStarterFiles(
  ciProvider?: SupportedCiProvider,
  agentFiles: { relPath: string; content: string }[] = [],
  archGranularity: ArchitectureGranularity = 'minimal'
): { relPath: string; content: string }[] {
  const files: { relPath: string; content: string }[] = [
    { relPath: 'quality-policy.yaml', content: STARTER_QUALITY_POLICY },
    { relPath: 'license-policy.yaml', content: STARTER_LICENSE_POLICY },
    { relPath: 'privacy-policy.yaml', content: STARTER_PRIVACY_POLICY },
    ...STARTER_BASE_TEMPLATES,
    ...STARTER_SCHEMAS.map((s) => ({ relPath: s.relPath, content: s.content })),
    ...getCiWorkflowFiles(ciProvider),
    ...agentFiles,
    ...getArchitectureTemplates(archGranularity).map((t) => ({
      relPath: path.join('templates', 'architecture', t.filename).replace(/\\/g, '/'),
      content: t.content,
    })),
  ];

  if (ciProvider === 'github' || !ciProvider) {
    files.push({
      relPath: '.github/PULL_REQUEST_TEMPLATE.md',
      content: STARTER_GITHUB_PULL_REQUEST_TEMPLATE,
    });
  }

  return files;
}

const STANDARD_AISDLC_SCRIPTS: Record<string, string> = {
  check: 'aisdlc check',
  'check:fix': 'aisdlc check --fix',
  'verify:quality': 'aisdlc verify quality',
  'verify:privacy': 'aisdlc verify privacy',
  'verify:all': 'aisdlc verify all',
  'change:new': 'aisdlc change new',
};

function injectMissingScripts(scripts: Record<string, string>): boolean {
  let modified = false;
  for (const [key, val] of Object.entries(STANDARD_AISDLC_SCRIPTS)) {
    if (!scripts[key]) {
      scripts[key] = val;
      modified = true;
    }
  }
  return modified;
}

function updateConsumerPackageJson(destDir: string, dryRun?: boolean): boolean {
  const pkgPath = path.join(destDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (!pkg || typeof pkg !== 'object') return false;
    pkg.scripts = pkg.scripts || {};
    const modified = injectMissingScripts(pkg.scripts);
    if (modified && !dryRun) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    }
    return modified;
  } catch {
    return false;
  }
}

function tryInstallGitHook(destDir: string, dryRun?: boolean): boolean {
  if (!dryRun && fs.existsSync(path.join(destDir, '.git'))) {
    return installGitHooks(destDir).success;
  }
  return false;
}

function formatAgentsConfigured(targets: Set<string>): string[] {
  const configured = Array.from(targets).filter((t) => t !== 'all');
  if (targets.has('all')) configured.unshift('all');
  return configured;
}

function buildInitError(targetDir: string, error?: string): InitProjectResult {
  return {
    success: false,
    targetDir,
    directoriesCreated: [],
    filesCreated: [],
    filesUpdated: [],
    agentsConfigured: [],
    gitHookInstalled: false,
    error,
  };
}

function mergeDirectories(base: string[], extra: string[]): string[] {
  const result = [...base];
  for (const d of extra) {
    if (!result.includes(d)) result.push(d);
  }
  return result;
}

function buildInitSuccessResult(
  destDir: string,
  directoriesCreated: string[],
  filesCreated: string[],
  filesUpdated: string[],
  ciProvider: SupportedCiProvider | undefined,
  agentsConfigured: string[],
  architectureGranularity: ArchitectureGranularity,
  gitHookInstalled: boolean
): InitProjectResult {
  return {
    success: true,
    targetDir: destDir,
    directoriesCreated,
    filesCreated,
    filesUpdated,
    ciProvider,
    agentsConfigured,
    architectureGranularity,
    gitHookInstalled,
  };
}

function validateInitOptions(options: InitProjectOptions): {
  valid: boolean;
  ciProvider?: SupportedCiProvider;
  archGranularity: ArchitectureGranularity;
  error?: string;
} {
  const ciRes = validateCiProvider(options.ci);
  if (!ciRes.valid) return { valid: false, archGranularity: 'minimal', error: ciRes.error };
  const archRes = validateArchitectureGranularity(options.architecture);
  if (!archRes.valid) return { valid: false, archGranularity: 'minimal', error: archRes.error };
  return { valid: true, ciProvider: ciRes.provider, archGranularity: archRes.granularity };
}

function assembleScaffoldingPlan(
  ciProvider: SupportedCiProvider | undefined,
  agents: string | boolean | string[] | undefined,
  archGranularity: ArchitectureGranularity
): {
  agentTargets: Set<string>;
  directories: string[];
  starterFiles: { relPath: string; content: string }[];
} {
  const agentTargets = resolveAgentTargets(agents);
  const { dirs: agentDirs, files: agentFiles } = collectAgentFiles(agentTargets);
  const directories = mergeDirectories(getBaseDirectories(ciProvider), agentDirs);
  const starterFiles = collectStarterFiles(ciProvider, agentFiles, archGranularity);
  return { agentTargets, directories, starterFiles };
}

export function initProject(options: InitProjectOptions = {}): InitProjectResult {
  const destDir = path.resolve(options.rootDir || process.cwd(), options.targetDir || '.');
  const validated = validateInitOptions(options);
  if (!validated.valid) return buildInitError(destDir, validated.error);

  const { agentTargets, directories, starterFiles } = assembleScaffoldingPlan(
    validated.ciProvider,
    options.agents,
    validated.archGranularity
  );

  const dirsCreated = createDirectoriesOnDisk(destDir, directories, options.dryRun);
  const { filesCreated, filesUpdated } = writeProjectFiles(destDir, starterFiles, options.dryRun, options.force);

  if (updateConsumerPackageJson(destDir, options.dryRun)) {
    filesCreated.push('package.json');
  }

  return buildInitSuccessResult(
    destDir,
    dirsCreated,
    filesCreated,
    filesUpdated,
    validated.ciProvider,
    formatAgentsConfigured(agentTargets),
    validated.archGranularity,
    tryInstallGitHook(destDir, options.dryRun)
  );
}
