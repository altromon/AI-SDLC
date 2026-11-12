---
id: BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
type: business-rule
version: "1.0.0"
schema-version: "1.0"
title: Ejecución Segura de CLIs Externos de Gestores de Paquetes
status: draft
enforcement-level: strict-invariant
supersedes: null
superseded-by: null
---

# BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION: Ejecución Segura de CLIs Externos

## 1. Declaración de la Regla
Todo CLI externo invocado por el escáner SCA (`pip-licenses`, `cargo`, `cargo-license`, `go`, `mvn`, `dotnet`, `pnpm`, `npm`) DEBE:
1. Ejecutarse SIN shell (`spawn`/`execFile` con array de argumentos; `shell: false`), con binario y argumentos de una lista cerrada, nunca interpolando datos del repositorio auditado.
2. Ejecutarse con `cwd` acotado a la raíz del proyecto auditado (o subdirectorio de manifiesto dentro de ella).
3. Tener timeout y límite de tamaño de salida; al excederlos se aborta el proceso y el resultado es `UNRESOLVED`.
4. Ser de solo lectura/offline: sin descargas de red (p. ej. flags offline como `--offline`/`GOFLAGS=-mod=mod` sin proxy) y sin goals que escriban o descarguen (`license:download-licenses` queda excluido).
5. Si el binario no existe o falla, degradar a `UNRESOLVED` con diagnóstico, nunca a error fatal ni a licencia inventada.

## 2. Nota de Modelo de Amenazas (STRIDE resumido)
| Amenaza | Vector | Mitigación |
| :--- | :--- | :--- |
| Elevation of Privilege / Tampering | Inyección de comandos vía nombre de paquete o ruta | Sin shell, args en array, validación de rutas |
| Tampering | Manifiestos o plugins maliciosos que ejecutan código (scripts de build, plugins Maven) | Solo subcomandos de lectura de metadatos; sin build/install |
| Denial of Service | CLI colgado o salida gigante | Timeout y límite de salida |
| Information Disclosure | Salida con rutas/secretos en informes | Sanitización de salida y trazas |
| Spoofing | Binario falso en PATH del repositorio | Resolución desde PATH del sistema, no desde el repo auditado |

## 3. Nivel de Aplicación
- **strict-invariant:** Requiere revisión de `agent-threat-modeler` antes de implementar.
