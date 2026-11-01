---
name: aisdlc-inspector
description: >-
  Interactive technical inspector and graph navigator across AI-SDLC requirements (FR-*, QR-*, SEC-REQ-*, PRIV-REQ-*), architecture components (CMP-*, ADR-*), SDD tasks (TSK-*, CHG-*), test suites, and source code files. Provides concise technical summaries, upstream/downstream traceability mappings, and selectable navigation loops.
---

# aisdlc-inspector (360° Traceability Inspector & Graph Navigator)

Canonical Reference: [`process/06_spec_driven_development.md`](../../process/06_spec_driven_development.md), [`process/08_citation_contract_and_drift.md`](../../process/08_citation_contract_and_drift.md), and [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md).

## Purpose & Trigger
Use this skill whenever a user or agent requests to **inspect, explain, trace, or navigate** any element of the system:
- **Requirements & Product:** `UC-*`, `FR-*`, `QR-*`, `BR-*`, `BC-*`, `ABUSE-*`, `DATA-ASSET-*`, `PRIV-ROPA-*`, `ARCH-INTRO-*`.
- **Architecture & Decisions:** `CMP-*`, `ADR-*`, `SEC-ENC-*`.
- **SDD & Tasks:** `TSK-*`, `CHG-*`, `HOF-*`.
- **Source Code Files:** `src/**/*.ts`, `packages/**/*.ts`, etc.
- **Verification Suites:** `.feature` BDD files, unit/integration specs.

This skill provides **impact analysis, context comprehension, and interactive graph exploration** with zero guesswork.

---

## Interactive Execution Playbook

### Step 1: Target Resolution
1. Extract the target identifier or file path indicated by the user (e.g., `FR-001`, `CMP-CORE`, `src/auth/jwt.ts`, `TSK-001`).
2. If no target was specified, prompt the user with common anchor options (e.g., primary Use Cases `UC-*`, Core Components `CMP-*`, or an open input).

### Step 2: Deterministic Inspection Engine
Execute the inspection via MCP or CLI:
* **Primary (MCP Tool):**
  Invoke MCP tool `inspect_element`:
  ```json
  {
    "query": "<target-id-or-path>"
  }
  ```
* **Fallback (CLI):**
  Run command:
  ```bash
  npx aisdlc inspect "<target-id-or-path>" --json
  ```

---

### Step 3: Complete Technical Report Delivery (MANDATORY FIRST)
> [!IMPORTANT]
> **CRITICAL UX DIRECTIVE (Report First, Question After):**
> The agent MUST always render and deliver the complete, detailed technical report to the user in visible text **BEFORE** prompting for the next element. Never invoke a blocking dialog or selector on an empty turn without the user having the full inspection visible.

The rendered response MUST contain:
1. **Header:** Artifact ID, Title, Type (`requirement`, `component`, `source-file`, `task`), Layer (`product`, `architecture`, `code`, `test`, `governance`), and Status (`COMPLIANT`, `ORPHAN`, `DRIFT`).
2. **File Location:** Clickable markdown link to the file.
3. **Technical Summary:** Concise explanation (2–4 sentences) of what the element does, its responsibilities, and key interfaces.
4. **Upstream Relations (Derives from / Mitiga / Alineado con):**
   - ↗️ List all parent requirements, use cases, business rules, or decisions that justify this element.
5. **Downstream Relations (Satisfied by / Implemented in / Verified by):**
   - ↘️ List all components implementing it, tasks developing it, and test suites validating it.
6. **Numbered Navigable Items:** Clear, numbered list of connected nodes with their ID, type, and relationship.

---

### Step 4: Subsequent Navigation Formulation & Selector
Once the technical report is fully constructed:
1. Formulate the closing question inviting the user to continue navigating the graph.
2. Present the selectable options cleanly (or trigger interactive selector tool) so the user can easily pick the next element:
   - Upstream dependencies
   - Downstream implementations and tests
   - Option to finish navigation
3. Loop back to Step 2 with the user's selected element.
