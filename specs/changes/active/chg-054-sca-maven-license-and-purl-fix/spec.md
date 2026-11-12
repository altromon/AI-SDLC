---
id: SPEC-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: delivery-spec
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
profile: patch
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX"
  - "@patch"
  - "@automated"
citations:
  - id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
    digest: sha256:df41e18920b9cf5700455fc6e3c1912bf4a18ca6851fe3dcd26126744ea1b08d
    comment: Citación de use-case (Corrección de herencia de licencia Maven y PURL por ecosistema en SBOM)
  - id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
    digest: sha256:b04c529f81e43f4180efcb711788c285680da5ba92f413c0edf888b238305050
    comment: Citación de requirement (sca-maven-license-and-sbom-purl-fix)
verification:
  method: automated-test
  command: pnpm test
---

# Delivery Specification (Fast Patch): CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

## 1. Patch Scope and Justification
SCA Maven license and PURL fix

## 2. Acceptance and Correction Criteria (BDD Gherkin)

```gherkin
@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX @patch @automated
Feature: Patch CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX - SCA Maven license and PURL fix
  Scenario: Defect fix verification
    Given the system exhibits the defect identified in "SCA Maven license and PURL fix"
    When the patch fix is applied
    Then the anomalous behavior is resolved and verification passes
```

## 3. Automated Verification
- **Command**: `pnpm test`
- **Criteria**: All unit and regression tests must pass.
