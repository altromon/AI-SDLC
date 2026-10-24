---
id: DSG-CHG-043-SARIF-SECURITY-REPORTING
type: spec-design
change-id: CHG-043-SARIF-SECURITY-REPORTING
title: "Diseño Técnico: Generador SARIF 2.1.0 para Seguridad"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-043-SARIF-SECURITY-REPORTING"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: approved
contracts: []
citations:
  - id: UC-043-SARIF-SECURITY-REPORTING
    digest: sha256:4b471a7ae1b01f41f53947211715ff443c40e8f4bffd2af904a8212c2a3114a5
    comment: Citación de use-case (Generación de Reportes de Seguridad SAST y Secretos en Estándar OASIS SARIF 2.1.0)
  - id: FR-043-SARIF-SECURITY-REPORTING-001
    digest: sha256:c55b4dcaf97c2e0008ae85e023116f4afdcac36e2357caa8f744d503ee95d202
    comment: Citación de requirement (Generación de Reportes SARIF 2.1.0 para Verificaciones de Seguridad SAST y Secretos)
---

# Diseño Técnico: CHG-043-SARIF-SECURITY-REPORTING

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El módulo generador de SARIF se ubica en `@aisdlc/core` dentro de `packages/core/src/reporters/sarif.ts`. Orquesta la serialización estandarizada de resultados producidos por `packages/core/src/verifiers/sast.ts` y `packages/core/src/verifiers/secrets.ts`.
La capa de CLI (`packages/cli/src/commands/verify.ts`) invoca este reporter para persistir `reports/security.sarif` y procesar el flag `--format sarif`.

```mermaid
graph TD
    CLI[CMP-CLI: aisdlc verify security / all] -->|Ejecuta verificadores| VERIF[SAST & Secrets Verifiers]
    VERIF -->|SastVerifierResult & SecretVerifierResult| SARIF_REP[packages/core/src/reporters/sarif.ts]
    SARIF_REP -->|Genera documento SARIF 2.1.0| SARIF_FILE[reports/security.sarif]
    SARIF_FILE -->|Step en CI| GHAS[github/codeql-action/upload-sarif]
```

## 2. Contratos de Datos e Interfaces

```typescript
export type SarifLevel = 'error' | 'warning' | 'note' | 'none';

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration?: { level: SarifLevel };
  helpUri?: string;
  properties?: {
    tags?: string[];
    cwe?: string[];
    owasp?: string[];
  };
}

export interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string; uriBaseId?: string };
    region?: {
      startLine: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}

export interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: SarifLocation[];
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

export interface SarifDocument {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}
```

## 3. Mapeo de Severidades y Taxonomía CWE / OWASP

| Severidad AI-SDLC | Nivel SARIF | Mapeo CWE Típico | Mapeo OWASP |
| :--- | :--- | :--- | :--- |
| `CRITICAL` (SQLi, Command Inj, Eval, Key Leak) | `error` | CWE-89, CWE-78, CWE-95, CWE-798 | A03:2021-Injection, A07:2021-Identification |
| `HIGH` (SSRF, Path Traversal, JWT Leak) | `error` | CWE-918, CWE-22, CWE-522 | A10:2021-SSRF, A01:2021-Broken Access |
| `MEDIUM` (Weak Hashes, General Tokens) | `warning` | CWE-328, CWE-200 | A02:2021-Cryptographic Failures |
| `LOW` / `INFO` | `note` | CWE-200 | A05:2021-Security Misconfiguration |

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
La implementación no agrega ninguna dependencia externa; modela los tipos directamente y genera JSON conforme al estándar OASIS.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | agent-system-architect | Diseño técnico del reporter SARIF 2.1.0 | CHG-043-SARIF-SECURITY-REPORTING |
