# Greenfield Inception Quick Reference

## Phase 0 Discovery Interview (Up to 15 Questions)
1. **Mission & Problem**: Core business problem and measurable success criteria.
2. **Primary Actors (`ACT-*`)**: Human roles and external systems.
3. **Interaction Modality (`ARCH-INTRO-001`)**: Web UI, Desktop GUI, Console/TUI/CLI, Mobile, or Headless API/SDK (never library-only when human actors exist).
4. **Delivery & Operation Model**: Cloud SaaS, Self-Hosted/On-Premise, Local Desktop/CLI, or SDK package.
5. **Visual Aesthetic Standard**: Bootstrap 5-style responsive Web, modern rounded/elevated Desktop, or colorized rich Console/TUI.
6. **Master Data CRUD**: Foundational catalogs/entities needed to operate core flows without manual DB seeding.
7. **MVP Use Cases (`UC-*`) & Quality Goals (`QR-*`)**: Strict MVP core vs. roadmap backlog.

## Upstream Artifact Chain
`ARCH-INTRO-001` -> `ACT-*` / `JRN-*` / `UC-*` / `BR-*` / `FR-*` / `QR-*` -> `agent-expert-user` (Design Mode) -> `ACT-THREAT-*` / `ABUSE-*` / `SEC-REQ-*` -> `DATA-ASSET-*` / `PRIV-ROPA-*` / `PRIV-REQ-*` -> `CMP-*` / `ARCH-DEP-001` / `ADR-*` -> Checkpoint 1 (`agent-auditor` || `agent-adversary`).
