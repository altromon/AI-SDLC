---
id: MAN-PROD-001
type: production-manual
title: "Manual de Producción y Operaciones: Nombre de la Aplicación"
status: draft
version: "1.0.0"
schema-version: "1.0"
applies-to-version: "v1.0.0"
target-audience:
  - devops-engineer
  - sre-engineer
  - release-manager
  - secops
components-covered:
  - CMP-NOMBRE-001
enclaves-involved:
  - SEC-ENC-DMZ-001
supersedes: null
superseded-by: null
---

# MAN-PROD-001: Manual de Producción y Operaciones - Nombre de la Aplicación

## 1. Regeneración Determinista de Releases (Reproducible Builds)

Esta sección contiene las especificaciones y directivas necesarias para reproducir de forma determinista e idéntica bit a bit cualquier artefacto o release de la aplicación a partir de su etiqueta Git.

### 1.1 Línea Base de Código Fuente

- **Repositorio Canónico**: `https://github.com/organizacion/nombre-repo.git`
- **Etiqueta Git Inmutable (Release Tag)**: `v1.0.0`
- **Commit SHA-256 / SHA-1**: `[COMMIT_SHA_HEXADECIMAL_VERIFICADO]`
- **Comando de Checkout Limpio**:
  ```bash
  git clone --recurse-submodules https://github.com/organizacion/nombre-repo.git
  cd nombre-repo
  git checkout tags/v1.0.0
  git submodule update --init --recursive
  ```

### 1.2 Matriz de Herramientas de Compilación y Toolchains Congeladas

Para evitar discrepancias en la generación de binarios o paquetes, se exige el uso estricto de las versiones fijadas de las siguientes utilidades:

| Herramienta / Runtime | Versión Exacta | Checksum / Digest de Toolchain | Propósito |
| :--- | :--- | :--- | :--- |
| **Node.js LTS** | `v22.12.0` | `sha256:node-v22.12.0-linux-x64.tar.xz` | Entorno de ejecución y transpilación |
| **pnpm** | `9.15.0` | `sha256:pnpm-v9.15.0` | Gestor de paquetes determinista monorepo |
| **TypeScript (tsc)** | `5.7.2` | Fijado en `devDependencies` | Compilador estricto a ECMAScript |
| **Docker BuildKit** | `v0.18.0` | `moby/buildkit:v0.18.0` | Motor de empaquetado hermético OCI |

### 1.3 Librerías, Dependencias y Grafo de Vértices

- **Archivo de Bloqueo Inmutable (Lockfile)**: `pnpm-lock.yaml` (o `Cargo.lock`, `go.sum`, `requirements.lock`). Prohibido ejecutar instalaciones con resolución abierta (`pnpm install --frozen-lockfile` obligatorio).
- **Inventario SBOM (Software Bill of Materials)**:
  - Formato: CycloneDX JSON v1.5 / SPDX v2.3.
  - Ruta de SBOM compilado: `reports/sbom-cyclonedx.json`.
- **Gobernanza de Licencias OSS**:
  - Política vinculante: `license-policy.yaml`.
  - Verificación previa de vértices de librerías:
    ```bash
    pnpm verify:licenses
    ```

### 1.4 Procedimiento Determinista de Compilación Paso a Paso

1. **Paso 1: Instalación Hermética de Dependencias**
   ```bash
   pnpm install --frozen-lockfile --ignore-scripts
   ```

2. **Paso 2: Verificación de Integridad y Tipado Estricto**
   ```bash
   pnpm typecheck
   ```

3. **Paso 3: Compilación de Artefactos**
   ```bash
   export SOURCE_DATE_EPOCH=$(git log -1 --pretty=%ct)
   pnpm build
   ```

4. **Paso 4: Verificación Criptográfica del Artefacto Generado**
   ```bash
   sha256sum dist/app.bundle.js
   # Comparar contra el checksum canónico registrado en el release oficial:
   # Expected: [CHECKSUM_SHA256_CANONICO]
   ```

---

## 2. Matriz de Compatibilidad de Versiones, Infraestructura y Migración

Esta sección define los límites de interoperabilidad técnica entre la versión del release y el ecosistema de despliegue, garantizando transiciones seguras sin interrupción de servicio (*Zero-Downtime*).

### 2.1 Compatibilidad con Plataformas y Runtimes de Ejecución

| Componente de Infraestructura | Rango de Versiones Homologadas | Versión Recomendada | Estado de Soporte |
| :--- | :--- | :--- | :---: |
| **Clúster Kubernetes (K8s)** | `>= 1.28` y `<= 1.31` | `1.30.2` | ✅ Certificado |
| **Container Runtime (CRI)** | containerd `>= 1.7` / CRI-O `>= 1.28` | containerd `1.7.15` | ✅ Certificado |
| **Sistema Operativo Base (Host)** | Ubuntu 22.04 LTS / RHEL 9.2+ | Ubuntu 22.04 LTS (Kernel 6.x) | ✅ Homologado |
| **Runtime de Lenguaje (Producción)** | Node.js `>= 20.x` y `<= 22.x` | `v22.12.0 LTS` | ✅ Hermético |

### 2.2 Compatibilidad de Esquemas de Datos y Migraciones (Soporte $N-1$)

Para posibilitar despliegues continuos tipo *Canary* o *Blue-Green* sin pérdida de transacciones:

| Versión del Release | Versión de Esquema DB | Compatible con Código $N-1$ | Estado de Migración de Esquema |
| :---: | :---: | :---: | :--- |
| **`v1.0.0`** (Actual) | `SCHEMA-v1.0` | ✅ Sí (soporta código `v0.9.x`) | Migración aditiva no destructiva (sin renombre de columnas). |
| **`v0.9.x`** | `SCHEMA-v0.9` | ✅ Línea base previa | Totalmente compatible durante el periodo de drenado Canary. |

### 2.3 Interoperabilidad entre Componentes de Arquitectura (`CMP-*`)

| Componente Dependiente | Componente Consumido | Versiones Mínimas Compatibles | Protocolo / Contrato Vinculante |
| :--- | :--- | :---: | :--- |
| `CMP-NOMBRE-001` (Gateway) | `CMP-NOMBRE-002` (Backend) | `>= v1.0.0` | gRPC / Protobuf v3 (`contract_spec.proto`) |
| `CMP-NOMBRE-001` (Gateway) | Bus de Mensajería / Kafka | `>= 3.5.0` | Protocolo Kafka v2 con TLS mTLS |

### 2.4 Rutas de Actualización y Marcha Atrás Homologadas (Upgrade & Rollback Paths)

| Versión Origen | Salto Directo a `v1.0.0` | Requiere Migración Intermedia | Procedimiento de Rollback Directo |
| :---: | :---: | :---: | :---: |
| **`v0.9.1`** | ✅ Permitido | ❌ No requerida | `kubectl rollout undo` sin pérdida de datos. |
| **`v0.9.0`** | ✅ Permitido | ❌ No requerida | `kubectl rollout undo` sin pérdida de datos. |
| **`< v0.9.0`** | ❌ Bloqueado | ✅ Obligatorio actualizar a `v0.9.1` primero | Requiere restauración desde snapshot de backup. |

---

## 3. Arquitectura y Pipelines de CI/CD

### 3.1 Modelo de Ramas Jerárquico y Triggers de Integración

Conforme al estándar de 4 tiers de AI-SDLC:

```text
TIER 1: main (Producción)
  ▲
  └── PR Release Gate (Aprobación Manual de Tech Lead / Release Manager)
        │
TIER 2: release/v1.0.0 (Rama de Versión Abierta)
  ▲
  └── PR Feature Gate (Lint + Tests + Quality Gate + SAST + SBOM)
        │
TIER 3: feat/CHG-001-* (Feature / Bug)
```

- **Disparador en Pull Request**: Ejecuta linters, batería completa de tests y validaciones de gobernanza sin despliegue.
- **Disparador en Tag de Release (`v*.*.*`)**: Ejecuta el pipeline completo de compilación hermética, firma de imagen y despliegue continuo.

### 2.2 Diagrama de Flujo del Pipeline CI/CD

```mermaid
flowchart LR
    A[Git Push / Tag v1.0.0] --> B[Checkout Hermético]
    B --> C[Linters & Typecheck]
    C --> D[Vitest: Unit & BDD]
    D --> E[Quality Gate: CC & MI]
    E --> F[SAST & Secret Scan]
    F --> G[SBOM & License Gate]
    G --> H[Deterministic Build]
    H --> I[Firma Cosign / SLSA]
    I --> J[Push a OCI Registry]
    J --> K[Despliegue a Enclave DMZ]
```

### 2.3 Contratos y Umbrales de los Release Gates

| Gate / Barrera de Calidad | Herramienta / Comando | Umbral Requerido | Acción ante Incumplimiento |
| :--- | :--- | :--- | :--- |
| **Lint & Tipado** | `pnpm typecheck` | Cero errores, cero `any` | **Fallo inmediato** |
| **Pruebas Automatizadas** | `pnpm test:all` | 100% aprobadas, Cobertura >= 85% | **Fallo inmediato** |
| **Complejidad Ciclomática** | `aisdlc verify quality` | CC <= 10 por función | **Bloqueo de Release** |
| **Índice de Mantenibilidad** | `aisdlc verify quality` | MI >= 50.0 / 100 | **Bloqueo de Release** |
| **Trazabilidad 360°** | `aisdlc verify traceability` | 100% de requerimientos enlazados | **Bloqueo de Release** |
| **Licencias OSS** | `aisdlc verify licenses` | Cero licencias prohibidas/virales | **Bloqueo de Release** |
| **Firma Criptográfica** | `cosign verify` | Firma válida de la CA Corporativa | **Rechazo en Despliegue** |

---

## 4. Estrategia y Procedimiento de Despliegue a Producción

### 4.1 Requisitos Previos de Infraestructura y Enclaves de Red

- **Enclave de Destino**: `SEC-ENC-DMZ-001` (Segmentación estricta sin acceso directo a internet saliente no controlado).
- **Puertos de Red Habilitados**:
  - Puerto `8443/TCP`: Ingestión WebSocket segura con autenticación mutua TLS (mTLS).
  - Puerto `9090/TCP`: Métricas de Prometheus (solo red de gestión interna).
- **Gestión de Secretos y Certificados**:
  - Certificados TLS de servidor y CA raíz de clientes montados mediante secreto inmutable en `/etc/pki/tls/`.
  - Prohibido embeber claves criptográficas en variables de entorno o imágenes.

### 4.2 Estrategia de Rollout

Se utiliza la estrategia **Canary con análisis progresivo de métricas de telemetría**:
1. El 10% del tráfico se enruta a la nueva versión durante 15 minutos.
2. Si la tasa de error 5xx es `<= 0.01%` y la latencia p99 es `<= 50ms`, se promociona al 100%.

### 4.3 Procedimiento de Despliegue Paso a Paso

1. **Paso 1: Pre-despliegue y Snapshot de Estado**
   ```bash
   # Comprobar estado del clúster y registrar baseline
   kubectl get pods -n production -l app=sistema
   kubectl exec -it sistema-db-0 -- /backup/create-snapshot.sh
   ```

2. **Paso 2: Aplicación del Manifiesto de Despliegue**
   ```bash
   kubectl apply -f deploy/production/canary-deployment.yaml
   kubectl rollout status deployment/sistema-service -n production --timeout=180s
   ```

3. **Paso 3: Verificación de Salud y Pruebas de Humo (Smoke Tests)**
   ```bash
   curl -f --cacert /etc/pki/tls/ca.crt https://127.0.0.1:8443/healthz
   curl -f --cacert /etc/pki/tls/ca.crt https://127.0.0.1:8443/readyz
   pnpm test:example
   ```

### 4.4 Plan de Marcha Atrás (Rollback Inmediato)

- **Criterios Objetivos de Activación de Rollback**:
  - Tasa de fallos en handshake mTLS `> 1.0%`.
  - Latencia de ingestión p99 `> 100ms` durante 2 minutos continuados.
  - Alerta crítica de `CrashLoopBackOff` en más del 20% de las instancias.
- **Comando de Ejecución de Rollback**:
  ```bash
  kubectl rollout undo deployment/sistema-service -n production
  kubectl rollout status deployment/sistema-service -n production
  ```

---

## 5. Resolución de Errores Probables y Troubleshooting (Runbooks)

Esta sección documenta los fallos más frecuentes en runtime y despliegue, junto con su diagnóstico y procedimiento de mitigación inmediata.

### 5.1 Matriz de Incidencias Frecuentes y Soluciones

#### Incidencia 1: Inconsistencia o Drift en Vértices de Dependencias (Build Failure)
- **Síntoma**: El comando `pnpm install --frozen-lockfile` falla en CI con error `ERR_PNPM_LOCKFILE_OUTDATED`.
- **Causa Raíz**: Se modificó `package.json` sin actualizar correspondientemente `pnpm-lock.yaml`.
- **Diagnóstico**:
  ```bash
  git diff HEAD^ package.json pnpm-lock.yaml
  ```
- **Mitigación**:
  1. En la rama de feature, ejecutar `pnpm install` localmente para regenerar el lockfile determinista.
  2. Verificar que no se introdujeron dependencias con licencias restringidas mediante `pnpm verify:licenses`.
  3. Comitear ambos archivos juntos en un commit atómico.

---

#### Incidencia 2: Fallo de Handshake mTLS o Certificado de Enclave Rechazado
- **Síntoma**: Los clientes reciben error `ERR_TLS_CERT_ALTNAME_INVALID` o conexión cerrada con alerta TLS `certificate_unknown (46)`.
- **Causa Raíz**: La CA raíz interna montada en el servidor no coincide con la CA emisora del certificado del cliente, o el certificado expiró.
- **Diagnóstico**:
  ```bash
  openssl s_client -connect 127.0.0.1:8443 -CAfile /etc/pki/tls/ca.crt -cert /etc/pki/tls/client.crt -key /etc/pki/tls/client.key
  openssl x509 -in /etc/pki/tls/ca.crt -noout -dates -issuer -subject
  ```
- **Mitigación**:
  1. Verificar la fecha de validez del certificado montado en el Secret del clúster.
  2. Si expiró, rotar el certificado inyectando el nuevo par desde el almacén HSM / Vault.
  3. Reiniciar ordenadamente los pods con `kubectl rollout restart deployment/sistema-service`.

---

#### Incidencia 3: Rechazo del Release Gate en CI/CD por Métricas de Calidad
- **Síntoma**: El pipeline aborta con veredicto `Quality Gate RECHAZADO` (Complejidad Ciclomática > 10 o Mantenibilidad < 50).
- **Causa Raíz**: Introducción de lógica anidada compleja (múltiples `if/else`, `switch` extensos o bucles con ramificaciones).
- **Diagnóstico**:
  ```bash
  pnpm verify:quality
  ```
- **Mitigación**:
  1. Inspeccionar el reporte de infracciones en `reports/QUALITY_GATE_REPORT.md` para identificar la función infractora.
  2. Descomponer la función en métodos privados auxiliares cohesivos siguiendo la regla de máximo 40 líneas por función.
  3. Re-ejecutar `pnpm verify:quality` hasta confirmar veredicto verde. Prohibido añadir comentarios de supresión (`// @ts-ignore`).

---

#### Incidencia 4: CrashLoopBackOff por Fuga de Memoria o Límite de Conexiones
- **Síntoma**: El pod es terminado con código `ExitCode: 137` (`OOMKilled`) tras un aumento de carga.
- **Causa Raíz**: Acumulación de buffers de sockets no drenados en ráfagas de alta frecuencia.
- **Diagnóstico**:
  ```bash
  kubectl describe pod sistema-service-xxx -n production | grep -i oom
  kubectl logs sistema-service-xxx -n production --previous
  ```
- **Mitigación**:
  1. Ajustar los límites de memoria en el manifiesto Kubernetes (`resources.limits.memory`) temporalmente si la ráfaga es legítima.
  2. Aplicar backpressure o descarte de paquetes caducados conforme a las reglas de negocio (`BR-*`).
  3. Ejecutar benchmark local con `pnpm test:all` para auditar consumo de memoria.

---

### 5.2 Protocolo de Escalado y Gestión de Incidentes Críticos

| Nivel de Severidad | Criterio de Impacto | Tiempo Máximo de Respuesta | Roles Involucrados |
| :--- | :--- | :---: | :--- |
| **SEV-1 (Crítica)** | Caída total del servicio o brecha de seguridad en enclave. | 15 minutos | SRE de Guardia + Lead Architect + SecOps |
| **SEV-2 (Mayor)** | Degradación severa del servicio, reintentos masivos sin caída. | 1 hora | SRE de Guardia + Tech Lead |
| **SEV-3 (Menor)** | Incidencia aislada en un nodo sin impacto en SLA global. | 4 horas | Ingeniero de Soporte / DevOps |

---

## 6. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-15 | Equipo de Operaciones y DevOps | Generación inicial del Manual de Producción | CHG-009 |
