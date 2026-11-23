---
name: aisdlc-inspector
description: >-
  Interactive technical inspector, AST symbol & semantic code search, and graph navigator across AI-SDLC requirements (FR-*, QR-*, SEC-REQ-*, PRIV-REQ-*), architecture components (CMP-*, ADR-*), SDD tasks (TSK-*, CHG-*), test suites, and source code files. Provides concise technical summaries, semantic ranking, upstream/downstream traceability mappings, and selectable navigation loops.
---

# aisdlc-inspector (360° Traceability Inspector & Graph Navigator)

Canonical Reference: [`process/06_spec_driven_development.md`](../../process/06_spec_driven_development.md), [`process/08_citation_contract_and_drift.md`](../../process/08_citation_contract_and_drift.md), and [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md).

## Purpose & Trigger
Use this skill whenever a user or agent requests to **inspect, search semantically, explain, trace, or navigate** any element or concept of the system:
- **Requirements & Product:** `UC-*`, `FR-*`, `QR-*`, `BR-*`, `BC-*`, `ABUSE-*`, `DATA-ASSET-*`, `PRIV-ROPA-*`, `ARCH-INTRO-*`.
- **Architecture & Decisions:** `CMP-*`, `ADR-*`, `SEC-ENC-*`.
- **SDD & Tasks:** `TSK-*`, `CHG-*`, `HOF-*`.
- **Source Code Files & AST Symbols:** `src/**/*.ts`, `packages/**/*.ts`, or exported function/class/interface names (e.g., `sanitizeDlpText`, `verifyQualityGate`).
- **Natural-Language Semantic Queries:** Multi-term functional or technical concepts (e.g., `"dlp sanitization"`, `"cyclomatic complexity ratchet"`, `"license sbom"`).
- **Verification Suites:** `.feature` BDD files, unit/integration specs.

This skill provides **semantic AST/graph search, impact analysis, context comprehension, and interactive graph exploration** with zero guesswork.

---

## Interactive Execution Playbook

### Step 1: Target or Semantic Query Resolution
1. Extract the target identifier, file path, code symbol, or natural-language concept query indicated by the user (e.g., `FR-001`, `CMP-CORE`, `src/auth/jwt.ts`, `TSK-001`, `sanitizeDlpText`, or `"dlp sanitization"`).
2. If no target or query was specified, prompt the user with common anchor options (e.g., primary Use Cases `UC-*`, Core Components `CMP-*`, or an open semantic search query).

### Step 2: Deterministic Inspection & Semantic AST/Graph Search Engine
Execute the inspection or semantic search via MCP or CLI (the engine automatically resolves exact IDs/paths first and falls back to multi-token AST symbol & PDaC graph semantic ranking):
* **Primary (MCP Tool):**
  Invoke MCP tool `inspect_element`:
  ```json
  {
    "query": "<target-id-path-symbol-or-semantic-query>"
  }
  ```
* **Fallback (CLI):**
  Run command:
  ```bash
  npx aisdlc inspect "<target-id-path-symbol-or-semantic-query>" --json
  ```

---

### Step 3: Complete Technical Report Delivery (MANDATORY FIRST)
> [!IMPORTANT]
> **CRITICAL UX DIRECTIVE (Report First, Question After):**
> The agent MUST always render and deliver the complete, detailed technical report to the user in visible text **BEFORE** prompting for the next element. Never invoke a blocking dialog or selector on an empty turn without the user having the full inspection visible.

The rendered response MUST contain:
1. **Header:** Artifact ID, Title, Type (`requirement`, `component`, `source-file`, `task`), Layer (`product`, `architecture`, `code`, `test`, `governance`), and Status (`COMPLIANT`, `ORPHAN`, `DRIFT`).
2. **File Location:** Clickable markdown link to the file.
3. **Technical Summary:** Concise explanation (2–4 sentences) of what the element does, its responsibilities, key interfaces, and consolidated evolutionary increments (`### Incremento (CHG-*)`). If a canonical requirement still shows boilerplate text despite completed changes in `specs/changes/`, run `sdd_integrate` with `all: true` (`npx aisdlc sdd integrate --all`) first so canonical requirements reflect the consolidated specification.
4. **Semantic & AST Symbol Ranking (when resolved via semantic/symbol search):**
   - 🔎 List top-ranked candidate files/nodes from `semanticMatches` with their relevance score and matched AST symbols (`matchedSymbols`).
5. **Upstream Relations (Derives from / Mitigates / Governed by):**
   - ↗️ List all parent requirements, use cases, business rules, or decisions that justify this element.
6. **Downstream Relations (Satisfied by / Implemented in / Verified by):**
   - ↘️ List all components implementing it, tasks developing it, and test suites validating it.
7. **Numbered Navigable Items:** Clear, numbered list of connected nodes (and alternative semantic matches) with their ID, type, and relationship.

---

### Step 4: Subsequent Navigation Formulation & Selector
Once the technical report is fully constructed:
1. Formulate the closing question inviting the user to continue navigating the graph.
2. If using the interactive selector (`ask_question`), execute it **in conjunction with or immediately following the complete report text**:
   * **Question:** *"¿Hacia qué elemento conectado deseas continuar la exploración?"*
   * **Options:** Formatted list of related elements from `relatedItems`:
     - `(Recommended) <ID-1> (<Type-1> — <relation-1>)`
     - `<ID-2> (<Type-2> — <relation-2>)`
     - `<ID-N> (<Type-N> — <relation-N>)`
     - `Auditar este elemento (<ID>) con agent-auditor + agent-adversary (Handoff → aisdlc-spot-audit)`
     - `Terminar exploración`
3. **Navigation & Audit Handoff Loop:**
   - When the user selects or indicates an element (either via UI selector or plain text/number), repeat **Step 2** with the new selection.
   - If the user selects `Auditar este elemento (<ID>) con agent-auditor + agent-adversary (Handoff → aisdlc-spot-audit)`, emit a Workflow Handoff transitioning directly into [`aisdlc-spot-audit`](../aisdlc-spot-audit/SKILL.md) targeting `<ID>`.
   - If the user selects `Terminar exploración`, summarize the traversal journey and conclude.
## Self-Contained References
- [`traceability-graph-legend.md`](./references/traceability-graph-legend.md)

