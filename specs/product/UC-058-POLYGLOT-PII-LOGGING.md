---
id: UC-058-POLYGLOT-PII-LOGGING
type: use-case
title: Inspección políglota de PII-SAST en logs cruzada con DATA-ASSET-* y privacy-policy.yaml
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SECURITY-GATE-INTEGRITY
supersedes: null
superseded-by: null
---


# UC-058-POLYGLOT-PII-LOGGING: Inspección políglota de PII-SAST en logs cruzada con DATA-ASSET-* y privacy-policy.yaml

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que el verificador de privacidad Gate 12 (`verifyPrivacy` / `aisdlc verify privacy`) inspeccione archivos fuente políglotas (TypeScript/JS, Python, Java, C#/.NET y Go) en busca de campos PII sin enmascarar dentro de llamadas a loggers corporativos, cruzándolos con los artefactos `DATA-ASSET-*` y las clasificaciones de `privacy-policy.yaml`
To detectar fugas de datos personales en logs de forma determinista, sin ejecución de código y reportando exactamente `relPath` y `lineNumber` antes de integrar cambios.

Contexto: issue #162, Bloque B (inspección políglota PII-SAST en logs cruzada con campos `DATA-ASSET-*` y `privacy-policy.yaml`).

## 2. Precondiciones
- Existe el archivo de política `privacy-policy.yaml` (o se aplican los valores por defecto seguros de `DEFAULT_PRIVACY_POLICY`), con `classifications` (`allow_in_logs`) y `ci_gates.fail_on_pii_in_logs`.
- Pueden existir cero o más artefactos `DATA-ASSET-*` en el repositorio con frontmatter YAML que declare `classification` y una lista `fields` (`name`, `sensitivity`).
- Existen archivos fuente en los directorios objetivo (`src`, `packages`, etc.) en uno o más lenguajes soportados (TS/JS, Python, Java, C#/.NET, Go).

## 3. Flujo Principal (Nominal)
1. El usuario o pipeline ejecuta Gate 12 (`verifyPrivacy` / `aisdlc verify privacy`).
2. El sistema carga `privacy-policy.yaml` e identifica las clasificaciones cuya política prohíbe el registro en logs (`allow_in_logs: false`, como `confidential_pii` y `special_category_sensitive`).
3. El sistema descubre los artefactos `DATA-ASSET-*` del repositorio, extrae de forma segura los campos (`fields[].name` y `fields[].sensitivity`) cuya sensibilidad o clasificación padre tenga `allow_in_logs: false`, y sanea/escapa los nombres de campo para evitar ReDoS.
4. El sistema recolecta los archivos fuente políglotas (TS/JS, Python, Java, C#/.NET, Go) y analiza línea a línea las invocaciones a loggers corporativos:
   - **Python**: `logging.*`, `logger.*`
   - **.NET / C#**: `ILogger`, `_logger.Log*`
   - **Java (SLF4J / Log4j)**: `log.*`, `logger.*`, `LOGGER.*`
   - **Go**: `slog.*`, `zap.*`, `logrus.*`, `log.Print*`
   - **JS / TS**: `console.*`, `logger.*`, `log.*`
5. Para cada llamada a logger sin exención vigente, el sistema cruza los argumentos contra los patrones estáticos `PRIV-001` (`PRIV-001-PII-IN-LOGS`) y contra los nombres de campo PII extraídos dinámicamente de `DATA-ASSET-*`.
6. Ante una coincidencia, el sistema registra una `PrivacyViolation` con `ruleId`, `relPath`, `lineNumber` y un `message` diagnóstico que no expone valores PII en claro, ordenando todas las violaciones canónicamente por `relPath`, `lineNumber` y `ruleId`.

## 4. Flujos Alternativos y de Excepción
- **A (Campos `internal` o `public` con `allow_in_logs: true`)**: los campos declarados con sensibilidad `internal` o `public` (o pertenecientes a clasificaciones con `allow_in_logs: true`), así como variables explícitamente enmascaradas/redactadas, no generan violación.
- **B (Exención explícita en línea)**: las líneas que contengan el marcador `ai-sdlc:allow-pii` (o `ai-sdlc:allow-sast` / `nosec`) quedan exentas del escaneo de logs.
- **C (Desactivación por política)**: si `privacy-policy.yaml` establece `ci_gates.fail_on_pii_in_logs: false`, el escaneo de PII en logs se omite sin emitir violaciones de tipo `PII_IN_LOGS`.
- **D (Entradas `DATA-ASSET-*` malformadas o nombres inseguros para regex)**: las entradas de `fields` no válidas (sin `name` string no vacío, longitud excesiva o caracteres fuera de identificador seguro) se descartan de forma segura o se escapan literalmente sin construir `new RegExp(rawField)` arbitrario, evitando cualquier riesgo de ReDoS.

## 5. Restricciones No Funcionales
- **Offline**: la inspección es 100 % estática y local, sin peticiones de red ni ejecución del código analizado.
- **Determinismo y ordenamiento canónico**: resultados idénticos ante las mismas entradas, ordenados canónicamente por `relPath` (lexicográfico ascendente), `lineNumber` (numérico ascendente) y `ruleId` (lexicográfico ascendente).
- **Cero ReDoS**: prohibido interpolar nombres de campo sin escapar o validar en expresiones regulares dinámicas; complejidad lineal acotada por línea.
- **No filtración en diagnósticos**: el campo `message` de la violación identifica la regla y el campo/patrón infringido sin volcar valores literales sensibles en reportes o logs de CI.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-058-POLYGLOT-PII-LOGGING @automated @privacy
Feature: Inspección políglota de PII-SAST en logs cruzada con DATA-ASSET-* y privacy-policy.yaml
  As a DevSecOps engineer
  I want Gate 12 (verifyPrivacy) to inspect polyglot logger calls against DATA-ASSET-* PII fields and privacy-policy.yaml
  So that unmasked personal data leaks in logs are caught deterministically across all supported languages

  @nominal
  Scenario Outline: Llamada a logger corporativo con campo PII de DATA-ASSET-* es detectada en lenguaje políglota
    Given a DATA-ASSET artifact with confidential-pii field "<field>"
    And privacy-policy.yaml sets allow_in_logs to false for confidential_pii
    And a "<language>" source file logs "<field>" via "<logger_call>" at line 10
    When verifyPrivacy executes Gate 12
    Then a PII_IN_LOGS violation is reported with exact relPath and lineNumber 10

    Examples:
      | language   | logger_call                    | field        |
      | python     | logger.info(user.email)        | email        |
      | csharp     | _logger.LogInformation(dni)    | dni          |
      | java       | LOGGER.info(phone_number)      | phone_number |
      | go         | slog.Info("u", "tax_id", tax)  | tax_id       |
      | typescript | console.info(customer.email)   | email        |

  @boundary
  Scenario: Campo internal con allow_in_logs true o línea con ai-sdlc:allow-pii no dispara violación
    Given a DATA-ASSET artifact with internal field "operator_callsign"
    And privacy-policy.yaml sets allow_in_logs to true for internal
    And a source file logs "operator_callsign" and another line logs "email" with "ai-sdlc:allow-pii"
    When verifyPrivacy executes Gate 12
    Then zero PII_IN_LOGS violations are reported

  @invalid
  Scenario: Entradas malformadas o nombres inseguros para regex en DATA-ASSET-* se manejan sin ReDoS
    Given a DATA-ASSET artifact with malformed field entries and regex-unsafe field name "(a+)+$"
    And a source file contains corporate logger calls
    When verifyPrivacy executes Gate 12
    Then the verifier completes deterministically without throwing or experiencing ReDoS
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004) | chg-058-polyglot-pii-logging |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque B: inspección políglota PII-SAST en logs) | CHG-058-POLYGLOT-PII-LOGGING |
