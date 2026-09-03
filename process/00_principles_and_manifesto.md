# 00. Manifiesto y Principios Fundamentales del AI-SDLC

## 1. El Manifiesto del AI-SDLC

Durante décadas, la fase más lenta y costosa del desarrollo de software fue la escritura manual de código. Los equipos estructuraron sus procesos alrededor de ese cuello de botella: historias de usuario condensadas, tickets de Jira efímeros, especificaciones "just-in-time" y conocimiento del producto disperso en la memoria de un par de ingenieros veteranos.

**El auge de la ingeniería asistida por Inteligencia Artificial y agentes autónomos transforma radicalmente la ecuación:**
> *Un agente de IA capaz de generar miles de líneas de código en minutos amplifica el entendimiento que recibe. Si se le entrega un ticket ambiguo o descontextualizado, producirá código rápido, seguro de sí mismo y verosímil... para un producto que nadie definió y con una arquitectura incoherente.*

El recurso escaso ya no es la capacidad de teclear código; **el recurso escaso es una definición de producto y una arquitectura de sistemas rigurosa, trazable y digna de ser implementada**.

---

## 2. Los 7 Principios Rectores

### Principio 1: Todo "As-Code" y Versionado en Git
Tanto la definición del producto, como la arquitectura técnica, las políticas de ciberseguridad, las reglas de licencias y las especificaciones de entrega residen en el repositorio Git como texto plano estructurado (Markdown con metadatos en YAML frontmatter). No existen fuentes de verdad dispersas en wikis externas o bases de datos aisladas.

### Principio 2: Operabilidad Simétrica para Personas y Agentes (Dual-Citizenship)
Cualquier documento o artefacto generado en el proceso debe cumplir una doble condición:
- **Ser transparente y legible para un humano** (prosa clara en Markdown, diagramas visuales en Mermaid).
- **Ser estrictamente computable para un agente de IA** (esquemas JSON formales, identificadores inmutables normalizados, campos tipados).

### Principio 3: Separación entre Núcleo Determinista y Razonamiento de IA
- **El núcleo determinista gobierna la estructura:** Validación de esquemas, resolución de IDs, cálculo de hashes criptográficos SHA-256, detección de ciclos en grafos y linters son 100% deterministas. Producen el mismo resultado exacto en cualquier máquina.
- **La IA gobierna la semántica:** Exploración de ideas, análisis de impacto conceptual, modelado inicial de casos de uso y generación de código de prueba son tareas semánticas donde los agentes destacan como copilotos o ejecutores autónomos bajo supervisión.

### Principio 4: Autoridad Humana Irrenunciable en Aprobación y Fusión
Los agentes de IA tienen capacidad de:
- Explorar y proponer deltas (`Product Changes`, `Specs`, `Code PRs`).
- Validar esquemas y ejecutar pruebas.
- Identificar riesgos y violaciones de políticas.

**Sin embargo, ningún agente ni herramienta de software tiene permitido auto-aprobarse, auto-fusionarse (`merge`) ni tomar decisiones de negocio/riesgo en nombre de la organización.** La aprobación de un cambio de producto y el merge de un PR a la rama principal es una responsabilidad exclusivamente humana.

### Principio 5: Contratos de Citación Criptográfica (Drift-Free Architecture)
Los documentos de entrega (especificaciones SDD, tareas de agentes, código) nunca reescriben ni duplican los requisitos o las reglas de negocio. En su lugar, los **citan** mediante su identificador único (`id`) y el digest criptográfico (`SHA-256`) del contenido canónico. Si un requerimiento cambia en la rama principal, cualquier citación dependiente queda marcada automáticamente como obsoleta (`stale`), eliminando la deriva silenciosa.

### Principio 6: Ciberseguridad Shift-Left por Defecto
La ciberseguridad no es un control reactivo al final del ciclo de desarrollo. Desde la concepción del producto se modelan los actores maliciosos (`ACT-THREAT-*`), los casos de abuso (`ABUSE-*`) y los requisitos de mitigación (`SEC-REQ-*`). En la validación, los gates deterministas (SAST, SCA, Secret Scanning) y los agentes de auditoría adversarial verifican cada cambio antes de su despliegue.

### Principio 7: Gobernanza Proactiva de Licencias Open Source
El software externo utilizado se evalúa formalmente frente a políticas declarativas (`license-policy.yaml`). Los agentes tienen prohibido incorporar dependencias con licencias virales (GPL/AGPL) o que requieran pago comercial sin la autorización y adquisición formal de licencias por parte de los responsables legales y técnicos humanos.
