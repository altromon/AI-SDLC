---
id: TSK-PLAN-CHG-058-POLYGLOT-PII-LOGGING
type: task-plan
change-id: CHG-058-POLYGLOT-PII-LOGGING
title: 'Desglose de Tareas Verificables: Polyglot PII Logging'
version: 1.1.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Red test primero (privacy-data-asset-fields.spec.ts): añadir DataAssetField a types/index.ts y extraer fields en parseDataAsset ignorando entradas malformadas y rechazando claves de prototipo (__proto__, constructor, prototype, toString, valueOf, hasOwnProperty); implementar resolveDisallowedLogFields usando Object.hasOwn(policy.classifications, key), normalizando -/_ en clasificaciones (confidential-pii->confidential_pii, special-category-sensitive->special_category_sensitive), normalizando campos a snake_case canónico O(n) en Map<string, string> y respetando sensitivity internal/public vs pii/sensitive/special'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/privacy-data-asset-fields.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-058-POLYGLOT-PII-LOGGING
    satisfies-requirements: &ref_0
      - FR-058-POLYGLOT-PII-LOGGING-001
      - PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
  - id: TSK-002
    title: 'Red test primero (privacy-polyglot-logs.spec.ts): implementar stripMaskingCalls O(n) (balanceo de paréntesis + conciencia de literales de cadena) aplicado antes de PRIV-001 y DATA-ASSET-*, escáner multilínea/paréntesis anidados con lineNumber exacto del argumento infractor en detectPolyglotLoggerCall (TS/JS console/_?logger|log|Logger, Python logging/_?logger|log|Logger/structlog/print, .NET _?logger|log|Logger.Log*/ILogger/Console.WriteLine/Serilog.Log, Java LOGGER|LOG|_?logger|log|Logger/System.out.println, Go slog.*/slog.*Context/zap/logrus/zerolog .Str/.Interface/log.Print*), normalización snake_case O(n) de tokens (Email->email, PhoneNumber/phoneNumber->phone_number, getNationalId->national_id) contra Map<string, string> ReDoS-safe, compatibilidad de 3 args + 4.º parámetro opcional en scanFileForPrivacyViolations, ai-sdlc:allow-pii/allow-sast/nosec y ci_gates.fail_on_pii_in_logs'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/privacy-polyglot-logs.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-058-POLYGLOT-PII-LOGGING
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: 'Red test primero (privacy-diagnostics-order.spec.ts): emitir PrivacyViolation con relPath, lineNumber, ruleId y message redactado (omitiendo/redactando snippet en PRIV-001 y PRIV-004 para no filtrar PII ni rootDir del host), deduplicar por (relPath, lineNumber, ruleId) y ordenar canonicamente todas las violaciones en verifyPrivacy por relPath, lineNumber y ruleId'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/privacy-diagnostics-order.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-058-POLYGLOT-PII-LOGGING
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: 'Regresion completa y umbrales de calidad: typecheck, pruebas unitarias/BDD, verify:quality (CC<=10, funcion<=40 lineas), verify:privacy y verify:all'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck && pnpm test && pnpm run verify:quality && pnpm run verify:privacy && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-003
    implements-components:
      - CMP-058-POLYGLOT-PII-LOGGING
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-058-POLYGLOT-PII-LOGGING

Cobertura: `CMP-058-POLYGLOT-PII-LOGGING`, `FR-058-POLYGLOT-PII-LOGGING-001` y `PRIV-REQ-058-POLYGLOT-LOG-MASKING-001`.
Orden secuencial: `TSK-001 -> TSK-002 -> TSK-003 -> TSK-004`. Cada tarea sigue TDD estricto (test en rojo primero).

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Creación inicial del plan de tareas con gobernanza | CHG-058-POLYGLOT-PII-LOGGING |
| **1.1.0** | 2026-11-14 | agent-system-architect | Desglose atómico TDD (TSK-001..TSK-004) cubriendo CMP-058, FR-058-001 y PRIV-REQ-058-001 | CHG-058-POLYGLOT-PII-LOGGING |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1 (Ronda 1) en TSK-001..TSK-003: stripper O(n) pre-PRIV-001, multilínea/zerolog/slog.*Context/LOG.*, snake_case O(n), prototipos/Object.hasOwn, redacción snippet, deduplicación y 4.º parámetro opcional | CHG-058-POLYGLOT-PII-LOGGING |
