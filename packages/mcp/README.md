# @aisdlc/mcp

MCP integration for **AI-SDLC**, enabling AI-SDLC capabilities to be exposed through the Model Context Protocol.

## What is AI-SDLC?

AI-SDLC is an AI-native Software Development Lifecycle framework focused on bringing engineering governance, traceability, and quality controls to AI-assisted software development.

The framework includes capabilities around:

- Requirements and specifications
- Software changes
- Verification
- Quality gates
- Traceability
- Engineering KPIs
- AI-assisted workflows
- Agent-based engineering
- MCP integration

`@aisdlc/mcp` provides the MCP integration layer for the framework.

## What is MCP?

The **Model Context Protocol (MCP)** provides a standardized way for AI applications to interact with external tools and context.

AI-SDLC uses MCP as an integration mechanism between AI clients and software-engineering capabilities.

## Installation

```bash
npm install @aisdlc/mcp
```

Or with pnpm:

```bash
pnpm add @aisdlc/mcp
```

## Role in AI-SDLC

The package sits between AI clients and the AI-SDLC core:

```text
              AI client
                  │
                  │ MCP
                  ▼
            @aisdlc/mcp
                  │
                  ▼
            @aisdlc/core
                  │
                  ▼
        AI-SDLC engineering
           capabilities
```

This separation keeps the MCP integration independent from the underlying core capabilities.

## Usage

The MCP package is intended to be used when integrating AI-SDLC capabilities with an MCP-compatible AI client or agent environment.

For the command-line entry point and local AI-SDLC workflows, see [`@aisdlc/cli`](https://www.npmjs.com/package/@aisdlc/cli).

### Running the Server

Start the MCP server using `npx` or through the AI-SDLC CLI:

```bash
# Direct execution with npx
npx @aisdlc/mcp

# Or via the CLI
aisdlc mcp
```

### Client Configuration

Add `@aisdlc/mcp` to your IDE or agent configuration (Claude Desktop, Cursor, Google Antigravity, VS Code):

```json
{
  "mcpServers": {
    "ai-sdlc": {
      "command": "npx",
      "args": ["-y", "@aisdlc/mcp"]
    }
  }
}
```

## Available MCP Tools

`@aisdlc/mcp` provides 23 deterministic tools divided into 4 functional categories:

### 1. Workflow & Scaffolding Tools (Consolidated Entrypoints)

| Tool | Description | Parameters |
| --- | --- | --- |
| `new` | Initializes a new project or configures AI-SDLC governance and structure in an existing repository (policies, templates, hooks, and optional CI). | `targetDir` *(string)*, `ci` *(enum: github, gitlab, azure, bitbucket)*, `dryRun` *(boolean)*, `agents` *(string)*, `architecture` *(enum: minimal, full, complete, none)* |
| `verify` | Executes deterministic AI-SDLC Quality Gates (all 9 gates in `full` profile, or essential gates [quality, security, licenses] in `lite` profile) in a consolidated run and returns overall repository health. | `root` *(string)*, `profile` *(enum: full, lite)* |
| `report` | Generates all AI-SDLC reports combined: interactive web dashboard with PDaC graph (HTML) and formal code quality report (Markdown). | `root` *(string)*, `dashboardOutput` *(string)*, `qualityPolicy` *(string)* |

### 2. Spec-Driven Development (SDD) Tools

| Tool | Description | Parameters |
| --- | --- | --- |
| `sdd_change_new` | Creates the full deterministic scaffolding for a new SDD change (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml`). | `name` *(string, required)*, `id` *(string)*, `profile` *(enum: patch, standard, critical)*, `framework` *(enum: openspec, speckit)*, `author` *(string)*, `from` *(string[])*, `root` *(string)* |
| `sdd_check_fix` | Deterministically synchronizes Gherkin scenarios to `.feature` files and updates PDaC SHA-256 digests without touching source code. | `root` *(string)* |
| `sdd_deposit` | Deposits or regenerates the canonical `handoff.yaml` (`HOF-*`) sidecar in an active SDD change. | `change` *(string, required)*, `title` *(string)*, `framework` *(enum: openspec, speckit)*, `requirements` *(string[])*, `useCases` *(string[])*, `root` *(string)* |
| `sdd_integrate` | Integrates and promotes a completed SDD change to the canonical baseline and archives its directory to `completed/`. | `change` *(string)*, `auto` *(boolean)*, `author` *(string)*, `root` *(string)* |
| `get_active_handoff` | Queries in-memory PDaC subgraph and contents of an active change for surgical context injection into the agent. | `change` *(string, required)*, `root` *(string)* |

### 3. Granular Verification Tools (Quality Gates)

| Tool | Description | Parameters |
| --- | --- | --- |
| `verify_quality` | Evaluates cyclomatic complexity, cognitive complexity, maintainability index, and function length against `quality-policy.yaml`. | `root` *(string)*, `maxCyclomatic` *(number)*, `maxCognitive` *(number)*, `minMaintainability` *(number)* |
| `verify_schemas` | Validates specification Markdown artifacts against canonical JSON Schemas (Draft 2020-12). | `root` *(string)* |
| `verify_security` | Executes deterministic secret scanning (Gitleaks) and SAST static analysis (command injection, SQLi, SSRF). | `root` *(string)*, `minSeverity` *(enum: CRITICAL, HIGH, MEDIUM)* |
| `verify_traceability` | Audits the 360° inverted traceability matrix (Upstream PDaC, Midstream arc42, Downstream BDD/tests). | `root` *(string)* |
| `verify_governance` | Audits task governance compliance and human autonomy classification modes (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, etc.). | `root` *(string)* |
| `verify_testing` | Audits that 100% of requirements and tasks have verifiable tests on disk. | `root` *(string)* |
| `verify_licenses` | Audits Open Source license compliance against `license-policy.yaml`. | `root` *(string)*, `policy` *(string)*, `depth` *(enum: direct, transitive)* |
| `verify_duplicates` | Audits identifier collisions, redundant normative statements, and specification overlaps. | `root` *(string)* |
| `verify_friction` | Evaluates progressive friction rules and anti-bypass guardrails (prevents patch-profile changes from modifying protected paths). | `change` *(string)*, `diffFiles` *(string[])*, `root` *(string)* |
| `verify_pdac` | Audits the product graph (Product Definition as Code) and deterministically verifies the absence of cryptographic drift in citations. | `root` *(string)*, `autoSync` *(boolean)* |

### 4. Reporting & Telemetry Tools

| Tool | Description | Parameters |
| --- | --- | --- |
| `report_dashboard` | Generates the interactive web dashboard and Cytoscape.js graph of the RTM / PDaC matrix at `reports/dashboard.html`. | `output` *(string)*, `title` *(string)*, `root` *(string)* |
| `report_quality` | Generates the formal polyglot code quality report at `reports/QUALITY_REPORT.md`. | `policy` *(string)*, `mode` *(enum: STRICT, PERMISSIVE)*, `root` *(string)* |
| `kpi_pr` | Calculates commit KPI aggregation and telemetry (human vs. AI agents) for a Pull Request. | `base` *(string)*, `head` *(string)*, `root` *(string)* |
| `kpi_release` | Calculates consolidated Release KPIs (Defect Injection Rate, rework ratio, KLoC volume, token costs, etc.). | `release` *(string, required)*, `base` *(string)*, `outputDir` *(string)*, `writeReports` *(boolean)*, `root` *(string)* |
| `git_detect_author` | Universally and IDE-independently detects whether the current author is human or an AI agent. | `root` *(string)* |

## Available Context Resources

The MCP server provides read-only context resources accessible via canonical `aisdlc://` URIs:

| Resource URI | MIME Type | Description |
| --- | --- | --- |
| `aisdlc://policies/quality` | `text/yaml` | Content of `quality-policy.yaml` (complexity thresholds, rules, gate limits). |
| `aisdlc://policies/licenses` | `text/yaml` | Content of `license-policy.yaml` (permitted, restricted, and blocked licenses). |
| `aisdlc://changes/active` | `application/json` | Structured list of active SDD changes in `specs/changes/active/` with task and handoff status. |
| `aisdlc://changes/completed` | `application/json` | List of completed and archived SDD changes in `specs/changes/completed/`. |
| `aisdlc://status/summary` | `application/json` | Consolidated repository status summary (handoffs count, policy file existence, timestamp). |

## Related packages

| Package | Purpose |
| --- | --- |
| [`@aisdlc/core`](https://www.npmjs.com/package/@aisdlc/core) | Core AI-SDLC capabilities |
| [`@aisdlc/mcp`](https://www.npmjs.com/package/@aisdlc/mcp) | MCP integration |
| [`@aisdlc/cli`](https://www.npmjs.com/package/@aisdlc/cli) | Command-line interface |

## AI-native engineering

AI-SDLC is designed around an important principle:

> AI-assisted development should increase engineering leverage without removing engineering controls.

MCP provides one of the integration mechanisms that makes this possible by allowing AI systems to interact with controlled engineering capabilities.

## Project

AI-SDLC is an open-source project.

**GitHub:** https://github.com/altromon/AI-SDLC

The repository contains the complete architecture, governance model, development processes, and documentation.

## Contributing

Contributions, issues, and architectural discussions are welcome.

Please see the GitHub repository for contribution guidelines and development information.

## License

See the repository license for the current licensing terms.
