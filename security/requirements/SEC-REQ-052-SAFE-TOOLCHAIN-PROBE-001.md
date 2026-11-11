---
id: SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
type: security-requirement
title: Invocación Segura de Procesos de Sondeo de Toolchains sin Shell Intermedio
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-052-DIAGNOSTIC-COMMAND-INJECTION-001
compliance-references:
  - OWASP-ASVS-V5.3
  - OWASP-ASVS-V14.2
  - CWE-78-OS-Command-Injection
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001'
  - '@security'
  - '@mitigation'
  - '@doctor'
  - '@process-isolation'
supersedes: null
superseded-by: null
---


# SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001: Invocación Segura de Procesos de Sondeo sin Shell Intermedio

## 1. Enunciado del Control Técnico
Cuando el componente de diagnóstico `aisdlc doctor` sondee la presencia y versiones de runtimes y herramientas del sistema (Node.js, pnpm, Git CLI), DEBE ejecutar las llamadas de sondeo a través de `SafeProcessRunnerAdapter` implementando aislamiento determinista del entorno:
1. **Invocación Directa sin Shell**: DEBE utilizar exclusivamente `execFile` o `spawn` con `{ shell: false }` y matrices inmutables cerradas de argumentos (ej. `["--version"]`). Queda estrictamente PROHIBIDO el uso de `child_process.exec` o cualquier invocación con shell intermedio.
2. **Lista Blanca Inmutable de Ejecutables**: Solo se autorizan las herramientas explícitamente listadas: `node`, `pnpm` y `git`. Cualquier otro ejecutable DEBE ser rechazado con `ERR_UNAUTHORIZED_PROBE_TOOL`.
3. **Higienización Estricta del Entorno (Environment Sanitization & Whitelisting)**:
   - DEBE purgar activamente variables de inyección de código y hijacking: `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, y `GIT_EXEC_PATH`.
   - DEBE restringir el entorno hijo estrictamente a una lista blanca de variables esenciales del sistema: `PATH` (o `Path`), `SYSTEMROOT`, `TMP`, `TEMP`, `HOME`, `USERPROFILE`.
4. **Truncamiento Defensivo y Timeouts**: Las salidas capturadas DEBEN truncarse a un máximo de 1024 bytes (`maxBuffer: 1024`) y abortarse preventivamente tras 2000ms para evitar DoS o canales laterales.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-052-DIAGNOSTIC-COMMAND-INJECTION-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-052-CLI-DOCTOR` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-052-CLI-DOCTOR-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001 @security @mitigation @doctor @process-isolation
Feature: Invocación Segura de Sondeo de Herramientas sin Shell Intermedio
  As a Security Officer
  I want aisdlc doctor to probe toolchain versions without using shell interpreters
  So that malicious environment inputs cannot inject arbitrary OS commands

  Scenario: Invocación de herramientas con shell desactivado y argumentos cerrados
    Given a request to probe toolchain versions for "node", "pnpm", and "git"
    When the diagnostic probes are launched by the doctor runner
    Then each probe process must be invoked with "shell: false" and arguments array ["--version"]
    And no shell interpreter executable "/bin/sh" or "cmd.exe" is spawned

  Scenario: Purga de variables de entorno peligrosas en el proceso hijo
    Given an environment containing "NODE_OPTIONS=--require /tmp/malicious.js" and "LD_PRELOAD=/tmp/libevil.so"
    When the SafeProcessRunnerAdapter executes a toolchain probe
    Then "NODE_OPTIONS", "NODE_PATH", "LD_PRELOAD", "DYLD_INSERT_LIBRARIES", and "GIT_EXEC_PATH" must be purged from child process environment
    And only the sanitized whitelisted environment variables are provided

  Scenario: Rechazo de ejecutables no autorizados fuera de la lista blanca
    Given a request to diagnose an untrusted toolchain executable "evil_tool; rm -rf /"
    When the doctor probe scheduler evaluates the executable name
    Then the probe must be rejected with diagnostic "ERR_UNAUTHORIZED_PROBE_TOOL"
    And no process execution is attempted
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005, TSK-006) | chg-052-cli-doctor |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de control de prevención de inyección de comandos en sondeos | CHG-052-CLI-DOCTOR |
