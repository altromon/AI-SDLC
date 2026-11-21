---
name: aisdlc-release-compliance
description: Consolidate release milestones (release/vX.Y.Z), compute release KPIs (kpi_release), generate CycloneDX SBOMs and THIRD_PARTY_NOTICES.md, build Regulatory Compliance Evidence Bundles (EU AI Act, ISO 42001, NIST SSDF, OSCAL, in-toto), and apply highest-precedence SemVer promotion.
---

# aisdlc-release-compliance (Release Consolidation, SemVer & Regulatory Compliance Playbook)

Canonical Reference: [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md) and [`process/11_git_branching_and_lifecycle.md`](../../process/11_git_branching_and_lifecycle.md).

## Purpose & Trigger
Use this skill when **closing a release milestone (`release/vX.Y.Z`), preparing a regulatory/audit evidence bundle, generating SBOM/legal notices, or calculating consolidated SemVer bumps**.

## End-to-End Execution Playbook

### Step 1: Consolidated Quality, License & Supply Chain Verification
1. Run `npx aisdlc verify all` to confirm all 12 Quality Gates pass.
2. Generate CycloneDX 1.5 SBOM and legal attributions: `npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md`.

### Step 2: Regulatory Compliance Evidence Bundle
1. Generate the deterministic evidence bundle (EU AI Act, ISO 42001, NIST SSDF, OSCAL, in-toto provenance) via `npx aisdlc report compliance --strict --offline` (use `--dry-run` to preview, `--keyless` for OIDC attestation claims).
2. Verify `reports/audit-evidence-bundle.json` is valid and free of unmasked PII/secrets (DLP sanitized).

### Step 3: Release KPIs, Reports & Highest-Precedence SemVer
1. Compute release KPIs and DIR/rework metrics via MCP tool `kpi_release` (`npx aisdlc kpi release --release release/vX.Y.Z --base main`).
2. Regenerate canonical reports (`report_quality`, `report_dashboard`) on the release branch.
3. **Highest-Precedence SemVer Rule**: When consolidating multiple increments in a single release/PR, apply **ONLY one version bump** matching the highest friction profile (`critical` = Major, `standard` = Minor, `patch` = Patch).
4. Open the Release PR for human Tech Lead approval and SemVer tagging (never auto-approve or auto-merge).
## Self-Contained References
- [`regulatory-bundles-and-semver.md`](./references/regulatory-bundles-and-semver.md)

