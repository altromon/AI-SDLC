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

En cada ejecución del pipeline de integración continua:
1. **Generación de SBOM (Software Bill of Materials)**:
   - Se compila el inventario completo de dependencias directas y transitivas en estándar **CycloneDX (JSON)** o **SPDX**.
2. **Escaneo Automatizado de Licencias**:
   - Se ejecuta una herramienta determinista (`license-checker-rse`, `cargo-deny`, `trivy`, o `syft/grype`) validando el árbol completo contra `license-policy.yaml`.
   - Si se detecta cualquier licencia en la `denylist` o desconocida, el pipeline **falla de inmediato (exit code 1)**.
3. **Generación Automática de Atribuciones**:
   - Se genera el artefacto derivado `THIRD_PARTY_NOTICES.md` recopilando autores, copyrights y textos de licencias permisivas para cumplimiento legal.
