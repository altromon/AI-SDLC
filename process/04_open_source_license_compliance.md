# 04. Open Source License Governance and Compliance: Free Use vs. Commercial Acquisition

## 1. Intellectual Property Vision and Risk

Indiscriminate dependency usage by human developers or AI agents exposes the organization to severe legal and financial risks:
1. **Viral Infection Risk (Strong Copyleft / AGPL)**: Legal mandate requiring proprietary source code disclosure.
2. **Commercial Infringement Risk (Dual-License / Source-Available / BSL / SSPL)**: Unauthorized usage of software requiring license payments or commercial subscriptions for production or SaaS environments.
3. **Missing Attribution Risk**: Non-compliance with permissive license terms by omitting copyright and permission notices.

AI-SDLC implements a **License Compliance as Code** framework backed by continuous deterministic evaluation.

---

## 2. 5-Category License Taxonomy

Every direct or transitive dependency is classified into one of the following five operational categories:

```
┌────────────────────────────────────────────────────────────────────────┐
│               OPEN SOURCE AND THIRD-PARTY LICENSE TAXONOMY             │
└────────────────────────────────────────────────────────────────────────┘

 [CATEGORY A: PERMISSIVE (FREE COMMERCIAL USE)] ────────► ALLOWLIST
  │ Examples: MIT, Apache-2.0, BSD-2/3, ISC, Unlicense, CC0, MS-PL (.NET)
  └─► Permit commercial use, modification, and closed distribution. Attribution only.

 [CATEGORY B: WEAK COPYLEFT (CONDITIONED USE)] ─────────► CONDITIONAL REVIEW
  │ Examples: LGPL-2.1/3.0, MPL-2.0, EPL-2.0, CDDL, MS-RL (.NET), MS-LPL, MS-LRL
  └─► Permitted only if consumed as an external dynamic library or separate module.

 [CATEGORY C: STRONG / VIRAL COPYLEFT] ─────────────────► DENYLIST
  │ Examples: GPL-2.0/3.0, AGPL-3.0, EUPL, OSL
  └─► PROHIBITED in proprietary software or SaaS to prevent mandatory source disclosure.

 [CATEGORY D: DUAL / SOURCE-AVAILABLE / PAID] ──────────► COMMERCIAL ACQUISITION
  │ Examples: SSPL (MongoDB), BSL (Redis/Terraform), Elastic-2.0, Commercial
  └─► VISIBLE BUT NOT FREE: Requires formal procurement and commercial license payment.

 [CATEGORY E: UNKNOWN / AMBIGUOUS] ─────────────────────► HARD BLOCK
  │ Examples: Missing LICENSE file, non-standard licenses ("JSON License")
  └─► IMMEDIATE BLOCK: Prohibited until formal legal resolution.
```

---

## 3. Guardrails for AI Agents in Package Selection

AI agents acting as developers (`agent-developer`) or architects must strictly observe the following operational guardrails:

1. **Mandatory Pre-Inspection**:
   - Before suggesting or adding a package to manifests (`package.json`, `pom.xml`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.), the agent must inspect package license metadata in the official registry.
2. **Automatic Rejection of Viral Licenses**:
   - If a package uses GPL or AGPL, the agent **must not add it**. It must actively search for and propose an alternative with a permissive license (MIT or Apache-2.0).
3. **Detection and Notification of Paid Licenses (Category D)**:
   - If a package operates under BSL, SSPL, or a commercial dual-license model, the agent **must output an explicit warning** in the proposal or Pull Request:
   > ⚠️ **COMMERCIAL LICENSE ALERT**: Package `[name]` uses the `[license]` license. Its use in this product requires **formal commercial license acquisition or payment agreement**. Approval from legal and procurement leads is required before proceeding.
4. **Validation Against `license-policy.yaml`**:
   - The agent must verify that the license SPDX identifier is explicitly listed under the `permissive_free` section of the local policy.

---

## 4. Commercial License Acquisition Flow

When a critical capability requires a Category D library:

```text
 Need for Commercial Dependency
               │
               ▼
 Agent files Request / PR tagged 'needs-commercial-license'
               │
               ▼
 Human Review: Tech Lead + Legal Counsel + Procurement Lead
               │
        ┌──────┴──────┐
        ▼             ▼
  [ REJECTED ]   [ APPROVED ]
        │             │
        │             ▼
        │       Commercial license formal procurement / payment
        │             │
        │             ▼
        │       Formal exception logged in docs/compliance/adrs/
        │             │
        ▼             ▼
  Search for    Package added to manifest with formal purchase
  alternative   record registered
```

---

## 5. Deterministic Validation in CI/CD and SBOM Generation

On every CI pipeline run and pre-flight gate (`aisdlc check`):
1. **Dynamic Dependency Inspection (SCA)**:
   - The native `@ai-sdlc/core` engine inspects the installed package tree (`node_modules` and `.pnpm` store) without requiring hand-crafted manifests.
   - Resolves `package.json` metadata, identifies license files (`LICENSE`, `LICENSE.md`, `LICENSE.txt`), normalizes SPDX identifiers, and analyzes compound expressions (`AND`/`OR`).
2. **SBOM (Software Bill of Materials) Generation**:
   - Compiles the full direct and transitive dependency inventory in standard **CycloneDX 1.5 JSON** format (`reports/sbom.cdx.json`).
3. **Automated Scanning and Classification Against `license-policy.yaml`**:
   - Each package is evaluated against permitted (`permissive_free`), restricted (`weak_copyleft_conditional` / `commercial_acquisition_required`), and denylisted (`strong_copyleft_viral`) lists.
   - If any denylisted (unexcepted GPL/AGPL) or unknown license is detected, the pipeline **fails immediately (exit code 1)**.
4. **Automated Legal Attribution Generation**:
   - Generates the derived `THIRD_PARTY_NOTICES.md` artifact compiling authors, copyrights, repository URLs, and permissive license texts for legal compliance.

---

## 6. Practical Tutorial: Dynamic License Audit and SBOM Generation

### Step 1: Local Dynamic Audit
To verify compliance across the full dependency tree before committing code or opening a Pull Request:

```bash
# Standard execution (native node_modules inspection)
npx aisdlc verify licenses

# Restricted inspection for production direct dependencies only
npx aisdlc verify licenses --depth direct
```

Expected terminal output:
```text
🔍 [AI-SDLC] Verifying Open Source License Compliance (SCA)...
  Evaluated dependencies:   408
  Compliant dependencies:   408
  License violations:       0
  Generated CycloneDX SBOM: reports/sbom.cdx.json
  Generated legal notices:  THIRD_PARTY_NOTICES.md

✔ OSS License Governance COMPLIANT
```

### Step 2: Custom CycloneDX 1.5 SBOM Generation
When exporting an SBOM file to a specific destination for security platforms (such as Dependency-Track or Snyk):

```bash
npx aisdlc verify licenses --sbom build/artifacts/sbom.cdx.json
```

The generated file strictly complies with the CycloneDX 1.5 specification:
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "serialNumber": "urn:uuid:...",
  "metadata": {
    "timestamp": "2026-09-17T...",
    "tools": [{ "vendor": "AI-SDLC", "name": "@ai-sdlc/core", "version": "1.0.0" }]
  },
  "components": [
    {
      "type": "library",
      "name": "fast-logger",
      "version": "2.1.0",
      "purl": "pkg:npm/fast-logger@2.1.0",
      "licenses": [{ "license": { "id": "MIT" } }]
    }
  ]
}
```

### Step 3: Legal Attribution Notice Generation
To generate the formal copyright and license text summary for product distribution:

```bash
npx aisdlc verify licenses --notices dist/THIRD_PARTY_NOTICES.md
```

### Step 4: Optional External Tool Integration (Trivy / Syft)
In environments requiring additional corporate scanning tools installed on the system or CI Docker image:

```bash
# Scan via Aqua Security Trivy
npx aisdlc verify licenses --tool trivy

# Scan via Anchore Syft
npx aisdlc verify licenses --tool syft
```
*Note*: If the specified tool is unavailable in `PATH`, the CLI transparently falls back to the native engine with an informational notice.

### Step 5: Managing Exceptions and Restricted Licenses
If a legitimate dependency operates under an approved dual or commercial license (e.g. `BSL-1.1`), register the formal exception in `license-policy.yaml`:

```yaml
exceptions:
  approved_commercial_packages:
    - package: "@corporate/enterprise-connector"
      license: "BSL-1.1"
      reason: "APPROVED_BY_LEGAL_REF_ADR_004"
```
Upon re-running `aisdlc verify licenses`, the package is accepted as justified without blocking the release gate.
