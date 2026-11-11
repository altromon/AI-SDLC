/**
 * Regulatory Control Mapper (CMP-051)
 * Correlates the 12 AI-SDLC Quality Gates with:
 * - EU AI Act (2024/1689) Articles 9-15
 * - ISO/IEC 42001:2023 Clauses
 * - NIST SSDF SP 800-218 Practices
 */

import { QualityGateId, RegulatoryGateMapping } from '../types/regulatory-compliance.js';

const GATE_REGULATORY_REGISTRY: Record<QualityGateId, RegulatoryGateMapping> = {
  quality: {
    gateId: 'quality',
    euAiAct: 'Art. 15 (Precisión, robustez y ciberseguridad)',
    iso42001: 'A.8.2 (Diseño y desarrollo de sistemas de IA)',
    nistSsdf: 'PW.6 (Calidad y mantenibilidad del software)',
    description: 'Complexity, cognitive load, maintainability, and code quality thresholds',
  },
  traceability: {
    gateId: 'traceability',
    euAiAct: 'Art. 11 (Documentación técnica y trazabilidad)',
    iso42001: 'A.6.2 (Trazabilidad de requisitos y objetivos de IA)',
    nistSsdf: 'PO.3 (Trazabilidad integral de requisitos a código)',
    description: 'Reverse Requirements Traceability Matrix (RTM)',
  },
  governance: {
    gateId: 'governance',
    euAiAct: 'Art. 14 (Supervisión humana y gobernanza)',
    iso42001: 'A.5.4 (Roles y responsabilidades de gobernanza)',
    nistSsdf: 'PO.1 (Políticas de gobernanza y supervisión)',
    description: 'Human-in-the-loop and autonomy modes oversight',
  },
  testing: {
    gateId: 'testing',
    euAiAct: 'Art. 15 (Pruebas, validación y robustez)',
    iso42001: 'A.8.4 (Evaluación y pruebas de sistemas de IA)',
    nistSsdf: 'PW.7 (Pruebas automatizadas y suites de regresión)',
    description: 'Automated test execution and unit/branch/function coverage',
  },
  gherkin: {
    gateId: 'gherkin',
    euAiAct: 'Art. 11 (Especificaciones técnicas formales)',
    iso42001: 'A.6.1 (Definición de objetivos y especificaciones)',
    nistSsdf: 'PW.1 (Requisitos verificables y especificaciones BDD)',
    description: 'Executable Gherkin specifications and BDD synchronization',
  },
  licenses: {
    gateId: 'licenses',
    euAiAct: 'Art. 10 (Gobernanza de la cadena de suministro)',
    iso42001: 'A.9.1 (Gestión de terceros y componentes abiertos)',
    nistSsdf: 'PS.1 (Seguridad en dependencias y SBOM)',
    description: 'OSS license compliance and SBOM software supply chain audit',
  },
  pdac: {
    gateId: 'pdac',
    euAiAct: 'Art. 12 (Registro, trazabilidad y auditoría)',
    iso42001: 'A.7.2 (Control de cambios e integridad)',
    nistSsdf: 'PO.3.2 (Integridad criptográfica y detección de drift)',
    description: 'Proven Provenance & Drift as Code DAG graph validation',
  },
  schemas: {
    gateId: 'schemas',
    euAiAct: 'Art. 11 (Estructura formal de artefactos técnicos)',
    iso42001: 'A.8.3 (Estándares de artefactos de ingeniería)',
    nistSsdf: 'PW.4 (Validación de esquemas y contratos de datos)',
    description: 'YAML/JSON Schema structural validation and frontmatter conformity',
  },
  duplicates: {
    gateId: 'duplicates',
    euAiAct: 'Art. 15 (Robustez, consistencia y anti-colisión)',
    iso42001: 'A.6.2 (Consistencia de requisitos)',
    nistSsdf: 'PW.5 (Calidad de especificaciones y DRY)',
    description: 'Duplicate detector and spec namespace collision prevention',
  },
  security: {
    gateId: 'security',
    euAiAct: 'Art. 15 (Ciberseguridad y resiliencia ante ataques)',
    iso42001: 'A.9.3 (Ciberseguridad de sistemas de IA)',
    nistSsdf: 'PW.8, RV.1 (Análisis estático de seguridad y detección de secretos)',
    description: 'Secret leaks prevention, SAST static analysis, and threat mitigations',
  },
  privacy: {
    gateId: 'privacy',
    euAiAct: 'Art. 10 (Gobernanza de datos y privacidad)',
    iso42001: 'A.7.4 (Protección de datos y PII)',
    nistSsdf: 'PS.3 (Protección de privacidad y cumplimiento GDPR)',
    description: 'Personal data assets, GDPR RoPA, and LINDDUN privacy requirements',
  },
  friction: {
    gateId: 'friction',
    euAiAct: 'Art. 14 (Supervisión, control y anti-evasión)',
    iso42001: 'A.5.2 (Controles de proceso y aseguramiento)',
    nistSsdf: 'PO.2 (Cumplimiento de políticas y prevención de bypass)',
    description: 'Progressive friction and anti-tampering guards',
  },
};

export class RegulatoryControlMapper {
  mapGate(gateId: string): RegulatoryGateMapping {
    const mapping = GATE_REGULATORY_REGISTRY[gateId as QualityGateId];
    if (!mapping) {
      throw new Error(`[ERR_UNKNOWN_GATE] Unknown or unsupported quality gate identifier: ${gateId}`);
    }
    return { ...mapping };
  }

  getAllMappings(): Record<QualityGateId, RegulatoryGateMapping> {
    return { ...GATE_REGULATORY_REGISTRY };
  }

  getEuAiActCoverage(): string[] {
    return ['Art. 9', 'Art. 10', 'Art. 11', 'Art. 12', 'Art. 13', 'Art. 14', 'Art. 15'];
  }

  getIso42001Coverage(): string[] {
    return ['A.5.2', 'A.5.4', 'A.6.1', 'A.6.2', 'A.7.2', 'A.7.4', 'A.8.2', 'A.8.3', 'A.8.4', 'A.9.1', 'A.9.3'];
  }

  getNistSsdfCoverage(): string[] {
    return ['PO.1', 'PO.2', 'PO.3', 'PO.3.2', 'PS.1', 'PS.3', 'PW.1', 'PW.4', 'PW.5', 'PW.6', 'PW.7', 'PW.8', 'RV.1'];
  }
}
