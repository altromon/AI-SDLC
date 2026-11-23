# 360° Traceability Graph & Semantic AST Search Legend

## Node Statuses
- `COMPLIANT`: All upstream citations and downstream test/code links are valid and drift-free.
- `ORPHAN`: Missing upstream justification or downstream implementation/verification link.
- `DRIFT`: Upstream SHA-256 citation digest no longer matches the referenced artifact.

## Query Modes Supported by `inspect_element` / `aisdlc inspect`
- **Exact ID / Path**: `FR-001`, `CMP-CORE`, `TSK-001`, `packages/core/src/inspector/index.ts`.
- **AST Code Symbol**: Exported function, class, type, or interface name (e.g., `sanitizeDlpText`, `verifyQualityGate`).
- **Semantic Concept Query**: Multi-word query ranked across AST symbols, file paths, and PDaC specification nodes (e.g., `"dlp sanitization"`, `"cyclomatic ratchet"`).

## UX Rule (Report First, Question After)
Always render the full technical report (Header, File Location, Summary, Semantic Ranking when applicable, Upstream ↗️, Downstream ↘️, Numbered Items) before prompting for the next navigation step.
