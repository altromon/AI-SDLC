# 07. Validación Determinista: Ciberseguridad, Licencias y Puertas de Calidad en CI/CD

## 1. El Principio de Verificación Multinivel

En un flujo de desarrollo con agentes de IA, el código puede generarse a gran velocidad. Para mantener la integridad absoluta de la base de código, la validación se estructura en **dos capas complementarias**:
1. **Capa Determinista (Puertas de CI/CD)**: Herramientas estáticas, linters y validadores algorítmicos que se ejecutan sin intervención de IA y con resultados reproducibles (mismo código, mismo veredicto).
2. **Capa Semántica y Adversarial (Agentes Auditores)**: Agentes de IA especializados que examinan el código buscando vulnerabilidades lógicas, vectores de evasión y coherencia con la arquitectura.

---

## 2. Las 9 Puertas Deterministas de CI/CD (Pipeline Gates)

Todo Pull Request propuesto por un desarrollador humano o por un agente debe superar de forma obligatoria las siguientes 9 puertas automáticas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PIPELINE DETERMINISTA DE CI/CD (9 GATES)             │
└────────────────────────────────────────────────────────────────────────┘

 [GATE 1: RELEASE GATE DE CÓDIGO Y CALIDAD AST] (aisdlc verify quality)
  └─► Mide Complejidad Ciclomática (<=10), Cognitiva (<=15) y Mantenibilidad (>=50) con AST real.

 [GATE 2: MATRIZ DE TRAZABILIDAD 360° DETERMINISTA] (aisdlc verify traceability)
  └─► Comprueba la triangulación inquebrantable entre los paquetes de handoff PDaC (HOF-*),
      las vistas de arquitectura arc42 / NAF v4 (CMP-*) y los escenarios BDD/Gherkin y tests.

 [GATE 3: GOBIERNO DE TAREAS Y AUTONOMÍA] (aisdlc verify governance)
  └─► Audita modos de autonomía (AUTONOMOUS, HUMAN_REVIEW_PLAN, HIGH_RISK_MANUAL) y verificación.

 [GATE 4: AUDITORÍA DE PRUEBAS EN REQUISITOS Y TAREAS] (aisdlc verify testing)
  └─► Comprueba mediante resolución inversa que el 100% de los requisitos cuenten con pruebas
      físicas en disco (.feature etiquetadas o .spec citando los IDs) y comandos de verificación.

 [GATE 5: AUDITORÍA DE LICENCIAS OSS Y GENERACIÓN SBOM] (aisdlc verify licenses)
  └─► Escaneo dinámico nativo de dependencias instaladas frente a license-policy.yaml.
      Falla si hay licencias virales (AGPL) o comerciales no aprobadas. Genera SBOM CycloneDX 1.5.

 [GATE 6: INTEGRIDAD CRIPTOGRÁFICA Y DERIVA PDAC] (aisdlc verify pdac)
  └─► Comprueba que los hashes SHA-256 de los requerimientos citados en handoffs coincidan.

 [GATE 7: VALIDACIÓN DE ESQUEMAS Y GRAFO] (aisdlc verify schemas)
  └─► Verifica que los archivos frontmatter respeten los esquemas canónicos JSON (Draft 2020-12).

 [GATE 8: PRE-FLIGHT DE DUPLICADOS Y COLISIONES] (aisdlc verify duplicates)
  └─► Audita que los nuevos requisitos no colisionen en ID, textos normativos idénticos ni títulos.

 [GATE 9: SEGURIDAD SHIFT-LEFT: SECRETOS Y SAST] (aisdlc verify security)
  └─► Cero tolerancia a credenciales, llaves API o tokens (Gitleaks Gate) y detección determinista
      de vulnerabilidades OWASP generadas por IA (SQLi, exec, eval, SSRF, path traversal).
```

---

## 3. Especificación Detallada de Seguridad Shift-Left

### 3.1 Gate 9: Detección Determinista de Secretos (`aisdlc verify secrets`)

El escaneo de secretos previene la fuga involuntaria de credenciales en el código fuente:
- **Ámbito de Escaneo Flexible**: Permite escanear todo el árbol de trabajo o únicamente el diff incremental de Git (`--diff`, opcionalmente contra una rama base con `--base <rama>`).
- **Motor Híbrido Zero-Dependencies**:
  - Reglas deterministas para Claves Privadas RSA/EC/OpenSSH, tokens de GitHub, AWS Access Keys, OpenAI API Keys, Google API Keys, Slack Tokens, Stripe Keys, Bearer JWTs y asignaciones genéricas de tokens.
  - Filtro heurístico de **Entropía de Shannon** para identificar cadenas con aleatoriedad sospechosa (umbral por defecto $\ge 4.5$).
- **Integración con Gitleaks (`--gitleaks`)**: Delegación opcional en el binario oficial de `gitleaks` si está disponible en el entorno o en el CI runner.
- **Enmascaramiento Seguro**: Los secretos nunca se imprimen en claro ni en consola ni en informes (`AKIA...` ➔ `AKIA***************`).
- **Supresión Justificada**: Se permite ignorar falsos positivos específicos mediante el comentario en línea `// ai-sdlc:allow-secret`.
- **Salida Formal**: Genera el informe `reports/SECRET_SCAN_REPORT.md` y emite **código de salida 4** en caso de infracciones.

### 3.2 Análisis Estático de Vulnerabilidades SAST (`aisdlc verify sast`)

Para erradicar patrones de código vulnerable comunes en código sintetizado por modelos de lenguaje (LLMs):
- **Patrones Detectados**:
  - *SQL Injection*: Concatenación directa de cadenas en consultas SQL sin sentencias parametrizadas.
  - *Command Injection*: Ejecución de comandos del sistema operativo (`exec`, `execSync`, `spawn` con shell activo) con interpolación de variables.
  - *Dynamic Code Evaluation*: Uso inseguro de `eval(...)` o constructores `new Function(...)`.
  - *Server-Side Request Forgery (SSRF)*: Peticiones HTTP salientes donde la URL objetivo se construye directamente con entradas no sanitizadas.
  - *Path Traversal*: Operaciones de sistema de archivos construidas mediante concatenación de rutas sin normalización ni comprobación de límites.
- **Conector Opcional Semgrep (`--semgrep`)**: Ejecuta reglas corporativas de Semgrep sobre el repositorio si está disponible.
- **Salida Formal**: Genera `reports/SAST_REPORT.md` y emite código de salida 1 en caso de vulnerabilidades detectadas.

---

## 4. La Capa de Auditoría Adversarial por Agentes de IA (`sec:audit`)

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

## 5. Códigos de Salida Estandarizados (Exit Codes)

Toda herramienta y script de validación del proceso debe emitir los siguientes códigos de salida:

| Código | Significado | Acción del Pipeline |
| :---: | :--- | :--- |
| **0** | **Éxito (Pass)** | Todas las verificaciones y gates han sido superados. Listo para revisión humana. |
| **1** | **Fallo Estructural / Pruebas** | Fallo en tests unitarios, errores sintácticos o vulnerabilidad crítica SAST. |
| **2** | **Deriva de Citación (Stale)** | Un requerimiento o arquitectura canónica cambió. Se debe actualizar la spec. |
| **3** | **Bloqueo Legal / Licencias** | Dependencia no permitida o requiere adquisición de licencia comercial. |
| **4** | **Secreto Expuesto** | Credencial o certificado detectado por `verify secrets` en el repositorio o diff. |
