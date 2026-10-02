# @aisdlc/core

Core library for **AI-SDLC**, an AI-native Software Development Lifecycle framework focused on engineering governance, traceability, quality gates and controlled AI-assisted software delivery.

[![npm](https://img.shields.io/npm/v/@aisdlc/core)](https://www.npmjs.com/package/@aisdlc/core)
[![npm downloads](https://img.shields.io/npm/dm/@aisdlc/core)](https://www.npmjs.com/package/@aisdlc/core)

## What is AI-SDLC?

AI-SDLC provides a structured approach to integrating AI into the software development lifecycle without losing engineering discipline, traceability or governance.

The framework is designed around concepts such as:

- Software Development Lifecycle governance
- AI-assisted engineering
- Traceability
- Quality gates
- Software requirements and specifications
- Change management
- Verification
- Engineering metrics and KPIs
- Agent-based workflows
- MCP integration

`@aisdlc/core` contains the core functionality used by the AI-SDLC ecosystem.

## Installation

```bash
npm install @aisdlc/core
```

Or with pnpm:

```bash
pnpm add @aisdlc/core
```

Or with yarn:

```bash
yarn add @aisdlc/core
```

## Usage

The core package is intended to be used as the foundation for AI-SDLC tooling, automation, and custom integrations.

```typescript
import {
  verifyQualityGate,
  verifyTraceability,
  verifySecrets,
  scaffoldSddChange,
  generateDashboardReport,
} from '@aisdlc/core';

// 1. Run the deterministic Quality Gate on the codebase
const qualityResult = verifyQualityGate({
  rootDir: process.cwd(),
});
console.log(`Quality gate passed: ${qualityResult.success}`);

// 2. Audit 360° Requirements Traceability Matrix
const traceResult = verifyTraceability({
  rootDir: process.cwd(),
});
console.log(`Missing test coverage count: ${traceResult.missingTests}`);

// 3. Scan for exposed credentials and high-entropy secrets
const secretResult = verifySecrets({
  rootDir: process.cwd(),
});
console.log(`Secret violations found: ${secretResult.violations.length}`);
```

## AI-SDLC architecture

The project separates the core engineering capabilities from its interfaces and integrations:

```text
                    AI-SDLC
                       │
             ┌─────────┴─────────┐
             │                   │
        @aisdlc/core       Integration layer
             │             ┌─────┴─────┐
             │             │           │
             │        @aisdlc/mcp  @aisdlc/cli
             │
             └──── Core engineering capabilities
```

This separation allows the core functionality to be reused by different interfaces and integrations.

## Core Capabilities

`@aisdlc/core` provides comprehensive domain logic, verification engines, and governance utilities across 7 functional categories:

### 1. Spec-Driven Development (SDD) & PDaC Architecture

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **Change Scaffolding** | Deterministically scaffolds active SDD change packages (`proposal.md`, `spec.md`, `design.md`, `tasks.md`) with correlative numbering and canonical `handoff.yaml` sidecar. | `scaffoldSddChange`, `getNextCorrelativeNumber`, `slugify` |
| **Product Handoff Sidecars** | Generates, deposits, and validates canonical `handoff.yaml` (`HOF-*`) sidecars with cryptographic SHA-256 citations across active changes. | `depositProductHandoffSidecar`, `loadProductHandoffSidecar`, `scanAllProductHandoffs` |
| **Change Integration & Promotion** | Promotes approved requirements to the active baseline, links architecture components, applies proposals, and archives change workspaces. | `integrateSddChange`, `verifySddIntegration`, `detectActiveChangeForIntegration` |
| **SDD Framework Adapters** | Polymorphic abstraction layer supporting multiple SDD specification formats (OpenSpec and SpecKit) seamlessly. | `getSddAdapter`, `OpenSpecAdapter`, `SpecKitAdapter` |
| **PDaC Graph & Cryptographic Drift** | Constructs the Product Definition as Code graph and audits SHA-256 digests across specifications to detect out-of-sync drift. | `verifyPdacGraph`, `syncPdacDigests`, `computeCanonicalSha256`, `extractCitations` |
| **Progressive Friction & Anti-Bypass** | Enforces governance gates based on change risk profile (`patch`, `standard`, `critical`) and prevents unauthorized modifications to protected core paths. | `verifyProgressiveFriction`, `detectProfileFromChange`, `isPathProtectedFromPatch` |

### 2. Quality Gates & AST Code Metrics

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **Deterministic Quality Gate** | Evaluates codebases against formal policies (`quality-policy.yaml`) across Cyclomatic Complexity, Cognitive Complexity, Maintainability Index, and function length. | `verifyQualityGate`, `createDefaultQualityPolicy`, `parseQualityPolicy` |
| **Polyglot & TypeScript AST Analysis** | Native AST-based function and class metric extraction for TypeScript/JavaScript, plus zero-heuristic parsing for Python, Go, Java, C#, C++, and Rust. | `extractFunctions`, `extractFunctionsTypeScriptAst`, `extractFunctionsPolyglot`, `calculateMetrics` |

### 3. Verification & Compliance Engines

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **360° Requirements Traceability Matrix** | Audits bidirectional traceability links between Upstream Product Handoffs (`HOF`), Midstream Arc42 Components (`CMP`), and Downstream Acceptance Tests (`.feature`). | `verifyTraceability`, `generateTraceabilityReportMarkdown`, `parseFrontmatter` |
| **Task Governance & Human Review Plans** | Audits task completion status, human review checklists, and autonomy classification levels (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, etc.). | `verifyTasksGovernance`, `generateGovernanceReportMarkdown`, `parseTasksDoc` |
| **Verification & Acceptance Test Coverage** | Verifies that 100% of defined requirements and engineering tasks have corresponding automated tests implemented on disk. | `verifyTestingCoverage`, `scanAllTestArtifacts`, `generateTestingCoverageReportMarkdown` |
| **Specification Schema Validation** | Validates Markdown frontmatter and structure against canonical JSON Schemas (Draft 2020-12) for proposals, specs, designs, and tasks. | `verifyArtifactsSchemas`, `validateArtifactSchema`, `validateAgainstSchema` |
| **Duplicate Requirements Detection** | Tokenizes and computes lexical similarity (Jaccard $\ge 85\%$), duplicate hashes, and BDD scenario collisions before code authoring. | `verifyArtifactDuplicates`, `calculateJaccardSimilarity`, `generateDuplicatesReportMarkdown` |
| **BDD Gherkin Synchronization** | Extracts ````gherkin```` blocks from Markdown specifications and synchronizes them to standalone executable `.feature` files under `tests/features/`. | `extractGherkinFeatures`, `checkGherkinInSync`, `extractGherkinBlock` |

### 4. Security & Software Supply Chain (SCA / SAST)

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **License Compliance & SCA** | Scans direct and transitive dependencies, maps SPDX identifiers against `license-policy.yaml`, and flags restricted/blocked licenses. | `verifyLicenses`, `scanInstalledLicenses`, `scanWithNativeFs`, `scanWithTrivy`, `scanWithSyft` |
| **SBOM & Third-Party Notices** | Generates enterprise-ready CycloneDX 1.5 JSON SBOMs and compiles complete markdown third-party license notices. | `generateCycloneDxSbom`, `writeCycloneDxSbom`, `generateThirdPartyNotices`, `writeThirdPartyNotices` |
| **Secret Scanning & Entropy Auditing** | Scans git diffs and codebase files for exposed API keys, private credentials, and high-entropy strings (Shannon entropy $\ge 4.3$). Supports Gitleaks CLI integration. | `verifySecrets`, `calculateShannonEntropy`, `runGitleaksCli`, `generateSecretsReportMarkdown` |
| **Static Application Security (SAST)** | AST and pattern analysis for OWASP Top 10 vulnerabilities (SQLi, command injection, SSRF, path traversal, prompt injection). Supports Semgrep CLI. | `verifySast`, `scanFileForSast`, `runSemgrepCli`, `detectPromptInjection` |

### 5. Git 4-Tier Workflow, Commit Trailers & Agent Detection

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **4-Tier Git Branch Management** | Classifies and orchestrates the 4-tier branch hierarchy (`main` $\rightarrow$ `release/*` $\rightarrow$ `feat/*` $\rightarrow$ `task/*`) to ensure isolation and discipline. | `classifyBranch`, `generateBranchHierarchyPlan` |
| **Automated Task Checkout** | Resolves task context from active SDD changes and automatically checkouts or cascades required branch tiers. | `checkoutTaskBranch`, `locateTaskInActiveChanges`, `resolveBranchHierarchy` |
| **Commit Trailer Engine** | Parses, formats, and validates standardized Git commit trailers (`Task-ID`, `Handoff-Digest`, `Model`, `Autonomy`). | `parseCommitTrailers`, `formatCommitTrailers`, `inferMissingTrailers`, `extractCommitKpisFromRange` |
| **AI Agent Author Detection** | Universally and IDE-independently detects whether git commits or active sessions originate from a human developer or an AI agent. | `detectAuthorIdentity` |
| **Git Hook Installer** | Programmatically installs deterministic Git hooks (e.g. `prepare-commit-msg`) for automated metadata injection. | `installGitHooks` |

### 6. Reporting, Engineering KPIs & Interactive Dashboard

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **Interactive Offline Dashboard** | Generates a 100% self-contained offline HTML dashboard with Cytoscape.js interactive graph for visualizing the full PDaC and RTM network. | `generateDashboardReport`, `buildGraphElements`, `renderDashboardHtml` |
| **Formal Code Quality Reporting** | Compiles granular polyglot code quality analysis into structured Markdown reports (`reports/QUALITY_REPORT.md`). | `generateQualityReport`, `writeQualityReport`, `calculateRating` |
| **Pull Request KPIs & Telemetry** | Calculates human vs. AI agent contribution ratios, review cycle duration, and token usage, formatting them for PR templates. | `aggregatePrKpis`, `formatPrKpiMarkdown`, `injectKpisIntoPrBody` |
| **Release KPIs & Defect Injection Rate** | Computes release-level engineering metrics, Defect Injection Rate (DIR) per author/model, rework costs, and defect density. | `aggregateReleaseKpis`, `formatReleaseKpiMarkdown`, `writeReleaseKpiReport` |

### 7. Repository Scaffolding & Governance Initialization

| Capability | Description | Primary Exports |
| --- | --- | --- |
| **AI-SDLC Project Bootstrapping** | Configures policies (`quality-policy.yaml`, `license-policy.yaml`), schemas, arc42 architecture templates, CI workflows, and AI agent rules. | `initProject`, `resolveAgentTargets`, `collectAgentFiles` |

## When should I use this package?

Use @aisdlc/core when you are:

- Building tooling on top of AI-SDLC
- Integrating AI-SDLC into an existing engineering platform
- Creating custom AI-assisted development workflows
- Developing extensions or integrations
- Building your own interface over the AI-SDLC capabilities

If you simply want to use AI-SDLC from the command line, start with [@aisdlc/cli](https://www.npmjs.com/package/@aisdlc/cli).

If you want MCP integration, see [@aisdlc/mcp](https://www.npmjs.com/package/@aisdlc/mcp).

## Related packages

| Package | Purpose |
| :--- | :--- |
| [@aisdlc/core](https://www.npmjs.com/package/@aisdlc/core) | Core AI-SDLC capabilities |
| [@aisdlc/cli](https://www.npmjs.com/package/@aisdlc/cli) | Command-line interface |
| [@aisdlc/mcp](https://www.npmjs.com/package/@aisdlc/mcp) | MCP integration |

## Project

AI-SDLC is an open-source project:

### GitHub: <https://github.com/altromon/AI-SDLC>

For architecture, governance, processes and the complete project documentation, see the repository.

## Contributing

Contributions, issues and architectural discussions are welcome.

Please see the GitHub repository for contribution guidelines and development information.

## License

See the repository license for the current licensing terms.
