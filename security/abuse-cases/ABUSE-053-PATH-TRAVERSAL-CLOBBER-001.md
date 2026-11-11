---
id: ABUSE-053-PATH-TRAVERSAL-CLOBBER-001
type: abuse-case
title: Sobreescritura Arbitraria de Archivos Mediante Path Traversal o Enlaces Simbólicos
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-053-CLI-MIGRATE
stride-category: elevation-of-privilege
mitigated-by:
  - SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
asvs-controls:
  - V5.5 File Path and Resource Handling
  - V14.2 Build and Deployment Security
supersedes: null
superseded-by: null
---

# ABUSE-053-PATH-TRAVERSAL-CLOBBER-001: Sobreescritura Arbitraria de Archivos Mediante Path Traversal o Enlaces Simbólicos

## 1. Vector de Ataque y Mecánica de Explotación
Un atacante o paquete malicioso suministra plantillas, esquemas o rutas de destino manipuladas conteniendo secuencias de escape de directorio (`../`, `..\`) o enlaces simbólicos (symlinks/junctions) que apuntan fuera de la raíz del repositorio. Cuando la herramienta de migración (`aisdlc migrate`) o el mecanismo de extracción de respaldo copia artefactos, resuelve las rutas relativas de manera insegura y escribe archivos arbitrarios fuera del límite del repositorio (ej. sobreescribiendo `.bashrc`, claves SSH en `~/.ssh/`, configuraciones del sistema o ejecutables del entorno de CI/CD), logrando elevación de privilegios y persistencia maliciosa.

## 2. Precondiciones del Ataque
- Invocación de `aisdlc migrate` con artefactos de origen o esquemas adulterados que contienen nombres de archivo con secuencias traversal o symlinks maliciosos.
- Ausencia de validación estricta de límites de contención canónica (`path.resolve` y verificación `startsWith(repoRoot)`) antes de operaciones de escritura en disco.

## 3. Impacto Potencial
- Sobreescritura de archivos críticos del sistema operativo o del perfil del usuario.
- Ejecución remota o local de código (RCE) y persistencia mediante el secuestro de archivos de configuración o scripts de inicialización.
- Compromiso total del runner de integración continua o de la estación de trabajo del desarrollador.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado de amenaza de path traversal y escalamiento de privilegios en migración | CHG-053-CLI-MIGRATE |
