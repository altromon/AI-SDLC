# 04. Gobernanza y Cumplimiento de Licencias Open Source: Libre Uso vs. Adquisición Comercial

## 1. Visión y Riesgo de Propiedad Intelectual

El uso indiscriminado de dependencias externas por parte de desarrolladores humanos o agentes de IA expone a la organización a riesgos severos:
1. **Riesgo de Infección Viral (Copyleft Fuerte / AGPL)**: Obligación legal de publicar el código fuente privado del producto.
2. **Riesgo de Infracción Comercial (Dual-License / Source-Available / BSL / SSPL)**: Uso no autorizado de software que requiere pago de licencias o suscripciones comerciales para entornos productivos o modelos SaaS.
3. **Riesgo de Falta de Atribución**: Incumplimiento de los términos de licencias permisivas al omitir los avisos de copyright.

AI-SDLC implementa un marco **License Compliance as Code** con evaluación determinista continua.

---

## 2. Taxonomía de Licencias en 5 Categorías

Toda dependencia directa o transitiva se clasifica dentro de una de las siguientes cinco categorías operativas:

```
┌────────────────────────────────────────────────────────────────────────┐
│               TAXONOMÍA DE LICENCIAS OPEN SOURCE Y TERCEROS             │
└────────────────────────────────────────────────────────────────────────┘

 [CATEGORÍA A: PERMISIVAS (LIBRE USO COMERCIAL)] ──► ALLOWLIST
  │ Ejemplos: MIT, Apache-2.0, BSD-2/3, ISC, Unlicense, CC0
  └─► Permiten uso comercial, modificación y cierre de código. Solo exigen atribución.

 [CATEGORÍA B: COPYLEFT DÉBIL (USO CONDICIONADO)] ──► CONDITIONAL REVIEW
  │ Ejemplos: LGPL-2.1/3.0, MPL-2.0, EPL-2.0, CDDL
  └─► Permitidas solo si se consumen como librería externa dinámica o módulo separado.

 [CATEGORÍA C: COPYLEFT FUERTE / VIRAL] ────────────► DENYLIST
  │ Ejemplos: GPL-2.0/3.0, AGPL-3.0, EUPL, OSL
  └─► PROHIBIDAS en software propietario o SaaS para evitar obligación de liberar código.

 [CATEGORÍA D: DUAL / SOURCE-AVAILABLE / PAGO] ─────► COMMERCIAL ACQUISITION
  │ Ejemplos: SSPL (MongoDB), BSL (Redis/Terraform), Elastic-2.0, Comerciales
  └─► CÓDIGO VISIBLE PERO NO LIBRE: Requiere formalizar y pagar licencia comercial.

 [CATEGORÍA E: DESCONOCIDAS / AMBIGUAS] ────────────► HARD BLOCK
  │ Ejemplos: Sin archivo LICENSE, licencias inventadas ("JSON License")
  └─► BLOQUEO INMEDIATO: Prohibidas hasta resolución legal formal.
```

---

## 3. Guardrails para Agentes de IA en la Selección de Paquetes

Los agentes de IA que actúan como desarrolladores (`agent-developer`) o arquitectos deben cumplir estrictamente las siguientes reglas operativas:

1. **Inspección Previa Mandatoria**:
   - Antes de sugerir o añadir un paquete a manifiestos (`package.json`, `pom.xml`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.), el agente debe consultar los metadatos de licencia del paquete en el registro oficial.
2. **Rechazo Automático de Licencias Virales**:
   - Si el paquete utiliza GPL o AGPL, el agente **no debe agregarlo**. Debe buscar activamente y proponer una alternativa con licencia permisiva (MIT o Apache-2.0).
3. **Detección y Notificación de Licencias de Pago (Categoría D)**:
   - Si un paquete opera bajo BSL, SSPL o modelo dual comercial, el agente **debe emitir una alerta explícita** en la propuesta o Pull Request:
   > ⚠️ **ALERTA DE LICENCIA COMERCIAL**: El paquete `[nombre]` utiliza la licencia `[licencia]`. Su uso en este producto requiere la **adquisición formal de una licencia comercial o contrato de pago**. Se requiere aprobación del responsable legal y de compras antes de continuar.
4. **Validación contra `license-policy.yaml`**:
   - El agente debe comprobar que el identificador SPDX de la licencia esté explícitamente listado en la sección `permissive_free` de la política local.

---

## 4. Flujo de Adquisición de Licencia Comercial

Cuando una funcionalidad crítica requiera una librería de Categoría D:

```text
 Necesidad de Dependencia de Pago
                │
                ▼
 Agente emite Solicitud / PR con etiqueta 'needs-commercial-license'
                │
                ▼
 Revisión Humana: Tech Lead + Asesor Legal + Responsable de Compras
                │
         ┌──────┴──────┐
         ▼             ▼
   [ RECHAZADA ]  [ APROBADA ]
         │             │
         │             ▼
         │       Contratación / Pago formal de la licencia comercial
         │             │
         │             ▼
         │       Registro de excepción formal en docs/compliance/adrs/
         │             │
         ▼             ▼
   Búsqueda de      Incorporación del paquete en el manifiesto con
   alternativa      declaración formal de compra registrada
```

---

## 5. Validación Determinista en CI/CD y Generación de SBOM

En cada ejecución del pipeline de integración continua y en la compuerta de pre-vuelo (`aisdlc check`):
1. **Inspección Dinámica de Dependencias (SCA)**:
   - El motor nativo de `@ai-sdlc/core` inspecciona el árbol real de paquetes instalados (`node_modules` y almacén `.pnpm`) sin requerir manifiestos redactados a mano.
   - Resuelve metadatos de `package.json`, identifica archivos de licencia (`LICENSE`, `LICENSE.md`, `LICENSE.txt`), normaliza identificadores SPDX y analiza expresiones compuestas (`AND`/`OR`).
2. **Generación de SBOM (Software Bill of Materials)**:
   - Se compila el inventario completo de dependencias directas y transitivas en formato estándar **CycloneDX 1.5 JSON** (`reports/sbom.cdx.json`).
3. **Escaneo y Clasificación Automatizada contra `license-policy.yaml`**:
   - Cada paquete se evalúa contra las listas de licencias permitidas (`permissive_free`), restringidas (`weak_copyleft_conditional` / `commercial_acquisition_required`) y bloqueadas (`strong_copyleft_viral`).
   - Si se detecta cualquier licencia en la `denylist` (GPL/AGPL sin excepción) o desconocida, el pipeline **falla de inmediato (exit code 1)**.
4. **Generación Automática de Atribuciones**:
   - Se genera el artefacto derivado `THIRD_PARTY_NOTICES.md` recopilando autores, copyrights, URLs de repositorio y textos de licencias permisivas para cumplimiento legal.

---

## 6. Tutorial Práctico: Auditoría Dinámica de Licencias y Generación de SBOM

### Paso 1: Auditoría Dinámica Local
Para verificar el cumplimiento del árbol completo de dependencias antes de confirmar código o abrir un Pull Request:

```bash
# Ejecución estándar (inspección nativa de node_modules)
npx aisdlc verify licenses

# Inspección restringida únicamente a dependencias directas de producción
npx aisdlc verify licenses --depth direct
```

Salida esperada en consola:
```text
🔍 [AI-SDLC] Verificando Cumplimiento de Licencias Open Source (SCA)...
  Dependencias evaluadas:   408
  Dependencias conformes:   408
  Violaciones de licencia:  0
  SBOM CycloneDX generado:  reports/sbom.cdx.json
  Avisos legales generados: THIRD_PARTY_NOTICES.md

✔ Gobernanza de Licencias OSS CONFORME
```

### Paso 2: Generación Personalizada de SBOM CycloneDX 1.5
Si se requiere emitir el archivo SBOM en una ubicación específica para su ingesta por plataformas de seguridad (como Dependency-Track o Snyk):

```bash
npx aisdlc verify licenses --sbom build/artifacts/sbom.cdx.json
```

El archivo generado cumple rigurosamente con la especificación CycloneDX 1.5:
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "serialNumber": "urn:uuid:...",
  "metadata": {
    "timestamp": "2026-09-17T...",
    "tools": [{ "vendor": "AI-SDLC", "name": "@ai-sdlc/core", "version": "1.0.0" }]
  },
  "components": [
    {
      "type": "library",
      "name": "fast-logger",
      "version": "2.1.0",
      "purl": "pkg:npm/fast-logger@2.1.0",
      "licenses": [{ "license": { "id": "MIT" } }]
    }
  ]
}
```

### Paso 3: Generación del Archivo de Atribuciones Legales
Para generar el resumen formal de copyright y textos de licencias para distribución del producto:

```bash
npx aisdlc verify licenses --notices dist/THIRD_PARTY_NOTICES.md
```

### Paso 4: Integración Opcional con Herramientas Externas (Trivy / Syft)
En entornos que requieran invocar herramientas corporativas adicionales instaladas en el sistema o en la imagen Docker de CI:

```bash
# Escaneo mediante Aqua Security Trivy
npx aisdlc verify licenses --tool trivy

# Escaneo mediante Anchore Syft
npx aisdlc verify licenses --tool syft
```
*Nota*: Si la herramienta especificada no está disponible en el `PATH`, el CLI realiza un fallback transparente al motor nativo emitiendo una notificación informativa.

### Paso 5: Gestión de Excepciones y Licencias Restringidas
Si una dependencia legítima opera bajo licencia dual o comercial aprobada (ej. `BSL-1.1`), registre la excepción formal en `license-policy.yaml`:

```yaml
exceptions:
  approved_commercial_packages:
    - package: "@corporate/enterprise-connector"
      license: "BSL-1.1"
      reason: "APPROVED_BY_LEGAL_REF_ADR_004"
```
Al re-ejecutar `aisdlc verify licenses`, el paquete será aceptado como justificado sin bloquear el release gate.
