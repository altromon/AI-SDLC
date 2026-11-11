---
id: ACT-THREAT-COMPLIANCE-SPOOFER
type: threat-actor
version: "1.0.0"
schema-version: "1.0"
title: Falsificador de Evidencias de Cumplimiento y Runner CI/CD Comprometido
status: active
threat-capability: advanced-persistent-threat
motivation: sabotage
attack-surfaces:
  - "Canal de generación de reportes y CLI aisdlc report compliance"
  - "Entorno de ejecución CI/CD runner y atestaciones in-toto"
  - "Almacenamiento de artefactos y pipeline de publicación de bundles"
supersedes: null
superseded-by: null
---

# ACT-THREAT-COMPLIANCE-SPOOFER: Falsificador de Evidencias de Cumplimiento y Runner Comprometido

## 1. Caracterización del Atacante
Actor malicioso con capacidad de persistencia avanzada o acceso privilegiado a runners CI/CD, procesos de orquestación o cuentas de servicio. Posee conocimiento profundo de los flujos de auditoría regulatoria (EU AI Act, ISO/IEC 42001, NIST SSDF) y busca simular conformidad técnica sin satisfacer las Quality Gates obligatorias o alterando los veredictos de seguridad y calidad.

## 2. Objetivos de Ataque
- Modificar retroactivamente los veredictos en `reports/audit-evidence-bundle.json` para disfrazar componentes no conformes como aprobados.
- Forjar claims OIDC o certificados Sigstore/Cosign efímeros para dotar de aparente legitimidad legal a bundles adulterados.
- Eludir la trazabilidad criptográfica y provocar daño regulatorio, multas millonarias o despliegue no autorizado de sistemas de IA de alto riesgo.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Caracterización de perfil de amenaza sobre falsificación de bundles normativos | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
