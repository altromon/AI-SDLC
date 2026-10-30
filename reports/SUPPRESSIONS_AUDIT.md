# 📋 Security Suppressions and Audit Exceptions Inventory

> **Generated at:** 2026-10-30T16:25:47.044Z
> **Total Audited Suppressions:** 4 | **Active:** 2 | **Expired:** 0 | **Invalid:** 2

## 1. Executive Summary

| Category | Count | Status | Policy Compliance |
| :--- | :---: | :---: | :--- |
| **Active Suppressions** | 2 | 🟢 PASS | Permitted until expiration date |
| **Expired Suppressions** | 0 | 🟢 PASS | Must be renewed or remediated immediately |
| **Invalid Suppressions** | 2 | ⚠️ REJECTED | Missing mandatory metadata fields |

## 2. Active Security Exceptions

| Engine | Rule / ID | Location | Details / Justification | Expires | Approved By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SECRET | `SEC-001` | `C:\Users\reypo\Documents\Workspace\AI-SDLC\packages\core\tests\security-suppressions.spec.ts:42` | Test fixture | 2099-01-01 | sec-lead@empresa.com |
| SAST | `PROMPT-INJ-MODE-OVERRIDE` | `packages/core/src/verifiers/sast.ts:394` | Regla interna de deteccion | 2099-12-31 | security@ai-sdlc.dev |

## 3. Expired or Invalid Exceptions (Blocking/Rejected)

| Engine | Rule / ID | Location | Details / Justification | Expires | Approved By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SECRET | *(all)* | `packages/cli/src/commands/check.ts:215` | Faltan campos obligatorios: reason, expires, approved-by | N/A | *(Sin aprobador)* |
| SECRET | *(all)* | `packages/core/src/verifiers/secrets.ts:584` | Faltan campos obligatorios: reason, expires, approved-by | N/A | *(Sin aprobador)* |
