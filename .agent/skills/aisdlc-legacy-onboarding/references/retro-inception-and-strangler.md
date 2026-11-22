# Legacy / Brownfield Retro-Inception Reference

## Read-Only Baseline Audit Commands
- Licenses & AST Quality: `npx aisdlc verify licenses` and `npx aisdlc report quality`
- Secrets & SAST: `npx aisdlc verify security` (exit code 4 = halt & rotate secrets immediately)
- Privacy & PII: `npx aisdlc verify privacy` (exit code 5 = PII in logs/prompts/seeds)

## Bounded Retro-Inception Rules
- Document only the system boundary (`ARCH-INTRO-001`, core `CMP-*`) and the specific domain under active evolution (`UC-*`, `FR-*`).
- **Zero Drive-By Rewrites**: Never mass-refactor untouched legacy modules. Apply the Strangler / Boy Scout rule via governed SDD tasks (`TSK-*`).
- **Characterization First**: Capture existing behavior in `FR-*` Gherkin scenarios before modifying logic.
