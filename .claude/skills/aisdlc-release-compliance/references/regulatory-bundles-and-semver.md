# Release Compliance & SemVer Reference

## Regulatory Compliance Evidence Bundle
`npx aisdlc report compliance --strict --offline` generates `reports/audit-evidence-bundle.json` mapping all 12 Quality Gates to EU AI Act, ISO 42001, NIST SSDF, OSCAL, and in-toto provenance.

## Highest-Precedence SemVer Rule
When consolidating multiple increments in a single release or PR, apply **only one** version bump matching the highest friction profile:
`major` (Major `X.0.0`) > `minor` (Minor `x.Y.0`) > `patch` (Patch `x.y.Z`).
