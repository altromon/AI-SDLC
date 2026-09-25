/**
 * AI-SDLC: SDD Change Scaffolding Engine
 * Automates deterministic creation of active SDD workspaces, populating
 * proposal.md, spec.md, design.md, tasks.md, and depositing the HOF-* sidecar.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ChangeProfile,
  ProductHandoff,
  SddChangeScaffoldOptions,
  SddChangeScaffoldResult,
} from '../../types/index.js';
import { walkMdFiles } from '../../utils/fs.js';
import { extractGherkinBlock } from '../../verifiers/gherkin.js';
import { computeCanonicalSha256 } from '../../verifiers/pdac-graph.js';
import { validateArtifactSchema } from '../../verifiers/schemas.js';
import { parseFrontmatter } from '../../verifiers/traceability.js';
import { depositProductHandoffSidecar, getSddAdapter } from './index.js';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getNextCorrelativeNumber(rootDir: string): number {
  const candidateDirs = [
    path.join(rootDir, 'specs', 'changes', 'active'),
    path.join(rootDir, 'specs', 'changes', 'completed'),
    path.join(rootDir, 'specs'),
    path.join(rootDir, 'openspec', 'changes'),
  ];

  let maxNum = 0;

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const match = e.name.match(/^(?:chg|CHG|patch|PATCH)-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    } catch {
      // Ignore unreadable candidate dir
    }
  }

  return maxNum + 1;
}

export function scaffoldSddChange(options: SddChangeScaffoldOptions): SddChangeScaffoldResult {
  const rootDir = options.rootDir || process.cwd();
  const framework = options.framework || 'openspec';
  const author = options.author || 'agent-developer / human-dev';
  const profile: ChangeProfile = options.profile || 'standard';
  const dateStr = new Date().toISOString().split('T')[0];
  const name = options.name.trim();

  const errors: string[] = [];
  const createdFiles: string[] = [];

  if (!name) {
    return {
      success: false,
      changeId: '',
      canonicalId: '',
      profile,
      changeDir: '',
      createdFiles: [],
      citedArtifacts: [],
      errors: ['El nombre del cambio no puede estar vacío.'],
    };
  }

  // 1. Generate normalized change-id
  let slug: string;
  let canonicalId: string;
  let padNum = '001';

  const targetChangeId = options.changeId || options.id;
  if (targetChangeId) {
    const rawId = targetChangeId.trim();
    slug = slugify(rawId);
    canonicalId = rawId.toUpperCase();
    const match = rawId.match(/^(?:chg|CHG|patch|PATCH)-(\d+)/i);
    if (match) {
      padNum = match[1];
    }
  } else {
    const nextNum = getNextCorrelativeNumber(rootDir);
    padNum = String(nextNum).padStart(3, '0');
    const nameSlug = slugify(name);
    const prefix = profile === 'patch' ? 'patch' : 'chg';
    slug = `${prefix}-${padNum}-${nameSlug}`;
    canonicalId = `${prefix.toUpperCase()}-${padNum}-${nameSlug.toUpperCase()}`;
  }

  // 2. Determine target change workspace folder
  const adapter = getSddAdapter(framework);
  const changeDir = adapter.getChangeWorkspaceDir(rootDir, slug);

  if (fs.existsSync(changeDir)) {
    const existing = fs.readdirSync(changeDir);
    if (existing.length > 0) {
      return {
        success: false,
        changeId: slug,
        canonicalId,
        profile,
        changeDir,
        createdFiles: [],
        citedArtifacts: [],
        errors: [`El directorio del cambio '${changeDir}' ya existe y no está vacío.`],
      };
    }
  } else {
    fs.mkdirSync(changeDir, { recursive: true });
  }

  // 3. Scan canonical artifacts across repository for citations
  const allMdFiles = walkMdFiles(rootDir);
  const artifactMap = new Map<
    string,
    { id: string; file: string; frontmatter: any; title?: string; digest: string }
  >();

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter && frontmatter.id) {
        const id = String(frontmatter.id);
        const digest = computeCanonicalSha256(content);
        const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
        artifactMap.set(id, { id, file, frontmatter, title, digest });
      }
    } catch {
      // Ignore unparseable
    }
  }

  // Parse --from input IDs
  const rawFrom = options.from;
  const inputFromIds: string[] = [];
  if (Array.isArray(rawFrom)) {
    for (const item of rawFrom) {
      if (typeof item === 'string') {
        inputFromIds.push(...item.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
  } else if (typeof rawFrom === 'string') {
    inputFromIds.push(...rawFrom.split(',').map((s) => s.trim()).filter(Boolean));
  }

  let productArtifactCreated: string | undefined;
  const citedArtifacts: Array<{ id: string; digest: string; title?: string; comment?: string }> = [];
  const subRequirements: string[] = [];
  const subUseCases: string[] = [];
  const subSecReqs: string[] = [];
  const subRules: string[] = [];

  // Patch profile shortcut: only spec.md with profile: patch is created
  if (profile === 'patch') {
    for (const id of inputFromIds) {
      const existing = artifactMap.get(id);
      if (existing) {
        citedArtifacts.push({
          id: existing.id,
          digest: `sha256:${existing.digest}`,
          title: existing.title,
          comment: `Citación de ${existing.frontmatter?.type || 'artefacto'} (${existing.title || existing.id})`,
        });
      }
    }

    const citationsSection =
      citedArtifacts.length > 0
        ? `citations:\n${yaml
            .dump(
              citedArtifacts.map((c) => ({ id: c.id, digest: c.digest, comment: c.comment })),
              { indent: 2, lineWidth: -1 }
            )
            .trim()
            .split('\n')
            .map((l) => `  ${l}`)
            .join('\n')}\n`
        : '';

    const specPath = path.join(changeDir, 'spec.md');
    const specFmObj = {
      id: `SPEC-${canonicalId}`,
      type: 'delivery-spec',
      'change-id': canonicalId,
      profile: 'patch',
      'acceptance-format': 'gherkin',
      'cucumber-tags': [`@${canonicalId}`, '@patch', '@automated'],
    };
    const specContent = `---
id: SPEC-${canonicalId}
type: delivery-spec
change-id: ${canonicalId}
profile: patch
acceptance-format: gherkin
cucumber-tags:
  - "@${canonicalId}"
  - "@patch"
  - "@automated"
${citationsSection}verification:
  method: automated-test
  command: pnpm test
---

# Delivery Specification (Fast Patch): ${canonicalId}

## 1. Patch Scope and Justification
${name}

## 2. Acceptance and Correction Criteria (BDD Gherkin)

\`\`\`gherkin
@${canonicalId} @patch @automated
Feature: Patch ${canonicalId} - ${name}
  Scenario: Defect fix verification
    Given the system exhibits the defect identified in "${name}"
    When the patch fix is applied
    Then the anomalous behavior is resolved and verification passes
\`\`\`

## 3. Automated Verification
- **Command**: \`pnpm test\`
- **Criteria**: All unit and regression tests must pass.
`;
    fs.writeFileSync(specPath, specContent, 'utf-8');
    createdFiles.push(specPath);

    const specGherkinBlocks = extractGherkinBlock(specContent);
    if (specGherkinBlocks.length === 0) {
      errors.push(
        `El archivo 'spec.md' de la entrega debe incluir obligatoriamente especificaciones en formato Gherkin (\`\`\`gherkin ... \`\`\`).`
      );
    }

    const wsValidation = adapter.validateWorkspace(changeDir);
    if (!wsValidation.valid) {
      errors.push(...wsValidation.errors);
    }

    const specValidation = validateArtifactSchema(specFmObj as any, 'delivery-spec', rootDir);
    if (!specValidation.valid) {
      errors.push(...specValidation.errors);
    }

    return {
      success: errors.length === 0,
      changeId: slug,
      canonicalId,
      profile,
      changeDir,
      createdFiles,
      citedArtifacts,
      errors,
    };
  }

  // 4. Handle Option A: Greenfield feature or explicit citations
  if (inputFromIds.length === 0) {
    // Greenfield feature: create draft canonical requirement in specs/product/
    const nameSlugUpper = slugify(name).toUpperCase();
    const reqId = `FR-${padNum}-${nameSlugUpper}-001`;
    const ucId = `UC-${padNum}-${nameSlugUpper}`;

    const productDir = path.join(rootDir, 'specs', 'product');
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    const reqFilePath = path.join(productDir, `${reqId}.md`);
    if (!fs.existsSync(reqFilePath)) {
      const reqContent = `---
id: ${reqId}
type: requirement
title: "${name}"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
derives-from:
  - ${ucId}
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@${reqId}"
  - "@automated"
supersedes: null
superseded-by: null
---

# ${reqId}: ${name}

## 1. Enunciado Normativo
El sistema DEBE implementar y soportar la capacidad de ${name}.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

\`\`\`gherkin
@${reqId} @automated
Feature: ${name}
  As a user or client system
  I want to execute the capability for ${name}
  So that the expected outcome and value are achieved

  Scenario: Nominal successful flow
    Given the system is in an operational state
    When the operation for "${name}" is executed
    Then the operation completes successfully
\`\`\`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | ${dateStr} | ${author} | Definición inicial de requerimiento para ${canonicalId} | ${canonicalId} |
`;
      fs.writeFileSync(reqFilePath, reqContent, 'utf-8');
      productArtifactCreated = reqFilePath;
      createdFiles.push(reqFilePath);

      const digest = computeCanonicalSha256(reqContent);
      citedArtifacts.push({
        id: reqId,
        digest: `sha256:${digest}`,
        title: name,
        comment: `Requerimiento funcional canónico asociado (Génesis ${canonicalId})`,
      });
      subRequirements.push(reqId);
      subUseCases.push(ucId);
    }
  } else {
    // Process explicit --from IDs
    for (const id of inputFromIds) {
      const existing = artifactMap.get(id);
      if (existing) {
        citedArtifacts.push({
          id: existing.id,
          digest: `sha256:${existing.digest}`,
          title: existing.title,
          comment: `Citación de ${existing.frontmatter.type || 'artefacto'} (${existing.title || existing.id})`,
        });

        if (id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-')) {
          if (!subRequirements.includes(id)) subRequirements.push(id);
        } else if (id.startsWith('UC-')) {
          if (!subUseCases.includes(id)) subUseCases.push(id);
          // Auto-discover derived requirements from this UC
          for (const [otherId, otherArt] of artifactMap.entries()) {
            const derives = otherArt.frontmatter['derives-from'];
            const derivesArr = Array.isArray(derives) ? derives : derives ? [derives] : [];
            if (derivesArr.includes(id)) {
              if (otherId.startsWith('FR-') || otherId.startsWith('QR-')) {
                if (!subRequirements.includes(otherId)) subRequirements.push(otherId);
                if (!citedArtifacts.some((c) => c.id === otherId)) {
                  citedArtifacts.push({
                    id: otherId,
                    digest: `sha256:${otherArt.digest}`,
                    title: otherArt.title,
                    comment: `Requerimiento derivado de ${id}`,
                  });
                }
              }
            }
          }
        } else if (id.startsWith('SEC-REQ-') || id.startsWith('SAF-REQ-')) {
          if (!subSecReqs.includes(id)) subSecReqs.push(id);
        } else if (id.startsWith('BR-')) {
          if (!subRules.includes(id)) subRules.push(id);
        }
      } else {
        // Artifact not found in repository: scaffold draft requirement in specs/product
        const productDir = path.join(rootDir, 'specs', 'product');
        if (!fs.existsSync(productDir)) {
          fs.mkdirSync(productDir, { recursive: true });
        }
        const reqFilePath = path.join(productDir, `${id}.md`);
        const reqContent = `---
id: ${id}
type: ${id.startsWith('UC-') ? 'use-case' : id.startsWith('SEC-REQ-') ? 'security-requirement' : 'requirement'}
title: "${name}"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@${id}"
  - "@automated"
supersedes: null
superseded-by: null
---

# ${id}: ${name}

## 1. Enunciado
Definición de artefacto citado en ${canonicalId}.

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

\`\`\`gherkin
@${id} @automated
Feature: ${name}
  Scenario: Expected behavior verification
    Given the system is initialized for "${name}"
    When the request associated with ${id} is processed
    Then the response satisfies acceptance criteria
\`\`\`
`;
        fs.writeFileSync(reqFilePath, reqContent, 'utf-8');
        createdFiles.push(reqFilePath);
        productArtifactCreated = reqFilePath;

        const digest = computeCanonicalSha256(reqContent);
        citedArtifacts.push({
          id,
          digest: `sha256:${digest}`,
          title: name,
          comment: `Artefacto citado en ${canonicalId}`,
        });

        if (id.startsWith('UC-')) {
          subUseCases.push(id);
        } else if (id.startsWith('SEC-REQ-')) {
          subSecReqs.push(id);
        } else {
          subRequirements.push(id);
        }
      }
    }
  }

  // Ensure at least 1 requirement in subRequirements for schema validity
  if (subRequirements.length === 0) {
    const fallbackReqId = `FR-${padNum}-${slugify(name).toUpperCase()}-001`;
    subRequirements.push(fallbackReqId);
  }

  // 5. Build citations YAML block for Markdown frontmatters
  const citationsYamlBlock = yaml
    .dump(
      citedArtifacts.map((c) => ({
        id: c.id,
        digest: c.digest,
        comment: c.comment,
      })),
      { indent: 2, lineWidth: -1 }
    )
    .trim()
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  // 6. Generate proposal.md
  const proposalPath = path.join(changeDir, 'proposal.md');
  const proposalContent = `---
id: ${canonicalId}
type: spec-change-proposal
title: "${name}"
status: draft
author: "${author}"
citations:
${citationsYamlBlock}
---

# Propuesta de Cambio: ${canonicalId}

## 1. Motivación y Alcance
${name}

## 2. Dependencias Externas Evaluadas
- Lista de dependencias nuevas a incorporar y verificación de licencia según \`license-policy.yaml\`.
`;
  fs.writeFileSync(proposalPath, proposalContent, 'utf-8');
  createdFiles.push(proposalPath);

  // 7. Generate spec.md with mandatory Gherkin formatting
  const specPath = path.join(changeDir, 'spec.md');
  const specFmObj = {
    id: `SPEC-${canonicalId}`,
    type: 'delivery-spec',
    'change-id': canonicalId,
    profile,
    'acceptance-format': 'gherkin',
    'cucumber-tags': [`@${canonicalId}`, '@automated'],
  };
  const specContent = `---
id: SPEC-${canonicalId}
type: delivery-spec
change-id: ${canonicalId}
profile: ${profile}
acceptance-format: gherkin
cucumber-tags:
  - "@${canonicalId}"
  - "@automated"
---

# Delivery Specification: ${canonicalId}

## 1. Functional Behavior Scenarios (BDD Gherkin)

\`\`\`gherkin
@${canonicalId} @functional @automated
Feature: ${name}
  As a system component or user
  I want to process the operation for ${name}
  So that delivery criteria are satisfied

  Scenario: Nominal successful flow
    Given the system is in a nominal operational state
    When the operation for "${name}" is processed
    Then the operation completes successfully satisfying acceptance criteria
\`\`\`

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

\`\`\`gherkin
@${canonicalId} @security @mitigation
Feature: Security Mitigation for ${canonicalId}
  Scenario: Unauthorized access attempt or invalid payload
    Given an unauthenticated actor or invalid credentials
    When the request reaches protected enclaves
    Then the connection is rejected immediately and a security event is recorded
\`\`\`
`;
  fs.writeFileSync(specPath, specContent, 'utf-8');
  createdFiles.push(specPath);

  const specGherkinBlocks = extractGherkinBlock(specContent);
  if (specGherkinBlocks.length === 0) {
    errors.push(
      `El archivo 'spec.md' de la entrega debe incluir obligatoriamente especificaciones en formato Gherkin (\`\`\`gherkin ... \`\`\`).`
    );
  }

  // 8. Generate design.md
  const designPath = path.join(changeDir, 'design.md');
  const designContent = `---
id: DSG-${canonicalId}
type: spec-design
change-id: ${canonicalId}
title: "Diseño Técnico: ${name}"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-${canonicalId}"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
citations:
${citationsYamlBlock}
---

# Diseño Técnico: ${canonicalId}

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se despliega en el enclave perimetral y materializa el servicio correspondiente.

## 2. Contratos de Datos e Interfaces
Detalle de DTOs, interfaces de servicio y esquemas de datos asociados a ${name}.

## 3. Protocolos de Manejo de Errores y Mitigación
Gestión de excepciones, reintentos y respuestas ante anomalías.

## 4. Conformidad con la Política de Licencias (\`license-policy.yaml\`)
Todas las librerías empleadas en la implementación deben cumplir con las categorías permitidas en \`license-policy.yaml\`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | ${dateStr} | ${author} | Diseño técnico formal inicial | ${canonicalId} |
`;
  fs.writeFileSync(designPath, designContent, 'utf-8');
  createdFiles.push(designPath);

  // 9. Generate tasks.md
  const tasksPath = path.join(changeDir, 'tasks.md');
  const tasksFm = {
    id: `TSK-PLAN-${canonicalId}`,
    type: 'task-plan',
    'change-id': canonicalId,
    title: `Desglose de Tareas Verificables: ${name}`,
    version: '1.0.0',
    'schema-version': '1.0',
    status: 'draft',
    'governance-summary': {
      'autonomous-tasks-count': 1,
      'human-review-plan-count': 1,
      'ambiguous-count': 0,
      'high-risk-manual-count': 0,
    },
    tasks: [
      {
        id: 'TSK-001',
        title: 'Definición de Contratos, Interfaces y Tipos de Datos',
        complexity: 'LOW',
        'risk-level': 'LOW',
        'autonomy-mode': 'AUTONOMOUS',
        verification: {
          method: 'quality-gate',
          'command-or-criteria': 'pnpm test',
        },
        'assigned-to': 'agent-developer',
        status: 'PENDING',
      },
      {
        id: 'TSK-002',
        title: 'Implementación de Lógica y Pruebas Unitarias/BDD',
        complexity: 'MEDIUM',
        'risk-level': 'MEDIUM',
        'autonomy-mode': 'HUMAN_REVIEW_PLAN',
        verification: {
          method: 'automated-unit-test',
          'command-or-criteria': 'pnpm test',
        },
        'assigned-to': 'agent-developer',
        status: 'PENDING',
      },
    ],
    supersedes: null,
    'superseded-by': null,
  };

  const tasksContent = `---
${yaml.dump(tasksFm, { indent: 2, lineWidth: -1 }).trim()}
---

# Desglose de Tareas Verificables: ${canonicalId}

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **\`AUTONOMOUS\`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **\`HUMAN_REVIEW_PLAN\`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **\`AMBIGUOUS\`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **\`HIGH_RISK_MANUAL\`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Contratos (TSK-001)
- **ID**: \`TSK-001\`
- **Descripción**: Crear las interfaces y estructuras de datos estipuladas en \`design.md\`.
- **Modo**: \`AUTONOMOUS\` 🟢
- **Verificación**: \`pnpm test\`

### Fase 2: Implementación y Pruebas (TSK-002)
- **ID**: \`TSK-002\`
- **Descripción**: Implementar la lógica y pruebas de ${name}.
- **Modo**: \`HUMAN_REVIEW_PLAN\` 🟡
- **Verificación**: \`pnpm test\`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | ${dateStr} | ${author} | Creación inicial del plan de tareas con gobernanza | ${canonicalId} |
`;
  fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
  createdFiles.push(tasksPath);

  // 10. Deposit handoff.yaml sidecar
  const subgraph: {
    requirements: string[];
    useCases?: string[];
    securityRequirements?: string[];
    businessRules?: string[];
  } = {
    requirements: subRequirements,
  };
  if (subUseCases.length > 0) subgraph.useCases = subUseCases;
  if (subSecReqs.length > 0) subgraph.securityRequirements = subSecReqs;
  if (subRules.length > 0) subgraph.businessRules = subRules;

  const handoff: ProductHandoff = {
    id: `HOF-${canonicalId}`,
    type: 'handoff',
    title: `Handoff Canónico de Producto para ${name}`,
    changeId: canonicalId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    subgraph,
    citations: citedArtifacts.map((c) => ({
      id: c.id,
      digest: c.digest,
      comment: c.comment,
    })),
  };


  const depositedPath = depositProductHandoffSidecar({
    rootDir,
    changeId: slug,
    framework,
    handoff,
  });
  createdFiles.push(depositedPath);

  // 11. Post-creation Validation against Schemas & Workspace rules
  const wsValidation = adapter.validateWorkspace(changeDir);
  if (!wsValidation.valid) {
    errors.push(...wsValidation.errors);
  }

  const specValidation = validateArtifactSchema(specFmObj as any, 'delivery-spec', rootDir);
  if (!specValidation.valid) {
    errors.push(...specValidation.errors);
  }

  const tasksValidation = validateArtifactSchema(tasksFm as any, 'tasks', rootDir);
  if (!tasksValidation.valid) {
    errors.push(...tasksValidation.errors);
  }

  const handoffValidation = validateArtifactSchema(handoff as any, 'handoff', rootDir);
  if (!handoffValidation.valid) {
    errors.push(...handoffValidation.errors);
  }

  return {
    success: errors.length === 0,
    changeId: slug,
    canonicalId,
    profile,
    changeDir,
    createdFiles,
    productArtifactCreated,
    citedArtifacts,
    errors,
  };
}
