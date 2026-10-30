---
id: DSG-CHG-036-QUALITY-BASELINE-RATCHET
type: spec-design
change-id: CHG-036-QUALITY-BASELINE-RATCHET
title: "Diseño Técnico: Quality Baseline Ratchet"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-036-QUALITY-BASELINE-RATCHET"
architecture-components:
  - "CMP-CORE"
  - "CMP-CLI"
enclave: "SEC-ENC-DMZ"
status: completed
contracts: []
citations:
  - id: UC-036-QUALITY-BASELINE-RATCHET
    digest: sha256:022415409631ea2aa30b006af1a686cf320229821c850e13da74d5f1044da5ba
    comment: Citación de use-case (Mecanismo de Baseline y Modo Trinquete en Quality Gate para Código Heredado)
  - id: FR-036-QUALITY-BASELINE-RATCHET-001
    digest: sha256:68a36742d09fdb9ab1b55b7f5257c8894eb8ac71e8ead0d916a654345e7b7236
    comment: Citación de requirement (Mecanismo de Baseline (quality-baseline.json) y Modo Ratchet en Quality Gate)
---

# Diseño Técnico: CHG-036-QUALITY-BASELINE-RATCHET

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se integra en el motor de calidad de `CMP-CORE` y en la interfaz por comandos de `CMP-CLI`, interactuando dentro del enclave seguro sin comunicación de red externa ni deserialización insegura.

## 2. Contratos de Datos e Interfaces
Estructura declarativa del archivo `quality-baseline.json`:
- `version`: "1.0"
- `generatedAt`: Marca de tiempo ISO-8601.
- `totalViolations`: Conteo total de violaciones toleradas en el baseline.
- `violations`: Colección de violaciones con:
  - `signature`: Hash SHA-256 determinista calculado como `sha256(relPath + ":" + functionName + ":" + metric)`.
  - `file`: Ruta relativa del archivo fuente evaluado.
  - `functionName`: Nombre del método o función infractora.
  - `line`: Número de línea en el archivo fuente.
  - `metric`: Tipo de métrica infractora (`cyclomatic`, `cognitive`, `maintainability`, `loc`, `codeSmell`, `unit-test`).
  - `value`: Valor numérico registrado en la instantánea.
  - `threshold`: Valor límite permitido según la política de calidad.
  - `message`: Descripción legible de la infracción.

## 3. Lógica del Modo Ratchet (Trinquete)
Al invocar `verifyQualityGate`:
1. Si `updateBaseline: true` está activo, se evalúan los archivos, se genera el payload del baseline y se escribe en disco (`quality-baseline.json`), marcando `success: true`.
2. Si `ratchet: true` o `policy.ratchet_mode: true`:
   - Se carga el baseline desde `quality-baseline.json` (si existe).
   - Para cada violación detectada actualmente:
     - Se calcula su firma SHA-256.
     - Si coincide con una entrada del baseline y su métrica no ha empeorado, se contabiliza como advertencia tolerada (`toleratedViolations`).
     - Si no existe en el baseline o su métrica empeora, se clasifica como violación bloqueante activa (`newViolations` o `worsenedViolations`).
   - El gate sólo falla (`success: false`) si existen violaciones bloqueantes activas o fallos de cobertura no tolerados.
3. Si el número de violaciones resueltas reduce la deuda técnica histórica, el baseline puede actualizarse hacia abajo (*ratchet down*).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
No se introducen dependencias de terceros; se utiliza la biblioteca estándar criptográfica de Node.js (`crypto`) y utilidades nativas del monorepo.
