---
id: FR-058-POLYGLOT-PII-LOGGING-001
type: requirement
title: polyglot-pii-logging
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-058-POLYGLOT-PII-LOGGING
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-058-POLYGLOT-PII-LOGGING-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-058-POLYGLOT-PII-LOGGING-001: polyglot-pii-logging

## 1. Enunciado Normativo
1. El sistema DEBE parsear los atributos `fields` (`name`, `sensitivity`) y `classification` de todos los artefactos `DATA-ASSET-*` descubiertos en el repositorio, cruzándolos con la sección `classifications` de `privacy-policy.yaml` para identificar los campos cuyo registro en logs esté prohibido (`allow_in_logs: false`).
   - Los campos con `sensitivity` marcada como `internal` o `public`, o pertenecientes a clasificaciones con `allow_in_logs: true`, DEBEN quedar excluidos de la lista de campos PII bloqueantes en logs.
2. El sistema DEBE detectar llamadas a loggers corporativos en archivos fuente políglotas (incluyendo llamadas multilínea y con paréntesis anidados mediante escáner acotado por profundidad de paréntesis que registre el `lineNumber` exacto de la línea del argumento infractor), cubriendo al menos:
   - **Python**: `logging.*`, `logger.*`, `structlog.*`, `print(...)`
   - **.NET / C#**: `ILogger`, `_?logger|log|Logger` (`Log*`), `Console.WriteLine(...)`, `Serilog.Log.*`
   - **Java (SLF4J / Log4j)**: `log.*`, `logger.*`, `LOGGER.*`, `LOG.*`, `System.out.println(...)`, `System.err.println(...)`
   - **Go**: `slog.*`, `slog.*Context`, `zap.*`, `logrus.*`, `zerolog.*` (incluyendo colas encadenadas `.Str(...)` / `.Interface(...)`), `log.Print*`
   - **JavaScript / TypeScript**: `console.*`, `logger.*`, `log.*`, `Logger.*`
3. El sistema DEBE eliminar expresiones de enmascaramiento (`mask(...)`, `redact(...)`, `pseudonymize(...)`, `sha256(...)`, `tokenize(...)`) mediante un stripper $O(n)$ con balanceo de paréntesis y conciencia de literales de cadena *antes* de evaluar tanto los patrones estáticos `PRIV-001` (`PRIV-001-PII-IN-LOGS`) como los campos dinámicos `DATA-ASSET-*`. Asimismo, DEBE normalizar a `snake_case` canónico en $O(n)$ tanto los nombres de campo de `DATA-ASSET-*` como los tokens extraídos del código (`Email` → `email`, `PhoneNumber`/`phoneNumber` → `phone_number`, `getNationalId` → `national_id`) antes de consultar el `Map<string, string>`, reportando en cada `PrivacyViolation` los campos `relPath`, `lineNumber`, `ruleId` y `message` sin filtrar valores PII literales (omitiendo/redactando `snippet` en `PRIV-001` y `PRIV-004`) y deduplicando por `(relPath, lineNumber, ruleId)`.
4. El sistema DEBE respetar las exenciones en línea (`ai-sdlc:allow-pii`, `ai-sdlc:allow-sast`, `nosec`) y la bandera de política `policy.ci_gates.fail_on_pii_in_logs` (cuando sea `false`, el escaneo de `PII_IN_LOGS` DEBE omitirse).
5. El sistema DEBE validar y escapar de forma segura los nombres de campo extraídos de `DATA-ASSET-*` (prohibido construir `new RegExp(rawField)` sin validación/escape que pueda provocar ReDoS; rechazar claves de prototipo `__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`; usar `Map` y `Object.hasOwn` en búsquedas de política), ignorar entradas de `fields` malformadas sin abortar el análisis, y ordenar todas las violaciones de manera determinista y canónica por `relPath` (ascendente lexicográfico), `lineNumber` (ascendente numérico) y `ruleId` (ascendente lexicográfico).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-058-POLYGLOT-PII-LOGGING-001 @automated @regression
Feature: polyglot-pii-logging
  As a DevSecOps engineer
  I want Gate 12 to cross-reference polyglot corporate logger calls against DATA-ASSET-* fields and privacy-policy.yaml
  So that unmasked PII leaks in logs are detected deterministically without ReDoS or false positives on allowed fields

  @nominal
  Scenario Outline: Polyglot corporate logger call with DATA-ASSET-* PII field is flagged
    Given a DATA-ASSET artifact declaring field "<field>" with sensitivity "pii" under classification "confidential-pii"
    And privacy-policy.yaml sets allow_in_logs to false for "confidential_pii"
    And a "<language>" file "<file>" logs "<field>" using "<statement>" on line 5
    When verifyPrivacy scans the repository
    Then a PrivacyViolation with ruleId "PRIV-001-PII-IN-LOGS", relPath "<file>", and lineNumber 5 is reported
    And the violation message does not leak raw PII values

    Examples:
      | language   | file              | field        | statement                                   |
      | python     | src/auth.py       | email        | logging.info("user=%s", user.email)         |
      | csharp     | src/Auth.cs       | phone_number | _logger.LogInformation("p={p}", phone_number) |
      | java       | src/Auth.java     | national_id  | LOGGER.warn("id={}", national_id);          |
      | go         | src/auth.go       | email        | slog.Info("login", "email", user.Email)     |
      | typescript | src/auth.ts       | phone_number | logger.error("failed", req.phone_number)    |

  @nominal
  Scenario: Violations from polyglot files are sorted canonically by relPath, lineNumber, and ruleId
    Given a DATA-ASSET artifact with PII field "email"
    And unmasked logger calls with "email" exist in "src/z.py:12" and "src/a.go:4"
    When verifyPrivacy scans the repository
    Then violations are returned in canonical order with "src/a.go:4" before "src/z.py:12"

  @boundary
  Scenario: Allowed internal/public fields, inline exemptions, and disabled gate do not trigger violations
    Given a DATA-ASSET artifact with internal field "operator_callsign" and pii field "email"
    And privacy-policy.yaml sets allow_in_logs to true for "internal"
    And "src/app.ts" logs "operator_callsign" on line 3 and logs "email" with "// ai-sdlc:allow-pii" on line 4
    When verifyPrivacy scans the repository
    Then 0 PII_IN_LOGS violations are reported for "src/app.ts"

  @boundary
  Scenario: Setting fail_on_pii_in_logs to false disables log PII scanning
    Given a DATA-ASSET artifact with PII field "email"
    And privacy-policy.yaml sets ci_gates.fail_on_pii_in_logs to false
    And "src/app.py" calls "logger.info(email)"
    When verifyPrivacy scans the repository
    Then 0 PII_IN_LOGS violations are reported

  @invalid
  Scenario: Malformed DATA-ASSET fields and regex-unsafe field names are handled safely without ReDoS
    Given a DATA-ASSET artifact containing malformed field entries and regex-unsafe field "(a+)+$"
    And "src/app.ts" contains "logger.info('ok')"
    When verifyPrivacy scans the repository
    Then the scan completes deterministically without throwing an error or triggering ReDoS
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004) | chg-058-polyglot-pii-logging |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque B: inspección políglota PII-SAST en logs) | CHG-058-POLYGLOT-PII-LOGGING |
| **0.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1 (Ronda 1): stripper O(n) pre-PRIV-001, multilínea/zerolog/slog.*Context/LOG.*, normalización snake_case, rechazo de claves de prototipo/Object.hasOwn, redacción de snippet y deduplicación | CHG-058-POLYGLOT-PII-LOGGING |
