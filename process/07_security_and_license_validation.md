# 07. Deterministic Validation: Cybersecurity, Privacy, Licenses, and CI/CD Quality Gates

## 1. The Principle of Multilevel Verification

In an AI-agent driven development workflow, code can be produced at high velocity. To safeguard codebase integrity, validation is structured into **two complementary layers**:
1. **Deterministic Layer (CI/CD Gates)**: Static tools, linters, and algorithmic validators executing without AI intervention, yielding reproducible outcomes (same code, same verdict).
2. **Semantic and Adversarial Layer (Auditing Agents)**: Specialized AI agents that scrutinize code looking for business logic flaws, evasion vectors, privacy leaks, and architectural consistency.

---

## 2. The 12 Deterministic CI/CD Gates (Pipeline Gates)

Every Pull Request submitted by a human engineer or an AI agent must pass the following 12 automated gates:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC CI/CD PIPELINE (12 GATES)              │
└────────────────────────────────────────────────────────────────────────┘

 [GATE 1: CODE & AST QUALITY RELEASE GATE] (aisdlc verify quality)
  └─► Measures Cyclomatic Complexity (<=10), Cognitive Complexity (<=15), and Maintainability (>=50) using real AST.

 [GATE 2: DETERMINISTIC 360° TRACEABILITY MATRIX] (aisdlc verify traceability)
  └─► Verifies unbroken triangulation across PDaC handoff packages (HOF-*),
      arc42 / NAF v4 architecture views (CMP-*), and BDD/Gherkin scenarios and test suites.

 [GATE 3: TASK GOVERNANCE AND AUTONOMY] (aisdlc verify governance)
  └─► Audits autonomy modes (AUTONOMOUS, HUMAN_REVIEW_PLAN, HIGH_RISK_MANUAL) and verification criteria.

 [GATE 4: TEST AUDIT ON REQUIREMENTS AND TASKS] (aisdlc verify testing)
  └─► Verifies via reverse lookup that 100% of requirements have physical tests
      on disk (tagged .feature or .spec citing IDs) and deterministic verification commands.

 [GATE 5: BDD GHERKIN SYNCHRONIZATION GATE] (aisdlc verify gherkin)
  └─► Validates that test suite .feature files are 100% in sync with specification
      Gherkin scenarios with identical SHA-256 digests.

 [GATE 6: OSS LICENSE AUDIT AND SBOM GENERATION] (aisdlc verify licenses)
  └─► Native dynamic scan of installed dependencies against license-policy.yaml.
      Fails on viral (AGPL) or unapproved commercial licenses. Generates CycloneDX 1.5 SBOM.

 [GATE 7: CRYPTOGRAPHIC INTEGRITY AND PDAC DRIFT] (aisdlc verify pdac)
  └─► Verifies SHA-256 hashes of requirements cited in handoffs match canonical targets.

 [GATE 8: SCHEMA AND GRAPH VALIDATION] (aisdlc verify schemas)
  └─► Verifies frontmatter files and handoff.yaml sidecars comply with canonical JSON schemas (Draft 2020-12).

 [GATE 9: DUPLICATE AND COLLISION PRE-FLIGHT] (aisdlc verify duplicates)
  └─► Audits new requirements for collisions in IDs, identical normative text, or duplicate titles.

 [GATE 10: PROGRESSIVE FRICTION AND ANTI-BYPASS] (aisdlc verify friction)
  └─► Enforces risk-profile guardrails (patch, standard, critical) and prevents patch changes from touching protected paths.

 [GATE 11: SHIFT-LEFT SECURITY: SECRETS AND SAST] (aisdlc verify security)
  └─► Zero-tolerance for credentials, API keys, or tokens (Gitleaks Gate) and deterministic
      detection of AI-generated OWASP vulnerabilities (SQLi, exec, eval, SSRF, path traversal).

 [GATE 12: PRIVACY-BY-DESIGN AND PII-SAST AUDIT] (aisdlc verify privacy)
  └─► Audits DATA-ASSET-*, PRIV-ROPA-*, and PRIV-REQ-* against privacy-policy.yaml, enforces
      PII-SAST rules (PRIV-001 through PRIV-008), and generates ROPA_INVENTORY.md.
```

---

## 3. Shift-Left Security & Privacy Detailed Specification

### 3.1 Gate 11: Deterministic Secret Detection (`aisdlc verify secrets`)

Secret scanning prevents inadvertent credential leaks into the codebase:
- **Flexible Scan Scope**: Scan the entire working tree or strictly Git incremental diffs (`--diff`, optionally against a base branch using `--base <branch>`).
- **Zero-Dependency Hybrid Engine**:
  - Deterministic rules for RSA/EC/OpenSSH Private Keys, GitHub tokens, AWS Access Keys, OpenAI API Keys, Google API Keys, Slack Tokens, Stripe Keys, Bearer JWTs, and generic token assignments.
  - Heuristic **Shannon Entropy** filter to flag strings with suspicious randomness (default threshold $\ge 4.5$).
- **Gitleaks Integration (`--gitleaks`)**: Optional delegation to official `gitleaks` binary if available in the host environment or CI runner.
- **Secure Masking**: Secrets are never printed in plain text in console logs or reports (`AKIA...` ➔ `AKIA***************`).
- **Justified Suppression**: Specific false positives can be bypassed using the inline comment `// ai-sdlc:allow-secret`.
- **Formal Output**: Generates `reports/SECRET_SCAN_REPORT.md` and exits with **exit code 4** on violations.

### 3.2 Static Application Security Testing SAST (`aisdlc verify sast`)

To eradicate vulnerable code patterns common in LLM-synthesized code:
- **Detected Patterns**:
  - *SQL Injection*: Direct string concatenation in SQL queries without parameterized statements (`SAST-001`).
  - *Command Injection*: OS command execution (`exec`, `execSync`, `spawn` with active shell) interpolating variables (`SAST-002`).
  - *Dynamic Code Evaluation*: Insecure use of `eval(...)` or `new Function(...)` constructors (`SAST-003`).
  - *Server-Side Request Forgery (SSRF)*: Outbound HTTP requests where target URLs are built directly from unsanitized input (`SAST-004`).
  - *Path Traversal*: File system operations built with path concatenation without normalization or boundary checks (`SAST-005`).
  - *Prompt Injection (OWASP LLM01)*:
    - **Direct Concatenation**: Direct interpolation of variables or user input into LLM invocations or prompt templates without defensive delimiters (`SAST-006`).
    - **Jailbreak / System Override**: Adversarial signatures designed to bypass safety boundaries (*"ignore previous instructions"*, *"system override"*, *"DAN mode"*, delimiter breaches `</system>`) (`SAST-007`).
- **Universal Multilingual Coverage**: Deterministic scanning across general-purpose languages and templates: TypeScript/JavaScript (`.ts`, `.js`), Python (`.py`), C# (`.cs`), Java/Kotlin (`.java`, `.kt`, `.scala`), C/C++ (`.c`, `.cpp`, `.cc`), Go (`.go`), Rust (`.rs`), PHP (`.php`), Ruby (`.rb`), Swift (`.swift`), and `.prompt` templates.
- **Runtime Guard (`detectPromptInjection`)**: Utility function exported by `@ai-sdlc/core` for in-memory programmatic evaluation prior to calling models.
- **Justified Suppression**: Warnings can be suppressed via inline comment `// ai-sdlc:allow-prompt-injection` or `// ai-sdlc:allow-sast`.
- **Optional Semgrep Connector (`--semgrep`)**: Runs enterprise Semgrep rules across the repository if Semgrep is installed.
- **Formal Output**: Generates `reports/SAST_REPORT.md` and exits with exit code 1 if vulnerabilities are detected.

### 3.3 Gate 12: Privacy-by-Design & PII-SAST Verification (`aisdlc verify privacy`)

To guarantee continuous compliance with GDPR (EU) 2016/679, LOPDGDD, and ISO/IEC 27701 (`process/04b_data_protection_and_privacy.md`):
- **Artifact & Policy Governance (`privacy-policy.yaml`)**:
  - Verifies that every `DATA-ASSET-*` with classification `PII_IDENTIFIER`, `SENSITIVE_PII`, or `SPECIAL_CATEGORY` is covered by an active `PRIV-ROPA-*` record (`PRIV-005`).
  - Verifies that every `PRIV-ROPA-*` record declares a valid GDPR Art. 6.1 lawful basis and an explicit ISO 8601 or regime-based retention period (`PRIV-006`).
  - Enforces mandatory DPIA (`DPIA-*`) approval whenever `SPECIAL_CATEGORY` (GDPR Art. 9) data is processed (`PRIV-007`).
  - Blocks unauthorized cross-border data transfers outside `allowed-regions` unless a transfer mechanism (`SCC`, `ADEQUACY_DECISION`, `BCR`) is declared (`PRIV-008`).
- **Static PII-SAST Code Analysis**:
  - `PRIV-001` (*PII in Application Logs*): Detects logging calls (`console.*`, `logger.*`, `pino.*`, `winston.*`) printing raw PII fields (`email`, `dni`, `ssn`, `taxId`, `phone`, `iban`, `creditCard`, `passport`, `biometric`).
  - `PRIV-002` (*PII in URL Query Parameters*): Detects sensitive PII passed in query strings (`?email=`, `?dni=`, `?ssn=`, `?token=`).
  - `PRIV-003` (*Unredacted PII Sent to External LLM/AI Prompts*): Detects PII fields interpolated into external LLM/AI SDK payloads without anonymization/pseudonymization.
  - `PRIV-004` (*Hardcoded Real PII in Source or Fixtures*): Detects real national IDs, IBANs, or non-synthetic personal emails outside RFC 2606 reserved domains (`@example.com`, `@test.local`).
- **Justified Suppression**: Inline suppression via `// ai-sdlc:allow-privacy` for audited synthetic test cases.
- **Formal Output**: Generates `reports/ROPA_INVENTORY.md` (Art. 30 GDPR inventory) and `reports/PRIVACY_SCAN_REPORT.md`, exiting with **exit code 5** on violations.

---

## 4. Adversarial Audit Layer by AI Agents (`sec:audit` & `privacy:audit`)

Traditional static tools (SAST) excel at spotting known syntactic patterns (like a simple SQL injection), but struggle with **business logic vulnerabilities**, **horizontal privilege escalations**, **unlawful secondary data processing**, or nuanced **prompt injection vectors**.

To fill this gap, the pipeline invokes the **Security Auditor Agent (`agent-security-auditor`)** and **Data Protection & Privacy Officer Agent (`agent-privacy-officer`)**:
- **Input**: The Pull Request diff, associated abuse cases (`ABUSE-*`), security requirements (`SEC-REQ-*`), privacy requirements (`PRIV-REQ-*`), data assets (`DATA-ASSET-*`), and technical design (`design.md`).
- **Analysis**:
  - Is there an execution path where an unauthenticated user can invoke this endpoint?
  - Are boundary checks enforced on the backend and not solely on the client?
  - Are there calls to language models vulnerable to indirect prompt injection or leaking unredacted PII?
  - Do new database columns or DTO fields introduce undocumented PII (`DATA-ASSET-*`) without a lawful purpose (`PRIV-ROPA-*`)?
  - Do error messages or logs leak stack traces or confidential personal information?
- **Output**: Formal audit reports posted on the Pull Request. If critical security or privacy risks are detected, the agents block the merge until remediated.

---

## 5. Standardized Exit Codes

All process validation tools and scripts must adhere to standard exit codes:

| Code | Meaning | Pipeline Action |
| :---: | :--- | :--- |
| **0** | **Success (Pass)** | All verifications and gates passed. Ready for human review. |
| **1** | **Structural / Test Failure** | Unit test failure, syntax errors, or critical SAST vulnerability. |
| **2** | **Citation Drift (Stale)** | A canonical requirement or architecture block changed. Update spec. |
| **3** | **Legal / License Block** | Disallowed dependency or pending commercial acquisition request. |
| **4** | **Exposed Secret** | Credential or certificate detected by `verify secrets` in repo or diff. |
| **5** | **Privacy / Data Protection Block** | PII leak (`PRIV-001`–`PRIV-004`), missing RoPA (`PRIV-005`–`PRIV-006`), unapproved DPIA (`PRIV-007`), or forbidden cross-border transfer (`PRIV-008`). |
