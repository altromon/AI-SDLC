# Especificación de Cambio: CHG-033-ARCHITECTURE-TEMPLATES

## 1. Requerimientos Satisfechos
- `FR-033-ARCHITECTURE-TEMPLATES-001`: Plantillas Canónicas de Arquitectura arc42 y NAF v4.
- Derivado de `UC-033-ARCHITECTURE-TEMPLATES`.

## 2. Especificación Detallada de Entregables
Se suministran en el directorio `templates/architecture/` los siguientes artefactos:

1. `introduction-and-goals.template.md` (arc42 Sec. 1 / NAF Enterprise & Capability):
   - Visión del sistema, resumen ejecutivo, objetivos estratégicos.
   - Objetivos de calidad primarios citando `QR-*`.
   - Matriz de stakeholders y actores citando `ACT-*`.

2. `architecture-constraints.template.md` (arc42 Sec. 2 / NAF Constraints):
   - Restricciones técnicas (`CON-*`, `ACON-*`).
   - Restricciones organizativas y normativas (gobernanza, cumplimiento, estándares ISO/IEC).
   - Políticas de licencias de software citando `license-policy.yaml` (`LIC-POL-*`).

3. `context-and-scope.template.md` (arc42 Sec. 3 / NAF Operational Perspective):
   - Contexto de negocio y delimitación de fronteras.
   - Contexto técnico y protocolos de integración de canales.
   - Intercambios de información operativa (`CTX-*`, `OIE-*`).

4. `solution-strategy.template.md` (arc42 Sec. 4 / NAF Service & Resource Strategy):
   - Decisiones tecnológicas estructurales (`STRAT-*`).
   - Patrones arquitectónicos fundamentales (DDD, Event-Driven, Microkernel, Hexagonal).
   - Justificación de tradeoffs y viabilidad técnica.

5. `level-1-whitebox.template.md` (arc42 Sec. 5 / NAF Services & Systems - Level 1):
   - Descomposición macro en caja blanca de Nivel 1.
   - Identificación de Bounded Contexts y relaciones de dominio.
   - Mapeo de subsistemas hacia los componentes individuales `CMP-*`.

6. `runtime-view.template.md` (arc42 Sec. 6 / NAF Behaviour & Sequences):
   - Escenarios de ejecución nominales, excepcionales y de degradación.
   - Diagramas de secuencia y flujos de estados Mermaid (`SEQ-*`, `FLW-*`).
   - Citas a requerimientos funcionales (`FR-*`) y de seguridad (`SEC-REQ-*`).

7. `deployment-view.template.md` (arc42 Sec. 7 / NAF Resource Deployment):
   - Mapeo de bloques de software a infraestructura física y virtualizada (`DEP-*`, `RES-*`).
   - Topología de red, enclaves segmentados (`SEC-ENC-*`), balanceadores y zonas de disponibilidad.
   - Especificaciones de recursos mínimos y escalabilidad.

8. `cross-cutting-concepts.template.md` (arc42 Sec. 8 / NAF Information & Security):
   - Modelos de datos transversales (`DATA-*`).
   - Concepto de seguridad Zero Trust y gestión de identidades/secretos (`SEC-ENC-*`, `SEC-POL-*`).
   - Observabilidad (métricas OpenTelemetry, trazas distribuidas, auditoría inmutable).

9. `quality-requirements.template.md` (arc42 Sec. 10 / NAF Quality):
   - Árbol de calidad formal (Quality Tree).
   - Escenarios de calidad evaluables citando requerimientos no funcionales (`QR-*`).

10. `risks-and-technical-debt.template.md` (arc42 Sec. 11 / NAF Risk & Technical Debt):
    - Registro formal de riesgos de arquitectura (`RSK-*`) con probabilidad e impacto.
    - Estrategias deterministas de mitigación y monitorización.
    - Catálogo de deuda técnica y planes de contingencia.

11. `glossary.template.md` (arc42 Sec. 12 / NAF Taxonomy & Terms):
    - Glosario canónico de términos técnicos y de dominio (`TERM-*`).
    - Catálogo de Bounded Contexts (`BC-*`).
