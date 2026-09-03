# 07. Validación Determinista: Ciberseguridad, Licencias y Puertas de Calidad en CI/CD

## 1. El Principio de Verificación Multinivel

En un flujo de desarrollo con agentes de IA, el código puede generarse a gran velocidad. Para mantener la integridad absoluta de la base de código, la validación se estructura en **dos capas complementarias**:
1. **Capa Determinista (Puertas de CI/CD)**: Herramientas estáticas, linters y validadores algorítmicos que se ejecutan sin intervención de IA y con resultados reproducibles (mismo código, mismo veredicto).
2. **Capa Semántica y Adversarial (Agentes Auditores)**: Agentes de IA especializados que examinan el código buscando vulnerabilidades lógicas, vectores de evasión y coherencia con la arquitectura.

---

## 2. Las 6 Puertas Deterministas de CI/CD (Pipeline Gates)

Todo Pull Request propuesto por un desarrollador humano o por un agente debe superar de forma obligatoria las siguientes 6 puertas automáticas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PIPELINE DETERMINISTA DE CI/CD                       │
└────────────────────────────────────────────────────────────────────────┘

 [PUERTA 1: ESCANEO DE SECRETOS] (gitleaks / trufflehog)
  └─► Bloqueo si se detectan tokens, claves privadas, contraseñas o certs.

 [PUERTA 2: VERIFICACIÓN DE CITACIONES Y DERIVA] (prodshape verify)
  └─► Comprueba que los hashes SHA-256 de los requerimientos citados coincidan.
      Si un requisito cambió en la línea base, la citación da 'stale' (Fallo).

 [PUERTA 3: AUDITORÍA DE LICENCIAS Y GENERACIÓN SBOM] (license-scanner / syft)
  └─► Valida el árbol completo de dependencias contra license-policy.yaml.
      Falla si hay licencias virales (AGPL) o duales/comerciales no aprobadas.
      Genera SBOM en formato CycloneDX (JSON) y actualiza THIRD_PARTY_NOTICES.md.

 [PUERTA 4: SAST & ANÁLISIS ESTÁTICO DE CÓDIGO] (Semgrep / SonarQube)
  └─► Detección de vulnerabilidades OWASP Top 10, CWEs e inyecciones.
      Falla ante cualquier vulnerabilidad de severidad Alta o Crítica.

 [PUERTA 5: SUITE DE PRUEBAS UNITARIAS Y DE MITIGACIÓN] (Test Runner)
  └─► Cobertura mínima obligatoria (ej. 85%).
      Ejecución de todas las pruebas de abuso y seguridad (SEC-TEST-*).

 [PUERTA 6: VALIDACIÓN DE ESQUEMAS Y GRAFO] (JSON Schema Validator)
  └─► Verifica que los archivos frontmatter respeten los esquemas canónicos.

 [PUERTA 7: AUDITORÍA DE PRUEBAS EN REQUISITOS Y TAREAS] (verify-all-testing.js)
  └─► Comprueba que el 100% de los requisitos tengan tests físicos en disco (.feature, .spec)
      y que el 100% de las tareas tengan comando determinista de verificación.
```

---

## 3. La Capa de Auditoría Adversarial por Agentes de IA (`sec:audit`)

Las herramientas estáticas tradicionales (SAST) son excelentes detectando patrones sintácticos conocidos (como una inyección SQL simple), pero fallan al detectar **fallos de lógica de negocio**, **escalados horizontales de privilegios** o **vectores de prompt injection**.

Para cubrir este vacío, el pipeline invoca al **Agente Auditor de Seguridad (`agent-security-auditor`)**:
- **Entrada**: El diff completo del Pull Request, los casos de abuso asociados (`ABUSE-*`), los requisitos de seguridad (`SEC-REQ-*`) y el diseño técnico (`design.md`).
- **Análisis**:
  - ¿Existe algún camino en el que un usuario no autenticado pueda forzar el endpoint?
  - ¿Se están aplicando las validaciones de límites en el backend y no solo en el cliente?
  - ¿Existen llamadas a modelos de lenguaje vulnerables a inyección indirecta de prompts?
  - ¿Los mensajes de error filtran trazas de pila o información confidencial?
- **Salida**: Un informe formal con clasificación CVSS v3.1 insertado como comentario en el Pull Request. Si se detectan riesgos críticos, el agente solicita cambios antes del merge.

---

## 4. Códigos de Salida Estandarizados (Exit Codes)

Toda herramienta y script de validación del proceso debe emitir los siguientes códigos de salida:

| Código | Significado | Acción del Pipeline |
| :---: | :--- | :--- |
| **0** | **Éxito (Pass)** | Todas las verificaciones y gates han sido superados. Listo para revisión humana. |
| **1** | **Fallo Estructural / Pruebas** | Fallo en tests unitarios, errores sintácticos o vulnerabilidad crítica SAST. |
| **2** | **Deriva de Citación (Stale)** | Un requerimiento o arquitectura canónica cambió. Se debe actualizar la spec. |
| **3** | **Bloqueo Legal / Licencias** | Dependencia no permitida o requiere adquisición de licencia comercial. |
| **4** | **Secreto Expuesto** | Credencial o certificado detectado en el historial de commits. |
