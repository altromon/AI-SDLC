---
id: ABUSE-052-DIAGNOSTIC-COMMAND-INJECTION-001
type: abuse-case
title: Inyección de Comandos Arbitrarios en Detección de Runtimes y Toolchains
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-052-CLI-DOCTOR
stride-category: elevation-of-privilege
mitigated-by:
  - SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
asvs-controls:
  - V5.3 Output Encoding and Injection Prevention
  - V14.2 Build and Deployment Security
supersedes: null
superseded-by: null
---

# ABUSE-052-DIAGNOSTIC-COMMAND-INJECTION-001: Inyección de Comandos Arbitrarios en Detección de Toolchains

## 1. Vector de Ataque y Mecánica de Explotación
Un actor malicioso manipula el entorno del workspace local o variables de entorno (`PATH`, `NODE_OPTIONS`, `GIT_EXEC_PATH`, o parámetros pasados a flags de la CLI) para inyectar secuencias de comandos de shell arbitrarias cuando `aisdlc doctor` sondea las versiones de las herramientas del sistema (Node.js, pnpm, Git). Si el motor de diagnóstico invoca intérpretes de comandos mediante llamadas inseguras a `child_process.exec` pasando strings concatenados o shell interpolation (`cmd.exe /c` o `/bin/sh -c`), los metacaracteres inyectados se ejecutan con los mismos privilegios del proceso de diagnóstico, permitiendo ejecución remota o local de código (RCE) y escalamiento de privilegios.

## 2. Precondiciones del Ataque
- Invocación de `aisdlc doctor` o la herramienta MCP correspondiente en un entorno donde variables de entorno o rutas relativas hayan sido contaminadas.
- Implementación de sondeo de herramientas que utiliza un shell intermedio en lugar de invocación directa (`execFile`/`spawn`) con argumentos cerrados y binarios sanitizados.

## 3. Impacto Potencial
- Ejecución de código malicioso arbitrario en el contexto del desarrollador o del runner de CI.
- Compromiso de credenciales de sesión, claves privadas o artefactos en memoria.
- Escalamiento no autorizado de privilegios durante una supuesta operación diagnóstica de sólo lectura.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado inicial de abuso por inyección de comandos en sondeo de herramientas | CHG-052-CLI-DOCTOR |
