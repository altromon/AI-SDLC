# 10. Gestión de Calidad, Reglas de Código y Puertas de Liberación (Release Gates)

## 1. Gestión de Calidad en el AI-SDLC: Software Quality as Code

La velocidad exponencial con la que los agentes de IA generan código plantea un riesgo de degradación estructural acelerada si no existen controles férreos. 

**En el framework AI-SDLC, la calidad del software no es una aspiración subjetiva; es una política declarativa auditable y ejecutable mediante herramientas deterministas (`quality-policy.yaml`)**.

El modelo de calidad se estructura en **tres niveles de defensa**:
1. **Reglas de Código y Estilo (Coding Rules)**: Prevención en tiempo de diseño y codificación.
2. **Métricas Estándar de Mantenibilidad y Complejidad**: Análisis cuantitativo de la arquitectura interna del código.
3. **Puertas de Liberación (Release Gates)**: Restricciones de paso en CI/CD que bloquean de forma automática e implacable cualquier versión que no cumpla con los umbrales mínimos.

---

## 2. Reglas de Código Automatizadas (Coding Rules)

Tanto los desarrolladores humanos como los agentes de codificación (`agent-developer`) están obligados a seguir los siguientes estándares automatizados:

### A. Motores de Inspección Estática
- **TypeScript / JavaScript**: ESLint (perfil estricto con `@typescript-eslint/recommended-requiring-type-checking`) y Prettier para formateo determinista.
- **Python**: Ruff / Flake8 y Black.
- **Java / C# / Go**: SonarQube Quality Profile, Spotless / golangci-lint.

### B. Reglas de Código Obligatorias
1. **Cero Tolerancia a Tipado Débil (`no-explicit-any`)**: Prohibido el uso de tipos genéricos no seguros o casts opacos.
2. **Cero Tolerancia a Código Muerto (`no-dead-code`, `no-unused-vars`)**: Variables, imports o funciones no referenciadas causan fallo inmediato de compilación.
3. **Límite de Longitud por Función**: Ninguna función puede superar las **40 líneas de código efectivo**. Funciones más extensas deben descomponerse en métodos auxiliares cohesivos.
4. **Prohibición de Supresiones Silenciosas**: Queda terminantemente prohibido para agentes o humanos añadir comentarios de supresión (`// @ts-ignore`, `// eslint-disable`, `# noqa`) sin un justificante formal (`ADR-TECH-DEBT-*`).

---

## 3. Métricas Estándar de Software y Umbrales de Liberación

El framework evalúa cuantitativamente todo el código fuente frente a cuatro métricas de la industria estandarizadas por IEEE, SEI e ISO/IEC 25010:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MÉTRICAS ESTÁNDAR Y UMBRALES DE RELEASE              │
└────────────────────────────────────────────────────────────────────────┘

 1. COMPLEJIDAD CICLOMÁTICA (McCabe)
    ├── Definición: Número de caminos linealmente independientes en el grafo de flujo.
    ├── Umbral Máximo: 10 por función.
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.

 2. COMPLEJIDAD COGNITIVA (SonarSource)
    ├── Definición: Dificultad humana para comprender y razonar sobre el flujo de control.
    ├── Umbral Máximo: 15 por función.
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.

 3. ÍNDICE DE MANTENIBILIDAD (SEI / Microsoft / ISO 25010)
    ├── Definición: Escala compuesta 0-100 basada en Halstead, McCabe y LOC.
    ├── Fórmula: MI = 171 - 5.2*ln(HV) - 0.23*CC - 16.2*ln(LOC)
    ├── Umbral Mínimo Aceptable: 65.0 / 100 (Objetivo: >85.0).
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.

 4. DUPLICACIÓN DE CÓDIGO
    ├── Definición: Porcentaje de líneas idénticas o casi idénticas repetidas en el proyecto.
    ├── Umbral Máximo: 3.0%.
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.

 5. COBERTURA DE PRUEBAS AUTOMATIZADAS
    ├── Línea: Mínimo 85.0% | Ramas (Branch): Mínimo 80.0%.
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.

 6. MATRIZ DE TRAZABILIDAD 360° (RTM DETERMINISTA MEDIANTE RESOLUCIÓN INVERSA)
    ├── Definición: Cobertura total compilada por reverse lookup entre paquetes PDaC (HOF-*),
    │   arquitectura arc42/NAF v4 (satisfies-requirements) y suites de tests (.feature y .spec).
    ├── Principio: Inversión de Dependencias (los requisitos no almacenan enlaces descendentes).
    ├── Umbral Obligatorio: 100% de requerimientos conformes sin dependencias huérfanas ni deriva.
    └── Acción ante Infracción: BLOQUEO INMEDIATO DE MERGE / RELEASE.
```

---

## 4. El Mecanismo del Release Gate (Restricciones a la Liberación)

El paso de una versión a producción (o el merge de un PR hacia `main`) se somete a la siguiente máquina de estados determinista:

```mermaid
flowchart TD
    A[Pull Request de Código / Candidato a Release] --> B[Pipeline CI/CD: Linters y Tipado Estricto]
    B -->|Errores de estilo / Any| X[FALLO: Corrección Requerida]

    B -->|Pass| C[Ejecución de Tests y Cobertura >= 85%]
    C -->|Cobertura < 85%| X

    C -->|Pass| D[Análisis de Complejidad y Mantenibilidad]
    D --> E{Evaluación contra quality-policy.yaml}

    E -->|Complejidad Ciclomática > 10| F[RECHAZO: Función Demasiado Compleja]
    E -->|Mantenibilidad < 65.0| G[RECHAZO: Código No Mantenible]
    E -->|Duplicación > 3%| H[RECHAZO: Duplicación Excesiva]

    F --> X
    G --> X
    H --> X

    E -->|Métricas OK| T[Verificación de Trazabilidad 360° aisdlc verify traceability]
    T -->|Requisitos huérfanos / Sin tests BDD| X
    T -->|Trazabilidad 100% Conforme| I[QUALITY GATE PASSED ✅]
    I --> J[Revisión Humana Tech Lead]
    J --> K[Liberación Autorizada para Producción]
```

> [!NOTE]
> **Modelo de Trazabilidad Invertida en el Release Gate**:
> Para evitar acoplamiento frágil y colisiones en Git, los requisitos de producto (`FR-*`, `QR-*`, `SEC-REQ-*`) no declaran qué servicios los implementan ni qué archivos de prueba los ejecutan. El paso de verificación `aisdlc verify traceability` inspecciona los bloques de arquitectura (`satisfies-requirements`) y escanea las suites de prueba (`.feature` y `.spec.*`) para construir inversamente la RTM completa. Si un requisito no es satisfecho por ningún servicio o carece de pruebas asociadas, el Release Gate bloquea el pipeline de forma determinista.

### 4.1 Entregables Documentales Obligatorios de Release (Manuales As-Code)

Para que una versión candidata sea autorizada para su paso a producción por el Tech Lead o Release Manager, es condición obligatoria e inviolable que el repositorio contenga actualizados y conformes a sus esquemas formales (`schemas/manuals/`):

1. **Manual de Usuario (`MAN-USER-*`)**:
   - **Catálogo de Roles de Usuario**: Definición canónica de roles autorizados (`allowed-roles`), niveles de acceso y matriz de capacidades RBAC.
   - **Matriz de Compatibilidad de Versiones y Clientes**: Compatibilidad entre versión de backend, CLI, SDKs, navegadores homologados y formatos de configuración.
   - **Mapeo de Roles a Journeys**: Todo Journey (`JRN-*`) debe declarar explícitamente qué roles pueden iniciarlo y completarlo, junto a sus precondiciones y flujos alternativos.
   - **Guía de Configuración**: Parámetros, variables de entorno, ficheros de configuración comentados y credenciales requeridas.
   - **Catálogo de Mensajes**: Clasificación estructurada de mensajes informativos, advertencias y errores con acciones correctivas recomendadas.

2. **Manual de Producción y Operaciones (`MAN-PROD-*`)**:
   - **Regeneración Determinista (Reproducible Builds)**: Herramientas de compilación fijadas con versión y checksum, dependencias congeladas en lockfile y validación de licencias (`license-policy.yaml`).
   - **Matriz de Compatibilidad de Infraestructura y Migración**: Compatibilidad con Kubernetes/runtimes, soporte de esquemas de datos $N-1$ para zero-downtime, interoperabilidad entre componentes (`CMP-*`) y rutas de actualización/rollback.
   - **Arquitectura CI/CD**: Flujo completo de pipelines, triggers automáticos y release gates deterministas.
   - **Estrategia y Procedimiento de Despliegue**: Enclaves de red (`SEC-ENC-*`), secretos/certificados mTLS, verificación de salud y plan de rollback inmediato.
   - **Runbooks de Errores Probables**: Diagnóstico y mitigación paso a paso de fallos típicos en producción (mTLS, fugas OOM, desconexiones, límites de red).

### 4.2 Puertas de Calidad Adaptativas por Perfil de Riesgo (Progressive Friction Gates)

Las compuertas de liberación no imponen la misma fricción burocrática a todos los cambios; evalúan los artefactos y exigencias en función del campo `profile` declarado en el frontmatter de `spec.md`:

```
┌────────────────────────────────────────────────────────────────────────┐
│             PUERTAS DE CALIDAD POR PERFIL DE FRICCIÓN                  │
└────────────────────────────────────────────────────────────────────────┘

 1. PERFIL PATCH (Baja Fricción / Hotfixes & Refactors Cosméticos)
    ├── Frontmatter: profile: patch en spec.md
    ├── Gates Obligatorios:
    │   • Linters y Tipado Estricto (cero errores / cero any).
    │   • Ejecución exitosa del comando de verificación declarado en spec.md.
    │   • Guardrail Determinista Anti-Patch Bypass (100% libre de rutas protegidas).
    └── Exenciones Formales:
        • Exento de RTM 360° inversa (no requiere handoff.yaml).
        • Exento de modelado STRIDE formal.
        • Exento de actualización de manuales MAN-USER-* y MAN-PROD-*.

 2. PERFIL STANDARD (Fricción Nominal / Casos de Uso Estándar)
    ├── Frontmatter: profile: standard en spec.md
    └── Gates Obligatorios:
        • Suite completa CI/CD: Linters, tipado y tests unitarios.
        • Calidad de código: CC <= 10, MI >= 50, Duplicación <= 3%, Cobertura >= 85%.
        • RTM 360° Conforme (reverse lookup entre HOF-*, arc42 y .feature).
        • Todas las tareas de tasks.md en estado COMPLETED.

 3. PERFIL CRITICAL (Alta Fricción / Criptografía, Secretos y Enclaves)
    ├── Frontmatter: profile: critical en spec.md
    └── Gates Obligatorios:
        • Todas las compuertas del Perfil Standard al 100%.
        • Modelado formal de amenazas STRIDE / OWASP ASVS aprobado.
        • Registro de Decisión Arquitectónica (ADR-*) formalmente aprobado.
        • Verificación de enclaves Zero Trust (SEC-ENC-*).
        • Doble aprobación humana en PR (Tech Lead + SecOps/Arquitecto).

 4. GUARDRAIL DETERMINISTA ANTI-PATCH BYPASS
    ├── Disparador: Cambio declarado con profile: patch en su spec.md.
    ├── Condición de Fallo Inmediato: Si el diff incluye modificaciones en:
    │   • schemas/**
    │   • quality-policy.yaml o license-policy.yaml
    │   • examples/security/** o enclaves SEC-ENC-*
    │   • Migraciones de base de datos o almacenamiento persistente
    └── Acción: RECHAZO AUTOMÁTICO DE CI/CD (EXIT 1) con exigencia de reclasificación.
```

### 4.3 Comando Unificado de Pre-Vuelo con Auto-Fix (`aisdlc check --fix`)

Para evitar rechazos mecánicos en los pipelines de CI/CD por fallos menores de sincronización (escenarios Gherkin modificados en Markdown pero no extraídos a `.feature`, o desfases menores en digests criptográficos tras ajustes de formato), los ingenieros y agentes de IA deben ejecutar el comando unificado de pre-vuelo antes de abrir o actualizar una Pull Request:

```bash
npx aisdlc check --fix
```

#### Fases de Ejecución:
1. **Sincronización Automática Previa (No Destructiva)**:
   - **Extracción BDD**: Detecta si los bloques ` ```gherkin ` en especificaciones de producto o seguridad difieren de los archivos `.feature` en disco y los sincroniza automáticamente.
   - **Sincronización Anti-Deriva PDaC**: Sincroniza los digests criptográficos SHA-256 de las citaciones canónicas (`citations: - id: ... digest: ...`) si el contenido destino existe y está actualizado.
2. **Ejecución Consolidada de Quality Gates**:
   - Corre deterministamente todos los verificadores maestros del framework:
     - Calidad de código (CC $\le 10$, MI $\ge 50$, LOC $\le 40$).
     - Trazabilidad 360° RTM inversa (cero requerimientos huérfanos).
     - Gobernanza y modos de autonomía en tareas (`tasks.md`).
     - Cobertura de pruebas en requisitos y tareas.
     - Licencias Open Source conformes con `license-policy.yaml`.
     - Integridad PDaC libre de deriva de digests.
     - Conformidad con esquemas JSON formales (Draft 2020-12).
3. **Dashboard Accionable en Terminal**:
   - Vuelca un resumen visual estructurado indicando el estado de cada compuerta (`PASSED`, `AUTO-FIXED`, `FAILED`).
   - En caso de errores bloqueantes no subsanables automáticamente, detalla la causa exacta y el comando de remediación, devolviendo código de salida determinista (0 en éxito, 1 si existen infracciones).

---

## 5. Política de Excepciones y Gestión de Deuda Técnica

Si por razones de rendimiento extremo (ej. bucle de procesamiento gráfico o parser telemétrico de bajo nivel) una función necesita superar la complejidad ciclomática de 10:
1. **Procedimiento Obligatorio**:
   - Se debe registrar un **ADR de Deuda Técnica** (`docs/architecture/09_decisions/ADR-TECH-DEBT-*.md`).
   - El ADR debe contener: justificación del impacto, benchmark comparativo y un plan de mitigación con fecha límite o hito de refactorización.
2. **Autoridad**:
   - Solo el **Lead Architect** y el **Tech Lead humano** pueden aprobar la excepción. Ningún agente de IA puede auto-concederse una excepción de calidad.

---

## 6. Generación Automática del Informe de Calidad (Quality Scorecard as Code)

El framework incorpora la capacidad de **generar automáticamente el informe formal de calidad** tan pronto como el código es escrito o modificado por un desarrollador o agente:

### A. Comando de Generación Automática
```bash
# 1. Informe global del proyecto
npx tsx scripts/generate-quality-report.ts

# 2. Informe acotado a un incremento o cambio SDD específico
npx tsx scripts/generate-quality-report.ts --change chg-001-telemetry-ingestion --target src/telemetry

# 3. Informe con destino personalizado
npx tsx scripts/generate-quality-report.ts --target src/ --output reports/SPRINT_QUALITY.md
```

### B. Contenido del Informe Generado
El documento producido (`reports/QUALITY_REPORT.md` o `specs/changes/active/<chg-id>/quality-report.md`) incluye:
1. **Calificación Global (SQALE Rating A-F)** basada en métricas ponderadas.
2. **Veredicto Determinista del Release Gate** (`AUTORIZADO (PASS)` o `BLOQUEADO (FAIL)`).
3. **Distribución Gráfica de Complejidad Ciclomática** (Baja [1-5], Moderada [6-10], Crítica [>10]).
4. **Tabla Desglosada por Función**: SLOC, Complejidad Ciclomática, Complejidad Cognitiva, Índice de Mantenibilidad y detección de code smells.
5. **Instrucciones Accionables de Refactorización**: Si el Release Gate falla, el informe emite automáticamente los prompts y pautas de descomposición para que el agente de IA lo subsane sin intervención manual.

---

## 7. Arquitectura de Calidad Multilenguaje (Polyglot Support)

El framework AI-SDLC está concebido como una **plataforma políglota universal**. Ni la metodología ni los mecanismos de validación están atados a un único lenguaje de programación.

### A. Niveles de Neutralidad del Framework

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DE CALIDAD POLÍGLOTA                    │
└────────────────────────────────────────────────────────────────────────┘

 1. CAPA CONCEPTUAL Y METODOLÓGICA (100% Agnóstica de Lenguaje)
    ├── Definición de Producto: ProductShape en Markdown + JSON Schema
    ├── Arquitectura de Sistemas: arc42 (12 secciones) + NAF v4 Grid
    ├── Ciberseguridad Shift-Left: STRIDE, OWASP ASVS, Enclaves DMZ
    ├── Gobernanza de Licencias: SPDX, allowlist/denylist, SBOM CycloneDX
    └── Criterios BDD: Gherkin estándar (.feature) ejecutable en cualquier runtime

 2. MOTOR NATIVO EMBEBIDO (Out-of-the-box en scripts/)
    ├── Analizador sintáctico universal para métricas McCabe (CC), MI y LOC
    └── Lenguajes soportados directamente:
        • TypeScript / JavaScript (.ts, .js)
        • Python (.py)
        • Java / Kotlin (.java, .kt)
        • Go (.go)
        • C# (.cs)
        • Rust (.rs)
        • C / C++ (.c, .cpp)

 3. ADAPTADORES DE ECOSISTEMA NATIVO Y ESTÁNDARES EMPRESARIALES
    ├── Python: Ruff, Black, Radon, Xenon, PyTest, Coverage.py
    ├── Java: Checkstyle, SpotBugs, PMD, JUnit 5, JaCoCo
    ├── Go: golangci-lint, gocyclo, go test -cover
    ├── C#/.NET: dotnet format, Roslyn Analyzers, Coverlet
    ├── Rust: cargo clippy, rustfmt, cargo-tarpaulin
    └── Agregadores Empresariales: SonarQube / SonarCloud y formato SARIF (OASIS)
```

### B. Mapeo de Ecosistemas en `quality-policy.yaml`

El archivo de configuración permite orquestar linters y motores de cobertura específicos para cada lenguaje manteniendo umbrales cuantitativos homogéneos (`CC <= 10`, `MI >= 50`, `Coverage >= 85%`).

### C. El Estándar Universal SARIF (Static Analysis Results Interchange Format)
Para integraciones complejas en grandes organizaciones, el AI-SDLC adopta el estándar **SARIF (JSON OASIS)**. Cualquier analizador de cualquier lenguaje (Roslyn, Clang-Tidy, ESLint, Bandit, Flake8) puede volcar sus diagnósticos a formato SARIF, siendo consolidado de forma transparente por el pipeline de release.
