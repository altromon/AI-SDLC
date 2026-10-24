# @aisdlc/cli

Command-line interface for **AI-SDLC**, an AI-native Software Development Lifecycle framework for governed, traceable, and quality-driven AI-assisted software engineering.

## What is AI-SDLC?

AI-SDLC is a framework for integrating AI into the software development lifecycle while maintaining engineering discipline.

It combines AI-assisted development with practices such as:

- Requirements and specifications
- Change management
- Verification
- Quality gates
- Traceability
- Engineering KPIs
- Git-based workflows
- Agent-based engineering
- MCP integration

The CLI provides the main command-line entry point to these capabilities.

## Installation

### Global installation

```bash
npm install -g @aisdlc/cli
```

Then:

```bash
aisdlc --help
```

### Local installation

```bash
npm install @aisdlc/cli
```

Or:

```bash
pnpm add @aisdlc/cli
```

## Quick start

After installation, run:

```bash
aisdlc --help
```

The CLI provides commands covering different parts of the AI-SDLC lifecycle.

## Commands

The `aisdlc` CLI provides comprehensive commands across 6 functional categories of the AI-SDLC lifecycle:

### 1. Project Initialization & Workflow Pre-Flight

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc init [directory]` | Bootstraps a repository with AI-SDLC folders, all 34 canonical JSON schemas (Draft 2020-12), 38 base starter templates (Product, Security, Privacy, Safety, Manuals, Compliance, SDD, CI), Pull Request templates, policies (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`), and AI agent configs (11 specialized agents). Unconditionally generates universal MCP configurations (`antigravity.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`). Non-destructively injects standard npm scripts into consumer `package.json`. In interactive TTY mode, prompts for CI/CD provider, architecture level, and AI agent targets. | `-d, --dry-run`, `--ci <github\|gitlab\|azure\|bitbucket\|none>`, `--agents <all\|cursor\|claude\|antigravity\|copilot\|mcp\|none>`, `--arch <minimal\|full\|none>`, `--json`, `-F, --format <format>` |
| `aisdlc check` | Unified pre-flight gate: runs Quality Gate checks with optional auto-repair (syncs Gherkin to `.feature` and recalculates PDaC SHA-256 digests). | `--fix`, `-r, --root <path>`, `--json`, `-F, --format <format>` |
| `aisdlc mcp` | Starts the native Model Context Protocol (MCP) server over `stdio` exposing 24 deterministic tools and 6 context resources. | `-r, --root <path>` |

#### Repository Bootstrapping (`aisdlc init`)

Running `aisdlc init` (or `npx @aisdlc/cli init`) delivers a turnkey governance environment:
1. **Interactive Guided Prompts (TTY mode)**:
   - **CI/CD Provider**: GitHub Actions (default / recommended), GitLab CI, Azure DevOps Pipelines, Bitbucket Pipelines, or None.
   - **Architecture Granularity**: Minimal / Baseline (default: `ARCH-INTRO-*`, `CMP-*`, `ADR-*`), Full (all 12 arc42 sections), or None.
   - **AI Agents**: All (Cursor, Claude Code, Antigravity, Copilot, MCP - recommended) or granular environments.
2. **Universal MCP Integration**: Regardless of CI provider or agent selection, automatically scaffolds `.cursor/mcp.json`, `antigravity.mcp.json`, and `.vscode/mcp.json` preconfigured for `@aisdlc/mcp`.
3. **Canonical Starter Templates**: Deploys 38 templates into `templates/` (product, security, privacy, safety, manuals, compliance, SDD, and CI/CD reference templates).
4. **JSON Schemas (Draft 2020-12)**: Scaffolds all 34 schemas under `schemas/` and provides automatic in-memory fallback during verification if disk files are deleted.
5. **Pull Request Templates**: Deposits `.github/PULL_REQUEST_TEMPLATE.md` with non-negotiable Plan Execution Matrix (`[X]` vs `[O]`), Weak Points hotspots, and automated KPI tables.
6. **Automatic Script Injection**: Non-destructively registers standard shortcuts in consumer `package.json` (`check`, `check:fix`, `verify:quality`, `verify:privacy`, `verify:all`, `change:new`).

### 2. Spec-Driven Development (SDD) & Change Management

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc change new <name>` | Scaffolds a new SDD change package (`proposal.md`, `spec.md`, `design.md`, `tasks.md`) with a canonical `handoff.yaml` sidecar. | `--from <ids...>`, `--id <changeId>`, `-p, --profile <patch\|standard\|critical>`, `-f, --framework <openspec\|speckit>`, `-a, --author <author>`, `--json` |
| `aisdlc sdd new <name>` | Alias of `aisdlc change new`. | Same options as `change new` |
| `aisdlc sdd deposit` | Deposits or regenerates the canonical `handoff.yaml` (`HOF-*`) sidecar with cryptographic citations for an active change. | `-c, --change <id>` *(required)*, `-f, --framework <framework>`, `-t, --title <title>`, `--requirements <reqs>`, `--use-cases <ucs>`, `--json` |
| `aisdlc sdd verify` | Validates structural and cryptographic integrity of `handoff.yaml` sidecars across active changes. | `-f, --framework <framework>`, `-r, --root <path>`, `--json` |
| `aisdlc sdd integrate` | Promotes completed requirements to `active`, updates architecture component links, marks proposal as `applied`, and archives the change. | `--auto` *(detects change from git context)*, `-c, --change <id>`, `-a, --author <author>`, `--no-archive`, `--json` |

### 3. Verification & Quality Gates (`aisdlc verify`)

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc verify [all]` | Executes the consolidated CI/CD suite evaluating all 12 quality and governance gates simultaneously. | `-r, --root <path>`, `-p, --policy <path>`, `-C <max-cc>`, `-K <max-cog>`, `-M <min-mi>`, `-L <max-lines>`, `-m <mode>`, `--json` |
| `aisdlc verify quality` | AST-based release gate evaluating Cyclomatic Complexity ($\le 10$), Cognitive ($\le 15$), Maintainability ($\ge 50$), and function length ($\le 40$). | `-p, --policy <path>`, `-C, --max-cyclomatic <n>`, `-K, --max-cognitive <n>`, `-M, --min-maintainability <n>`, `-m <STRICT\|PERMISSIVE>`, `--json` |
| `aisdlc verify traceability` | Audits the 360° Requirements Traceability Matrix (Product HOF $\leftrightarrow$ Architecture CMP $\leftrightarrow$ Tests `.feature`). | `-r, --root <path>`, `--json` |
| `aisdlc verify governance` | Audits task governance, human review plans, and autonomy modes (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, etc.). | `-r, --root <path>`, `--json` |
| `aisdlc verify testing` | Audits that 100% of requirements and tasks have corresponding verifiable tests on disk. | `-r, --root <path>`, `--json` |
| `aisdlc verify gherkin` | Verifies that `.feature` files match specification Gherkin scenarios with identical SHA-256 digests. | `-p, --path <path>`, `-a, --all`, `-r, --root <path>`, `--json` |
| `aisdlc verify licenses` | Audits Open Source license compliance and CVE vulnerabilities against `license-policy.yaml` with dynamic SCA scan, CycloneDX 1.5 SBOM, and legal notices. | `-p, --policy <path>`, `--sbom [path]`, `--notices [path]`, `--tool <native\|trivy\|syft>`, `--depth <direct\|transitive>`, `--vuln`, `--vuln-max-critical <n>`, `--vuln-max-high <n>`, `--json` |
| `aisdlc verify pdac` | Verifies the Product Definition as Code graph and checks for cryptographic drift against SHA-256 digests. | `-r, --root <path>`, `--json` |
| `aisdlc verify schemas` | Validates specification Markdown artifacts and `handoff.yaml` sidecars against canonical JSON Schemas (Draft 2020-12). | `-p, --path <path>`, `-r, --root <path>`, `--json` |
| `aisdlc verify duplicates` | Detects redundant requirements, ID collisions, title lexical redundancy ($\ge 85\%$), and BDD overlaps before coding. | `-s, --similarity <number>` *(default: 0.85)*, `-r, --root <path>`, `--json` |
| `aisdlc verify friction [change]` | Evaluates progressive friction and Anti-Bypass rules (verifies change scope matches risk profile: `patch`, `standard`, `critical`). | `-r, --root <path>`, `--json` |
| `aisdlc verify security` | Unified shift-left security gate: deterministic secret scanning (Gitleaks), SAST (OWASP Top 10), and audited exception comments. | `-d, --diff`, `-b, --base <branch>`, `-g, --gitleaks`, `-s, --semgrep`, `-e, --entropy <n>`, `-m, --min-severity <level>`, `--audit-suppressions`, `--suppressions-report <path>`, `--json` |
| `aisdlc verify privacy` | Gate 12: Audits Data Protection & Privacy-by-Design (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`, `DPIA-*`) and PII-SAST rules (`PRIV-001`–`PRIV-008`) against `privacy-policy.yaml`. Exits with code 5 on violations. | `-r, --root <path>`, `-p, --policy <path>`, `--no-reports`, `--json` |
| `aisdlc verify secrets` | Scans for exposed credentials, API keys, tokens, and high-entropy secrets (Shannon entropy $\ge 4.3$). Fails with exit code 4. | `-d, --diff`, `-b, --base <branch>`, `-g, --gitleaks`, `-e, --entropy <n>`, `--json` |
| `aisdlc verify sast` | Static Application Security Testing for SQL injection, command injection, eval, SSRF, path traversal, and prompt injection. | `-s, --semgrep`, `-m, --min-severity <CRITICAL\|HIGH\|MEDIUM>`, `--json` |

### 4. Git 4-Tier Branch Management (`aisdlc git`)

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc git checkout <task>` | Locates task in active SDD changes and automatically cascade-creates 4-tier branches: `main` $\rightarrow$ `release/*` $\rightarrow$ `feat/*` $\rightarrow$ `task/*`. | `-r, --root <path>` |
| `aisdlc git plan` | Previews and plans the visual 4-tier Git branch hierarchy tree for a given release, feature, and task list. | `-r, --release <version>`, `-f, --feature <feature>`, `-t, --tasks <tasks>` |
| `aisdlc git validate <branch>` | Validates strict branch naming conventions according to its Tier (1 to 4). | `<branch>` |
| `aisdlc git hook install` | Installs the `prepare-commit-msg` Git hook for automated commit trailer injection (`Task-ID`, `Handoff-Digest`, `Model`). | `-r, --root <path>` |
| `aisdlc git detect-author` | Universally and IDE-independently detects whether the current commit author is a human or an AI agent. | `--json`, `-r, --root <path>` |

### 5. Reporting & Engineering KPIs (`aisdlc report` & `aisdlc kpi`)

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc report dashboard` | Generates a 100% offline, self-contained interactive web dashboard and Cytoscape.js PDaC/RTM visualizer at `reports/dashboard.html`. | `-o, --output <path>`, `-t, --title <title>`, `--open` |
| `aisdlc report quality` | Generates a formal polyglot code quality report in Markdown format at `reports/QUALITY_REPORT.md`. | `-p, --policy <path>`, `-m, --mode <STRICT\|PERMISSIVE>`, `-C, -K, -M, -L` thresholds |
| `aisdlc kpi pr` | Computes aggregated Pull Request telemetry table (human vs. agent authorship ratio, review time, token usage) for PR templates. | `-b, --base <branch>`, `-h, --head <branch>`, `-u, --update-file <path>`, `--json` |
| `aisdlc kpi release` | Calculates consolidated Release metrics: Defect Injection Rate (DIR) per model/human, defect density, and rework costs. | `--release <branch>` *(required)*, `-b, --base <branch>`, `-o, --output <dir>`, `--json` |

### 6. BDD & Gherkin Requirements Synchronization (`aisdlc gherkin`)

| Command | Description | Key Options |
| --- | --- | --- |
| `aisdlc gherkin extract` | Extracts ````gherkin```` blocks from Markdown specifications and synchronizes them to `.feature` files under `tests/features/`. | `-p, --path <path>`, `-a, --all`, `--json`, `-F, --format <format>` |

### Automated Code Coverage Ingestion (.NET / Polyglot)

`aisdlc report quality` and `aisdlc report dashboard` passively ingest test coverage from standard locations:
- `coverage/lcov.info` or `reports/lcov.info` (LCOV format)
- `coverage/coverage-summary.json` or `reports/coverage-summary.json` (Istanbul/JSON summary format)

#### Setting up .NET / C# projects:
1. Ensure `coverlet.collector` is installed in your test project (`*.Tests.csproj`):
   ```xml
   <PackageReference Include="coverlet.collector" Version="6.*">
     <PrivateAssets>all</PrivateAssets>
     <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
   </PackageReference>
   ```
2. Collect coverage and convert Cobertura XML to LCOV format via **ReportGenerator**:
   ```bash
   # Run tests collecting coverage
   dotnet test --collect:"XPlat Code Coverage"

   # Convert to LCOV for AI-SDLC ingestion
   reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coverage" -reporttypes:lcov
   ```
3. Generate reports:
   ```bash
   aisdlc report quality
   aisdlc report dashboard --open
   ```

### Common Workflow Examples

```bash
# 1. Initialize a new project with CI/CD and AI agent configurations
aisdlc init --ci github --agents all --arch minimal

# 2. Scaffold a new feature change citing an upstream use case
aisdlc change new "Real-Time Telemetry" --from UC-STREAM-TELEMETRY

# 3. Create and switch to the task branch in 4-tier hierarchy
aisdlc git checkout TSK-001

# 4. Run pre-flight check with auto-fix (syncs Gherkin and digests)
aisdlc check --fix

# 5. Run the consolidated CI/CD verification suite (all 12 gates)
aisdlc verify all

# 6. Generate the interactive web dashboard and open it in the browser
aisdlc report dashboard --open

# 7. Promote and integrate the change into the canonical baseline
aisdlc sdd integrate --auto
```

For the complete command syntax and full help for any command:

```bash
aisdlc --help
aisdlc verify --help
aisdlc git --help
```

## How it fits together

The CLI is the main developer-facing entry point:

```text
                     Developer
                         │
                         ▼
                    aisdlc CLI
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
            Check      Verify     Report
              │          │          │
              └──────────┼──────────┘
                         │
                         ▼
                    @aisdlc/core
                         │
                         ▼
                    AI-SDLC model
```

MCP provides an additional integration path for AI clients:

```text
       AI client
           │
          MCP
           │
           ▼
     @aisdlc/mcp
           │
           ▼
     @aisdlc/core
```

## Why AI-SDLC?

AI-assisted development changes how software can be produced.

AI-SDLC focuses on the complementary problem:

**How do we introduce AI into software engineering without losing control of the engineering process?**

The framework approaches this through explicit processes, quality controls, traceability, and machine-assisted verification.

## Related packages

| Package | Purpose |
| --- | --- |
| [`@aisdlc/cli`](https://www.npmjs.com/package/@aisdlc/cli) | Command-line interface |
| [`@aisdlc/core`](https://www.npmjs.com/package/@aisdlc/core) | Core capabilities |
| [`@aisdlc/mcp`](https://www.npmjs.com/package/@aisdlc/mcp) | MCP integration |

## Project architecture

The complete AI-SDLC architecture is maintained in the GitHub repository.

**GitHub:** https://github.com/altromon/AI-SDLC

The repository contains the complete architecture, governance model, development processes, and documentation.

## Contributing

Contributions, issues, and architectural discussions are welcome.

Please see the GitHub repository for contribution guidelines and development information.

## License

See the repository license for the current licensing terms.
