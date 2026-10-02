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
| `aisdlc init [directory]` | Bootstraps a repository with AI-SDLC folders, JSON schemas, policy files (`quality-policy.yaml`, `license-policy.yaml`), CI/CD templates, and AI agent rules. | `-d, --dry-run`, `--ci <github\|gitlab\|azure\|bitbucket>`, `--agents <all\|cursor\|claude\|antigravity\|copilot\|mcp>`, `--arch <minimal\|full\|none>`, `--json` |
| `aisdlc check` | Unified pre-flight gate: runs Quality Gate checks with optional auto-repair (syncs Gherkin to `.feature` and recalculates PDaC SHA-256 digests). | `--fix`, `-r, --root <path>`, `--json`, `-F, --format <format>` |
| `aisdlc mcp` | Starts the native Model Context Protocol (MCP) server over `stdio` exposing 23 deterministic tools and 5 context resources. | `-r, --root <path>` |

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
| `aisdlc verify [all]` | Executes the consolidated CI/CD suite evaluating all 9 quality and governance gates simultaneously. | `-r, --root <path>`, `-p, --policy <path>`, `-C <max-cc>`, `-K <max-cog>`, `-M <min-mi>`, `-L <max-lines>`, `-m <mode>`, `--json` |
| `aisdlc verify quality` | AST-based release gate evaluating Cyclomatic Complexity ($\le 10$), Cognitive ($\le 15$), Maintainability ($\ge 50$), and function length ($\le 40$). | `-p, --policy <path>`, `-C, --max-cyclomatic <n>`, `-K, --max-cognitive <n>`, `-M, --min-maintainability <n>`, `-m <STRICT\|PERMISSIVE>`, `--json` |
| `aisdlc verify traceability` | Audits the 360° Requirements Traceability Matrix (Product HOF $\leftrightarrow$ Architecture CMP $\leftrightarrow$ Tests `.feature`). | `-r, --root <path>`, `--json` |
| `aisdlc verify governance` | Audits task governance, human review plans, and autonomy modes (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, etc.). | `-r, --root <path>`, `--json` |
| `aisdlc verify testing` | Audits that 100% of requirements and tasks have corresponding verifiable tests on disk. | `-r, --root <path>`, `--json` |
| `aisdlc verify licenses` | Audits Open Source license compliance against `license-policy.yaml` with dynamic SCA scan, CycloneDX 1.5 SBOM, and legal notices. | `-p, --policy <path>`, `--sbom [path]`, `--notices [path]`, `--tool <native\|trivy\|syft>`, `--depth <direct\|transitive>`, `--json` |
| `aisdlc verify pdac` | Verifies the Product Definition as Code graph and checks for cryptographic drift against SHA-256 digests. | `-r, --root <path>`, `--json` |
| `aisdlc verify schemas` | Validates specification Markdown artifacts against canonical JSON Schemas (Draft 2020-12). | `-p, --path <path>`, `-r, --root <path>`, `--json` |
| `aisdlc verify duplicates` | Detects redundant requirements, ID collisions, title lexical redundancy ($\ge 85\%$), and BDD overlaps before coding. | `-s, --similarity <number>` *(default: 0.85)*, `-r, --root <path>`, `--json` |
| `aisdlc verify security` | Unified shift-left security gate: deterministic secret scanning (Gitleaks) and SAST (OWASP Top 10 vulnerabilities). | `-d, --diff`, `-b, --base <branch>`, `-g, --gitleaks`, `-s, --semgrep`, `-e, --entropy <n>`, `-m, --min-severity <level>`, `--json` |
| `aisdlc verify secrets` | Scans for exposed credentials, API keys, tokens, and high-entropy secrets (Shannon entropy $\ge 4.3$). Fails with exit code 4. | `-d, --diff`, `-b, --base <branch>`, `-g, --gitleaks`, `-e, --entropy <n>`, `--json` |
| `aisdlc verify sast` | Static Application Security Testing for SQL injection, command injection, eval, SSRF, path traversal, and prompt injection. | `-s, --semgrep`, `-m, --min-severity <CRITICAL\|HIGH\|MEDIUM>`, `--json` |
| `aisdlc verify friction [change]` | Evaluates progressive friction and Anti-Bypass rules (verifies change scope matches risk profile: `patch`, `standard`, `critical`). | `-r, --root <path>`, `--json` |

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

# 5. Run the consolidated CI/CD verification suite (all 9 gates)
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
