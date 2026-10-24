---
id: UC-041-BOUNDED-CONTEXT-TEMPLATE
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Plantilla Canónica de Bounded Context para Modelado DDD en Capa de Producto
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-041-BOUNDED-CONTEXT-TEMPLATE: Plantilla Canónica de Bounded Context en Producto

## 1. Intención y Resultado
Completar el modelado estratégico de producto bajo principios de Domain-Driven Design (DDD) en el framework AI-SDLC, proveyendo una plantilla canónica estandarizada (`templates/product/bounded-context.template.md`) con prefijo `BC-` que permita a ingenieros de producto, arquitectos y agentes autónomos formalizar los límites lingüísticos, clasificación de dominio (Core, Supporting, Generic), mapeo de contextos e invariantes de negocio de cada Bounded Context.

## 2. Precondiciones
- El framework cuenta con plantillas de producto hermanas (`actor`, `business-rule`, `journey`, `requirement`, `term`, `use-case`).
- El comando de inicialización `aisdlc init` despliega las plantillas canónicas de producto en el repositorio destino.

## 3. Flujo Principal
1. El usuario o agente inicializa o expande la capa de producto de un repositorio.
2. `aisdlc init` o la consulta de plantillas provee `templates/product/bounded-context.template.md`.
3. El equipo modela un Bounded Context definiendo propósito, términos de lenguaje ubicuo (`TERM-*`), componentes asociados (`CMP-*`) y relaciones de integración (Upstream/Downstream, ACL, Open Host Service).
4. El archivo generado en `product/bounded-contexts/BC-*.md` delimita unívocamente la frontera contextual del subdominio.
