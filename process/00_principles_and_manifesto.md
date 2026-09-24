# 00. AI-SDLC Manifesto and Core Principles

## 1. The AI-SDLC Manifesto

For decades, the slowest and most expensive phase of software development was writing code manually. Teams designed their processes around that bottleneck: condensed user stories, ephemeral Jira tickets, "just-in-time" specifications, and product knowledge scattered in the memory of a handful of senior engineers.

**The rise of AI-assisted engineering and autonomous agents fundamentally transforms the equation:**
> *An AI agent capable of generating thousands of lines of code in minutes amplifies the understanding it receives. If fed an ambiguous or decontextualized ticket, it will produce code rapidly, confidently, and plausibly... for a product nobody defined, backed by an incoherent architecture.*

The scarce resource is no longer the ability to type code; **the scarce resource is a rigorous, traceable product definition and system architecture worthy of being implemented**.

---

## 2. The 7 Governing Principles

### Principle 1: Everything "As-Code" and Git-Versioned
Product definition, technical architecture, cybersecurity policies, license rules, and delivery specifications all reside in the Git repository as structured plain text (Markdown with YAML frontmatter metadata). No single source of truth is scattered across external wikis or isolated databases.

### Principle 2: Symmetric Operability for Humans and Agents (Dual-Citizenship)
Every document or artifact generated across the process must satisfy two conditions:
- **Transparent and readable for a human** (clear Markdown prose, visual Mermaid diagrams).
- **Strictly computable for an AI agent** (formal JSON schemas, normalized immutable identifiers, typed fields).

### Principle 3: Separation of Deterministic Core and AI Reasoning
- **The deterministic core governs structure:** Schema validation, ID resolution, SHA-256 cryptographic digest computation, graph cycle detection, and linters are 100% deterministic. They produce the exact same outcome on any machine.
- **AI governs semantics:** Idea exploration, conceptual impact analysis, initial use case modeling, and test code generation are semantic tasks where agents excel as copilot assistants or autonomous executors under human supervision.

### Principle 4: Inalienable Human Authority in Approval and Merge
AI agents possess the capability to:
- Explore and propose deltas (`Product Changes`, `Specs`, `Code PRs`).
- Validate schemas and execute test suites.
- Identify risks and policy violations.

**However, no agent or automated software tool is ever permitted to self-approve, self-merge, or make business/risk decisions on behalf of the organization.** Product change approval and PR merge into the canonical branch are strictly human responsibilities.

### Principle 5: Cryptographic Citation Contracts (Drift-Free Architecture)
Delivery documents (SDD specifications, agent tasks, code) never rewrite or duplicate requirements or business rules. Instead, they **cite** them via their unique identifier (`id`) and the cryptographic digest (`SHA-256`) of the canonical content. If a requirement mutates in the canonical branch, dependent citations are automatically flagged as stale, eliminating silent drift.

### Principle 6: Shift-Left Cybersecurity by Default
Cybersecurity is never a reactive audit at the end of the development lifecycle. From product inception, threat actors (`ACT-THREAT-*`), abuse cases (`ABUSE-*`), and mitigation requirements (`SEC-REQ-*`) are modeled up front. During validation, deterministic gates (SAST, SCA, Secret Scanning) and adversarial audit agents verify every change prior to deployment.

### Principle 7: Proactive Open Source License Governance
External dependencies are formally evaluated against declarative policies (`license-policy.yaml`). Agents are strictly forbidden from introducing packages with viral licenses (GPL/AGPL) or commercial acquisition requirements without formal human legal and technical authorization.
