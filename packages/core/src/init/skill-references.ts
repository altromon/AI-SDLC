/**
 * AI-SDLC: Self-Contained Reference Guides for Lifecycle Skills
 * Ensures skills work standalone in consumer repositories without monorepo process/ docs.
 */

import type { SkillReferenceFile } from './agent-templates.js';

export const SKILL_REFERENCES: Record<string, readonly SkillReferenceFile[]> = {
  'aisdlc-greenfield': [
    {
      filename: 'inception-checklist.md',
      content: `# Greenfield Inception Quick Reference

## Phase 0 Discovery Interview (Up to 15 Questions)
1. **Mission & Problem**: Core business problem and measurable success criteria.
2. **Primary Actors (\`ACT-*\`)**: Human roles and external systems.
3. **Interaction Modality (\`ARCH-INTRO-001\`)**: Web UI, Desktop GUI, Console/TUI/CLI, Mobile, or Headless API/SDK (never library-only when human actors exist).
4. **Delivery & Operation Model**: Cloud SaaS, Self-Hosted/On-Premise, Local Desktop/CLI, or SDK package.
5. **Visual Aesthetic Standard**: Bootstrap 5-style responsive Web, modern rounded/elevated Desktop, or colorized rich Console/TUI.
6. **Master Data CRUD**: Foundational catalogs/entities needed to operate core flows without manual DB seeding.
7. **MVP Use Cases (\`UC-*\`) & Quality Goals (\`QR-*\`)**: Strict MVP core vs. roadmap backlog.

## Upstream Artifact Chain
\`ARCH-INTRO-001\` -> \`ACT-*\` / \`JRN-*\` / \`UC-*\` / \`BR-*\` / \`FR-*\` / \`QR-*\` -> \`agent-expert-user\` (Design Mode) -> \`ACT-THREAT-*\` / \`ABUSE-*\` / \`SEC-REQ-*\` -> \`DATA-ASSET-*\` / \`PRIV-ROPA-*\` / \`PRIV-REQ-*\` -> \`CMP-*\` / \`ARCH-DEP-001\` / \`ADR-*\` -> Checkpoint 1 (\`agent-auditor\` || \`agent-adversary\`).
`,
    },
  ],
  'aisdlc-legacy-onboarding': [
    {
      filename: 'retro-inception-and-strangler.md',
      content: `# Legacy / Brownfield Retro-Inception Reference

## Read-Only Baseline Audit Commands
- Licenses & AST Quality: \`npx aisdlc verify licenses\` and \`npx aisdlc report quality\`
- Secrets & SAST: \`npx aisdlc verify security\` (exit code 4 = halt & rotate secrets immediately)
- Privacy & PII: \`npx aisdlc verify privacy\` (exit code 5 = PII in logs/prompts/seeds)

## Bounded Retro-Inception Rules
- Document only the system boundary (\`ARCH-INTRO-001\`, core \`CMP-*\`) and the specific domain under active evolution (\`UC-*\`, \`FR-*\`).
- **Zero Drive-By Rewrites**: Never mass-refactor untouched legacy modules. Apply the Strangler / Boy Scout rule via governed SDD tasks (\`TSK-*\`).
- **Characterization First**: Capture existing behavior in \`FR-*\` Gherkin scenarios before modifying logic.
`,
    },
  ],
  'aisdlc-increment': [
    {
      filename: 'sdd-lifecycle-and-gates.md',
      content: `# SDD Increment & 12 Quality Gates Reference

## Friction Profiles & Anti-Bypass Paths
- \`patch\`: <= 2 source files, zero Anti-Bypass paths (\`spec.md\` only).
- \`standard\`: Functional increments, new/updated \`UC-*\` / \`FR-*\` (\`proposal.md\`, \`spec.md\`, \`design.md\`, \`tasks.md\`, \`handoff.yaml\`).
- \`critical\`: Security enclaves (\`SEC-ENC-*\`), special-category PII (\`DPIA-*\`), schemas, migrations.
- **Anti-Bypass Paths** (never \`patch\`): \`schemas/\`, \`specs/security/\`, \`specs/privacy/\`, \`packages/security/\`, \`SEC-ENC-*\`, \`09_decisions/\`, \`migrations/\`, \`*-policy.yaml\`.

## 4-Tier Git Hierarchy & Trailers
\`task/<PARENT-ID>/<TSK-ID>-<slug>\` -> \`feat/<CHG-ID>-<slug>\` -> \`release/vX.Y.Z\` -> \`main\`
Commit trailers: \`Author-Type: agent\`, \`AI-Model: <model>\`, \`AI-Reasoning-Effort: <level>\`, \`Task-ID: TSK-XXX\`, \`Change-ID: CHG-XXX\`.

## Single-Use-Case Rule
Enforce \`1 UC-* = 1 CHG-*\` and 100% coverage of \`design.md\` & \`handoff.yaml\` in \`tasks.md\`.
`,
    },
  ],
  'aisdlc-inspector': [
    {
      filename: 'traceability-graph-legend.md',
      content: `# 360° Traceability Graph Legend

## Node Statuses
- \`COMPLIANT\`: All upstream citations and downstream test/code links are valid and drift-free.
- \`ORPHAN\`: Missing upstream justification or downstream implementation/verification link.
- \`DRIFT\`: Upstream SHA-256 citation digest no longer matches the referenced artifact.

## UX Rule (Report First, Question After)
Always render the full technical report (Header, File Location, Summary, Upstream ↗️, Downstream ↘️, Numbered Items) before prompting for the next navigation step.
`,
    },
  ],
  'aisdlc-doctor-migrate': [
    {
      filename: 'migrate-safety-and-ratchet.md',
      content: `# Doctor & Migrate Safety Reference

## Migration File Classifications
- \`UP_TO_DATE\`: Local file matches canonical SHA-256 (LF-normalized).
- \`CLEAN_UPDATE\`: Local file matches base or is missing; safely updated/created.
- \`LOCAL_OVERRIDE_PRESERVED\`: Local customization detected; preserved with exit code \`1\` unless \`--force\` is passed.
- \`CONFLICT\`: Structural corruption detected (exit code \`2\`).

## Safety Guardrails
- Mutating migrations are blocked on protected branches (\`main\`, \`master\`, \`release/*\`) with \`ERR_PROTECTED_BRANCH_MIGRATION\`.
- Backups are written to \`.backup/migration-<timestamp>-<rand>/\` with automatic rollback on failure.
- Policy Ratchet blocks relaxing stricter thresholds in \`quality-policy.yaml\` / \`privacy-policy.yaml\` without \`--allow-policy-downgrade\`.
`,
    },
  ],
  'aisdlc-release-compliance': [
    {
      filename: 'regulatory-bundles-and-semver.md',
      content: `# Release Compliance & SemVer Reference

## Regulatory Compliance Evidence Bundle
\`npx aisdlc report compliance --strict --offline\` generates \`reports/audit-evidence-bundle.json\` mapping all 12 Quality Gates to EU AI Act, ISO 42001, NIST SSDF, OSCAL, and in-toto provenance.

## Highest-Precedence SemVer Rule
When consolidating multiple increments in a single release or PR, apply **only one** version bump matching the highest friction profile:
\`critical\` (Major \`X.0.0\`) > \`standard\` (Minor \`x.Y.0\`) > \`patch\` (Patch \`x.y.Z\`).
`,
    },
  ],
  'aisdlc-security-sca-triage': [
    {
      filename: 'security-and-license-gates.md',
      content: `# Security, Privacy & License Triage Reference

## Deterministic Exit Codes
- Exit Code \`4\`: Gate 11 (Secrets) or Gate 12 (SAST) CRITICAL/HIGH failure.
- Exit Code \`5\`: Gate 8 (Privacy/PII) CRITICAL/HIGH failure.

## SPDX License Policy Categories (\`license-policy.yaml\`)
- \`ALLOW\`: \`MIT\`, \`Apache-2.0\`, \`BSD-2-Clause\`, \`BSD-3-Clause\`, \`ISC\`, \`Unlicense\`, \`CC0-1.0\`, \`0BSD\`.
- \`REVIEW_REQUIRED\`: Weak copyleft (\`LGPL-*\`, \`MPL-2.0\`, \`EPL-2.0\`).
- \`DENY\`: Strong viral copyleft (\`GPL-*\`, \`AGPL-*\`).
- \`COMMERCIAL_APPROVAL_REQUIRED\`: \`SSPL-1.0\`, \`BSL-1.1\`.
`,
    },
  ],
  'aisdlc-bdd-gherkin': [
    {
      filename: 'gherkin-polyglot-matrix.md',
      content: `# Deterministic Polyglot Gherkin Matrix

## Supported Step Scaffolding Targets (\`--lang\`)
- \`ts\`: TypeScript (Vitest / Cucumber)
- \`py\`: Python (pytest-bdd / behave)
- \`go\`: Go (godog)
- \`rs\`: Rust (cucumber-rs)
- \`cs\`: C# / .NET (Reqnroll / SpecFlow)

## Mandatory Commands
1. Extract: \`npx aisdlc gherkin extract --all\`
2. Scaffold RED steps: \`npx aisdlc gherkin scaffold <feature-file> --lang <lang> --fallback\`
3. Verify sync: \`npx aisdlc verify gherkin\`
`,
    },
  ],
};
