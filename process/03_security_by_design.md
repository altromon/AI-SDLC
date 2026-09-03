# 03. Ciberseguridad Shift-Left: Security-by-Design as Code

## 1. Visión y Enfoque Shift-Left

En los sistemas modernos y en particular en aquellos asistidos por agentes autónomos, la seguridad no puede relegarse a una auditoría estática previa a producción. **La ciberseguridad debe ser modelada de forma nativa desde la fase de definición del producto y la arquitectura (Security-by-Design as Code)**.

Todo sistema define quién lo usa legítimamente (`ACT-*`); en AI-SDLC es **obligatorio** modelar también quién intenta atacarlo o vulnerarlo (`ACT-THREAT-*`), cómo lo intenta (`ABUSE-*`) y qué controles formales lo impiden (`SEC-REQ-*`).

---

## 2. Familias de Artefactos de Ciberseguridad

```
           ┌───────────────────────┐
           │ THREAT ACTOR (ACT-THREAT) │
           └───────────┬───────────┘
                       │ ejecuta
                       ▼
           ┌───────────────────────┐
           │   ABUSE CASE (ABUSE)  │ ◄──── amenaza sobre ──── USE CASE (UC)
           └───────────┬───────────┘
                       │ clasificado por
                       ▼
           ┌───────────────────────┐
           │ THREAT MODEL (THREAT) │ (STRIDE / ASVS / MITRE)
           └───────────┬───────────┘
                       │ mitigado por
                       ▼
        ┌─────────────────────────────┐
        │ SECURITY REQUIREMENT (SEC)  │
        └──────────────┬──────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ ARCHITECTURE CONTROLS   │     │ SECURITY TESTS          │
│ (arc42 Sec. 8 / SEC-ENC)│     │ (SEC-TEST-* en CI/CD)   │
└─────────────────────────┘     └─────────────────────────┘
```

### 1. Actores Maliciosos (`ACT-THREAT-*`)
- Caracterización del adversario: atacante no autenticado en internet, usuario interno malicioso con privilegios limitados, atacante en la cadena de suministro, etc.
- Atributos: motivación, nivel de recursos, vectores de acceso potenciales.

### 2. Casos de Abuso y Maluso (`ABUSE-*`)
- Escenarios deliberados de explotación o comportamiento anómalo que atentan contra la confidencialidad, integridad, disponibilidad o autenticidad del producto.
- Todo `ABUSE-*` debe declarar a qué caso de uso legítimo (`targets-use-case: UC-*`) intenta explotar o desviar.

### 3. Modelado de Amenazas STRIDE / OWASP ASVS (`THREAT-*`)
- Clasificación estructurada del vector de ataque:
  - **S**poofing (Suplantación de identidad).
  - **T**ampering (Manipulación no autorizada de datos).
  - **R**epudiation (Repudio de acciones realizadas).
  - **I**nformation Disclosure (Fuga de información confidencial).
  - **D**enial of Service (Denegación de servicio / agotamiento de recursos).
  - **E**levation of Privilege (Escalado de privilegios).
- Mapeo directo a los niveles de verificación de OWASP ASVS (L1, L2, L3) o CWEs conocidos.

### 4. Requisitos de Seguridad (`SEC-REQ-*`)
- Requerimientos técnicos y normativos derivados directamente para neutralizar un `ABUSE-*`.
- Ejemplos: Autenticación mTLS obligatoria, rotación de claves cada 90 días, cifrado en reposo AES-GCM-256, sanitización estricta de prompts/entradas, rate-limiting distribuido.

### 5. Políticas y Enclaves de Confianza (`SEC-POL-*`, `SEC-ENC-*`)
- Fronteras de seguridad arquitectónicas: redes perimetrales (DMZ), zonas de datos confidenciales, enclaves seguros con autenticación mutua, y políticas Zero Trust de mínimos privilegios.

---

## 3. Trazabilidad Criptográfica de la Mitigación

Para garantizar que ninguna amenaza quede sin mitigar:
1. **Regla de Grafo Obligatoria**:
   - Todo `ABUSE-*` debe estar vinculado a al menos un `SEC-REQ-*` mediante la relación `mitigated-by`.
2. **Regla de Implementación**:
   - Toda especificación de entrega (`SPEC-*`) que implemente un servicio o componente debe citar los `SEC-REQ-*` aplicables.
3. **Regla de Verificación (Threat-to-Test)**:
   - Todo `SEC-REQ-*` implementado debe contar con al menos una prueba automatizada (`SEC-TEST-*`) que valide activamente el rechazo del ataque o el cumplimiento del control criptográfico.

---

## 4. Estructura de Carpetas de Seguridad

```text
docs/security/
├── actors/                               # ACT-THREAT-*.md
├── abuse-cases/                          # ABUSE-*.md
├── threats/                              # THREAT-*.md (Modelado STRIDE/ASVS)
├── requirements/                         # SEC-REQ-*.md
├── policies/                             # SEC-POL-*.md (Políticas Zero Trust, etc.)
└── enclaves/                             # SEC-ENC-*.md (Fronteras y enclaves de confianza)
```
