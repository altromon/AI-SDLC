# 03. Shift-Left Cybersecurity: Security-by-Design as Code

## 1. Vision and Shift-Left Approach

In modern systems, and specifically those assisted by autonomous agents, security cannot be relegated to static pre-production audits. **Cybersecurity must be natively modeled from the product definition and architecture phase (Security-by-Design as Code)**.

Every system defines who uses it legitimately (`ACT-*`); in AI-SDLC it is **mandatory** to also model who attempts to attack or compromise it (`ACT-THREAT-*`), how they attempt it (`ABUSE-*`), and what formal controls prevent it (`SEC-REQ-*`).

---

## 2. Cybersecurity Artifact Families

```
           ┌───────────────────────┐
           │ THREAT ACTOR (ACT-THREAT) │
           └───────────┬───────────┘
                       │ executes
                       ▼
           ┌───────────────────────┐
           │   ABUSE CASE (ABUSE)  │ ◄──── threat against ──── USE CASE (UC)
           └───────────┬───────────┘
                       │ classified by
                       ▼
           ┌───────────────────────┐
           │ THREAT MODEL (THREAT) │ (STRIDE / ASVS / MITRE)
           └───────────┬───────────┘
                       │ mitigated by
                       ▼
        ┌─────────────────────────────┐
        │ SECURITY REQUIREMENT (SEC)  │
        └──────────────┬──────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ ARCHITECTURE CONTROLS   │     │ SECURITY TESTS          │
│ (arc42 Sec. 8 / SEC-ENC)│     │ (SEC-TEST-* in CI/CD)   │
└─────────────────────────┘     └─────────────────────────┘
```

### 1. Threat Actors (`ACT-THREAT-*`)
- Adversary characterization: unauthenticated internet attacker, malicious insider with limited privileges, supply-chain attacker, etc.
- Attributes: motivation, resource level, potential access vectors.

### 2. Abuse Cases (`ABUSE-*`)
- Deliberate exploitation scenarios or anomalous behaviors targeting product confidentiality, integrity, availability, or authenticity.
- Every `ABUSE-*` must declare which legitimate use case (`targets-use-case: UC-*`) it attempts to exploit or subvert.

### 3. Threat Modeling STRIDE / OWASP ASVS (`THREAT-*`)
- Structured classification of attack vectors:
  - **S**poofing (Identity spoofing).
  - **T**ampering (Unauthorized data manipulation).
  - **R**epudiation (Repudiating executed actions).
  - **I**nformation Disclosure (Confidential data leakage).
  - **D**enial of Service (Service exhaustion / resource depletion).
  - **E**levation of Privilege (Privilege escalation).
- Direct mapping to OWASP ASVS verification levels (L1, L2, L3) or known CWEs.

### 4. Security Requirements (`SEC-REQ-*`)
- Technical and normative requirements derived directly to neutralize an `ABUSE-*`.
- Examples: Mandatory mTLS authentication, 90-day key rotation, AES-GCM-256 encryption at rest, strict prompt/input sanitization, distributed rate-limiting.

### 5. Policies and Trust Enclaves (`SEC-POL-*`, `SEC-ENC-*`)
- Architectural security boundaries: perimeter networks (DMZ), confidential data zones, secure enclaves with mutual authentication, and least-privilege Zero Trust policies.

---

## 3. Cryptographic Mitigation Traceability

To guarantee no threat remains unmitigated:
1. **Mandatory Graph Rule**:
   - Every `ABUSE-*` must be linked to at least one `SEC-REQ-*` via `mitigated-by`.
2. **Implementation Rule**:
   - Every delivery specification (`SPEC-*`) implementing a service or component must cite applicable `SEC-REQ-*`.
3. **Verification Rule (Threat-to-Test) and Inverted Traceability**:
   - Every implemented `SEC-REQ-*` must have at least one automated test (`SEC-TEST-*`, `.spec.ts`, or `.feature`) actively validating attack rejection or cryptographic control compliance.
   - Following the inverted traceability model, the `SEC-REQ-*` file stores no test paths; test files tag (`@SEC-REQ-*`) or cite the requirement in their headers, enabling reverse lookup and preserving the cryptographic immutability of the security specification.

---

## 4. Security Directory Structure

```text
docs/security/
├── actors/                               # ACT-THREAT-*.md
├── abuse-cases/                          # ABUSE-*.md
├── threats/                              # THREAT-*.md (STRIDE/ASVS modeling)
├── requirements/                         # SEC-REQ-*.md
├── policies/                             # SEC-POL-*.md (Zero Trust policies, etc.)
└── enclaves/                             # SEC-ENC-*.md (Trust boundaries & enclaves)
```
