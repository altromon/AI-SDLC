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

import { SddAdapter } from './types.js';

interface ChangeIdentifiers {
  slug: string;
  canonicalId: string;
  padNum: string;
}

interface ArtifactInfo {
  id: string;
  file: string;
  frontmatter: Record<string, unknown>;
  title?: string;
  digest: string;
}

interface CitedArtifact {
  id: string;
  digest: string;
  title?: string;
  comment?: string;
}

interface CitationsCollection {
  citedArtifacts: CitedArtifact[];
  subRequirements: string[];
  subUseCases: string[];
  subSecReqs: string[];
  subRules: string[];
  productArtifactCreated?: string;
}

function extractDirMaxNum(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let max = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const match = e.name.match(/^(?:chg|CHG|patch|PATCH)-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    }
  } catch {}
  return max;
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
    const dirMax = extractDirMaxNum(dir);
    if (dirMax > maxNum) maxNum = dirMax;
  }
  return maxNum + 1;
}

function resolveChangeIdentifiers(rootDir: string, name: string, profile: ChangeProfile, options: SddChangeScaffoldOptions): ChangeIdentifiers {
  const targetChangeId = options.changeId || options.id;
  if (targetChangeId) {
    const rawId = targetChangeId.trim();
    const slug = slugify(rawId);
    const canonicalId = rawId.toUpperCase();
    const match = rawId.match(/^(?:chg|CHG|patch|PATCH)-(\d+)/i);
    const padNum = match ? match[1] : '001';
    return { slug, canonicalId, padNum };
  }

  const nextNum = getNextCorrelativeNumber(rootDir);
  const padNum = String(nextNum).padStart(3, '0');
  const nameSlug = slugify(name);
  const prefix = profile === 'patch' ? 'patch' : 'chg';
  return {
    slug: `${prefix}-${padNum}-${nameSlug}`,
    canonicalId: `${prefix.toUpperCase()}-${padNum}-${nameSlug.toUpperCase()}`,
    padNum,
  };
}

function ensureEmptyChangeDir(changeDir: string): string | null {
  if (fs.existsSync(changeDir)) {
    const existing = fs.readdirSync(changeDir);
    if (existing.length > 0) {
      return `El directorio del cambio '${changeDir}' ya existe y no está vacío.`;
    }
  } else {
    fs.mkdirSync(changeDir, { recursive: true });
  }
  return null;
}

function scanCanonicalArtifacts(rootDir: string): Map<string, ArtifactInfo> {
  const allMdFiles = walkMdFiles(rootDir);
  const artifactMap = new Map<string, ArtifactInfo>();

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter?.id) {
        const id = String(frontmatter.id);
        const digest = computeCanonicalSha256(content);
        const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
        artifactMap.set(id, { id, file, frontmatter, title, digest });
      }
    } catch {}
  }
  return artifactMap;
}

function parseInputFromIds(rawFrom?: string | string[]): string[] {
  if (!rawFrom) return [];
  if (Array.isArray(rawFrom)) {
    const result: string[] = [];
    for (const item of rawFrom) {
      if (typeof item === 'string') {
        result.push(...item.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
    return result;
  }
  return rawFrom.split(',').map((s) => s.trim()).filter(Boolean);
}

function renderCitationsYamlBlock(citedArtifacts: CitedArtifact[]): string {
  if (citedArtifacts.length === 0) return '';
  return yaml
    .dump(
      citedArtifacts.map((c) => ({ id: c.id, digest: c.digest, comment: c.comment })),
      { indent: 2, lineWidth: -1 }
    )
    .trim()
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

const PATCH_SPEC_BODY = `# Delivery Specification (Fast Patch): {{CANONICAL_ID}}

## 1. Patch Scope and Justification
{{NAME}}

## 2. Acceptance and Correction Criteria (BDD Gherkin)

\`\`\`gherkin
@{{CANONICAL_ID}} @patch @automated
Feature: Patch {{CANONICAL_ID}} - {{NAME}}
  Scenario: Defect fix verification
    Given the system exhibits the defect identified in "{{NAME}}"
    When the patch fix is applied
    Then the anomalous behavior is resolved and verification passes
\`\`\`

## 3. Automated Verification
- **Command**: \`pnpm test\`
- **Criteria**: All unit and regression tests must pass.
`;

const GREENFIELD_BODY = `# {{REQ_ID}}: {{NAME}}

## 1. Enunciado Normativo
El sistema DEBE implementar y soportar la capacidad de {{NAME}}.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

\`\`\`gherkin
@{{REQ_ID}} @automated
Feature: {{NAME}}
  As a user or client system
  I want to execute the capability for {{NAME}}
  So that the expected outcome and value are achieved

  Scenario: Nominal successful flow
    Given the system is in an operational state
    When the operation for "{{NAME}}" is executed
    Then the operation completes successfully
\`\`\`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | {{DATE}} | {{AUTHOR}} | Definición inicial de requerimiento para {{CANONICAL_ID}} | {{CANONICAL_ID}} |
`;

const MISSING_DRAFT_BODY = `# {{ID}}: {{NAME}}

## 1. Enunciado
Definición de artefacto citado en {{CANONICAL_ID}}.

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

\`\`\`gherkin
@{{ID}} @automated
Feature: {{NAME}}
  Scenario: Expected behavior verification
    Given the system is initialized for "{{NAME}}"
    When the request associated with {{ID}} is processed
    Then the response satisfies acceptance criteria
\`\`\`
`;

const SPEC_BODY = `# Delivery Specification: {{CANONICAL_ID}}

## 1. Functional Behavior Scenarios (BDD Gherkin)

\`\`\`gherkin
@{{CANONICAL_ID}} @functional @automated
Feature: {{NAME}}
  As a system component or user
  I want to process the operation for {{NAME}}
  So that delivery criteria are satisfied

  Scenario: Nominal successful flow
    Given the system is in a nominal operational state
    When the operation for "{{NAME}}" is processed
    Then the operation completes successfully satisfying acceptance criteria
\`\`\`

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

\`\`\`gherkin
@{{CANONICAL_ID}} @security @mitigation
Feature: Security Mitigation for {{CANONICAL_ID}}
  Scenario: Unauthorized access attempt or invalid payload
    Given an unauthenticated actor or invalid credentials
    When the request reaches protected enclaves
    Then the connection is rejected immediately and a security event is recorded
\`\`\`
`;

const DESIGN_BODY = `# Diseño Técnico: {{CANONICAL_ID}}

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se despliega en el enclave perimetral y materializa el servicio correspondiente.

## 2. Contratos de Datos e Interfaces
Detalle de DTOs, interfaces de servicio y esquemas de datos asociados a {{NAME}}.

## 3. Protocolos de Manejo de Errores y Mitigación
Gestión de excepciones, reintentos y respuestas ante anomalías.

## 4. Conformidad con la Política de Licencias (\`license-policy.yaml\`)
Todas las librerías empleadas en la implementación deben cumplir con las categorías permitidas en \`license-policy.yaml\`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | {{DATE}} | {{AUTHOR}} | Diseño técnico formal inicial | {{CANONICAL_ID}} |
`;

const TASKS_BODY = `# Desglose de Tareas Verificables: {{CANONICAL_ID}}

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
- **Descripción**: Implementar la lógica y pruebas de {{NAME}}.
- **Modo**: \`HUMAN_REVIEW_PLAN\` 🟡
- **Verificación**: \`pnpm test\`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | {{DATE}} | {{AUTHOR}} | Creación inicial del plan de tareas con gobernanza | {{CANONICAL_ID}} |
`;

const DEFAULT_TASKS_ARRAY = [
  {
    id: 'TSK-001',
    title: 'Definición de Contratos, Interfaces y Tipos de Datos',
    complexity: 'LOW',
    'risk-level': 'LOW',
    'autonomy-mode': 'AUTONOMOUS',
    verification: { method: 'quality-gate', 'command-or-criteria': 'pnpm test' },
    'assigned-to': 'agent-developer',
    status: 'PENDING',
  },
  {
    id: 'TSK-002',
    title: 'Implementación de Lógica y Pruebas Unitarias/BDD',
    complexity: 'MEDIUM',
    'risk-level': 'MEDIUM',
    'autonomy-mode': 'HUMAN_REVIEW_PLAN',
    verification: { method: 'automated-unit-test', 'command-or-criteria': 'pnpm test' },
    'assigned-to': 'agent-developer',
    status: 'PENDING',
  },
];

const GREENFIELD_HEADER = `---
id: {{REQ_ID}}
type: requirement
title: "{{NAME}}"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
derives-from:
  - {{UC_ID}}
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@{{REQ_ID}}"
  - "@automated"
supersedes: null
superseded-by: null
---
`;

const MISSING_DRAFT_HEADER = `---
id: {{ID}}
type: {{TYPE}}
title: "{{NAME}}"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@{{ID}}"
  - "@automated"
supersedes: null
superseded-by: null
---
`;

const GOVERNANCE_SUMMARY_DEFAULT = {
  'autonomous-tasks-count': 1,
  'human-review-plan-count': 1,
  'ambiguous-count': 0,
  'high-risk-manual-count': 0,
};

function buildPatchSpecContent(canonicalId: string, name: string, citationsSection: string): string {
  const header = `---
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
`;
  const body = PATCH_SPEC_BODY.replaceAll('{{CANONICAL_ID}}', canonicalId).replaceAll('{{NAME}}', name);
  return `${header}\n${body}`;
}

function collectPatchCitations(inputFromIds: string[], artifactMap: Map<string, ArtifactInfo>): CitedArtifact[] {
  const citedArtifacts: CitedArtifact[] = [];
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
  return citedArtifacts;
}

function validatePatchArtifacts(
  rootDir: string,
  changeDir: string,
  specContent: string,
  specFmObj: Record<string, unknown>,
  adapter: SddAdapter
): string[] {
  const errors: string[] = [];
  if (extractGherkinBlock(specContent).length === 0) {
    errors.push(`El archivo 'spec.md' de la entrega debe incluir obligatoriamente especificaciones en formato Gherkin (\`\`\`gherkin ... \`\`\`).`);
  }
  const wsValidation = adapter.validateWorkspace(changeDir);
  if (!wsValidation.valid) errors.push(...wsValidation.errors);
  const specValidation = validateArtifactSchema(specFmObj, 'delivery-spec', rootDir);
  if (!specValidation.valid) errors.push(...specValidation.errors);
  return errors;
}

function buildPatchFmObj(canonicalId: string): Record<string, unknown> {
  return {
    id: `SPEC-${canonicalId}`,
    type: 'delivery-spec',
    'change-id': canonicalId,
    profile: 'patch',
    'acceptance-format': 'gherkin',
    'cucumber-tags': [`@${canonicalId}`, '@patch', '@automated'],
  };
}

function buildPatchSuccess(
  slug: string,
  canonicalId: string,
  specPath: string,
  citedArtifacts: CitedArtifact[],
  errors: string[]
): SddChangeScaffoldResult {
  return {
    success: errors.length === 0,
    changeId: slug,
    canonicalId,
    profile: 'patch',
    changeDir: path.dirname(specPath),
    createdFiles: [specPath],
    citedArtifacts,
    errors,
  };
}

function scaffoldPatchChange(
  rootDir: string,
  changeDir: string,
  slug: string,
  canonicalId: string,
  name: string,
  inputFromIds: string[],
  artifactMap: Map<string, ArtifactInfo>,
  adapter: SddAdapter
): SddChangeScaffoldResult {
  const citedArtifacts = collectPatchCitations(inputFromIds, artifactMap);
  const citationsSection = citedArtifacts.length > 0 ? `citations:\n${renderCitationsYamlBlock(citedArtifacts)}\n` : '';
  const specPath = path.join(changeDir, 'spec.md');
  const specFmObj = buildPatchFmObj(canonicalId);
  const specContent = buildPatchSpecContent(canonicalId, name, citationsSection);
  fs.writeFileSync(specPath, specContent, 'utf-8');

  const errors = validatePatchArtifacts(rootDir, changeDir, specContent, specFmObj, adapter);
  return buildPatchSuccess(slug, canonicalId, specPath, citedArtifacts, errors);
}

function buildGreenfieldContent(reqId: string, ucId: string, name: string, canonicalId: string, author: string, dateStr: string): string {
  const header = GREENFIELD_HEADER.replaceAll('{{REQ_ID}}', reqId).replaceAll('{{UC_ID}}', ucId).replaceAll('{{NAME}}', name);
  const body = GREENFIELD_BODY
    .replaceAll('{{REQ_ID}}', reqId)
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{DATE}}', dateStr)
    .replaceAll('{{AUTHOR}}', author)
    .replaceAll('{{CANONICAL_ID}}', canonicalId);
  return `${header}\n${body}`;
}

function createGreenfieldRequirement(
  rootDir: string,
  name: string,
  padNum: string,
  canonicalId: string,
  author: string,
  dateStr: string,
  createdFiles: string[]
): { reqId: string; ucId: string; reqFilePath: string; digest: string } | null {
  const nameSlugUpper = slugify(name).toUpperCase();
  const reqId = `FR-${padNum}-${nameSlugUpper}-001`;
  const ucId = `UC-${padNum}-${nameSlugUpper}`;

  const productDir = path.join(rootDir, 'specs', 'product');
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  const reqFilePath = path.join(productDir, `${reqId}.md`);
  if (fs.existsSync(reqFilePath)) return null;

  const reqContent = buildGreenfieldContent(reqId, ucId, name, canonicalId, author, dateStr);
  fs.writeFileSync(reqFilePath, reqContent, 'utf-8');
  createdFiles.push(reqFilePath);
  const digest = computeCanonicalSha256(reqContent);
  return { reqId, ucId, reqFilePath, digest };
}

function createMissingDraftRequirement(rootDir: string, name: string, id: string, canonicalId: string, createdFiles: string[]): { reqFilePath: string; digest: string } {
  const productDir = path.join(rootDir, 'specs', 'product');
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });
  const reqFilePath = path.join(productDir, `${id}.md`);
  const reqType = id.startsWith('UC-') ? 'use-case' : id.startsWith('SEC-REQ-') ? 'security-requirement' : 'requirement';
  const header = MISSING_DRAFT_HEADER.replaceAll('{{ID}}', id).replaceAll('{{TYPE}}', reqType).replaceAll('{{NAME}}', name);
  const body = MISSING_DRAFT_BODY.replaceAll('{{ID}}', id).replaceAll('{{NAME}}', name).replaceAll('{{CANONICAL_ID}}', canonicalId);
  const reqContent = `${header}\n${body}`;
  fs.writeFileSync(reqFilePath, reqContent, 'utf-8');
  createdFiles.push(reqFilePath);
  const digest = computeCanonicalSha256(reqContent);
  return { reqFilePath, digest };
}

function discoverDerivedRequirements(id: string, artifactMap: Map<string, ArtifactInfo>, subRequirements: string[], citedArtifacts: CitedArtifact[]): void {
  for (const [otherId, otherArt] of artifactMap.entries()) {
    const derives = otherArt.frontmatter['derives-from'];
    const derivesArr = Array.isArray(derives) ? derives : derives ? [derives] : [];
    if (derivesArr.includes(id) && (otherId.startsWith('FR-') || otherId.startsWith('QR-'))) {
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

function appendUnique(list: string[], item: string): void {
  if (!list.includes(item)) list.push(item);
}

function classifyExistingCitation(
  id: string,
  existing: ArtifactInfo,
  artifactMap: Map<string, ArtifactInfo>,
  col: CitationsCollection
): void {
  col.citedArtifacts.push({
    id: existing.id,
    digest: `sha256:${existing.digest}`,
    title: existing.title,
    comment: `Citación de ${existing.frontmatter.type || 'artefacto'} (${existing.title || existing.id})`,
  });

  if (/^(FR|QR|CON)-/.test(id)) {
    appendUnique(col.subRequirements, id);
  } else if (id.startsWith('UC-')) {
    appendUnique(col.subUseCases, id);
    discoverDerivedRequirements(id, artifactMap, col.subRequirements, col.citedArtifacts);
  } else if (/^(SEC|SAF)-REQ-/.test(id)) {
    appendUnique(col.subSecReqs, id);
  } else if (id.startsWith('BR-')) {
    appendUnique(col.subRules, id);
  }
}

function routeMissingCitationId(id: string, col: CitationsCollection): void {
  if (id.startsWith('UC-')) col.subUseCases.push(id);
  else if (id.startsWith('SEC-REQ-')) col.subSecReqs.push(id);
  else col.subRequirements.push(id);
}

function collectExplicitCitations(
  inputFromIds: string[],
  name: string,
  canonicalId: string,
  artifactMap: Map<string, ArtifactInfo>,
  col: CitationsCollection,
  rootDir: string,
  createdFiles: string[]
): void {
  for (const id of inputFromIds) {
    const existing = artifactMap.get(id);
    if (existing) {
      classifyExistingCitation(id, existing, artifactMap, col);
    } else {
      const missing = createMissingDraftRequirement(rootDir, name, id, canonicalId, createdFiles);
      col.productArtifactCreated = missing.reqFilePath;
      col.citedArtifacts.push({ id, digest: `sha256:${missing.digest}`, title: name, comment: `Artefacto citado en ${canonicalId}` });
      routeMissingCitationId(id, col);
    }
  }
}

function collectGreenfieldCitations(
  rootDir: string,
  name: string,
  padNum: string,
  canonicalId: string,
  author: string,
  dateStr: string,
  createdFiles: string[],
  col: CitationsCollection
): void {
  const gf = createGreenfieldRequirement(rootDir, name, padNum, canonicalId, author, dateStr, createdFiles);
  if (gf) {
    col.productArtifactCreated = gf.reqFilePath;
    col.citedArtifacts.push({
      id: gf.reqId,
      digest: `sha256:${gf.digest}`,
      title: name,
      comment: `Requerimiento funcional canónico asociado (Génesis ${canonicalId})`,
    });
    col.subRequirements.push(gf.reqId);
    col.subUseCases.push(gf.ucId);
  }
}

function collectChangeCitations(
  rootDir: string,
  name: string,
  padNum: string,
  canonicalId: string,
  author: string,
  dateStr: string,
  inputFromIds: string[],
  artifactMap: Map<string, ArtifactInfo>,
  createdFiles: string[]
): CitationsCollection {
  const col: CitationsCollection = { citedArtifacts: [], subRequirements: [], subUseCases: [], subSecReqs: [], subRules: [] };
  if (inputFromIds.length === 0) {
    collectGreenfieldCitations(rootDir, name, padNum, canonicalId, author, dateStr, createdFiles, col);
  } else {
    collectExplicitCitations(inputFromIds, name, canonicalId, artifactMap, col, rootDir, createdFiles);
  }
  if (col.subRequirements.length === 0) {
    col.subRequirements.push(`FR-${padNum}-${slugify(name).toUpperCase()}-001`);
  }
  return col;
}

function renderProposalFile(changeDir: string, canonicalId: string, name: string, author: string, citationsYamlBlock: string): string {
  const proposalPath = path.join(changeDir, 'proposal.md');
  const citationsSection = citationsYamlBlock ? `citations:\n${citationsYamlBlock}\n` : '';
  const proposalContent = `---
id: ${canonicalId}
type: spec-change-proposal
title: "${name}"
status: draft
author: "${author}"
${citationsSection}---

# Propuesta de Cambio: ${canonicalId}

## 1. Motivación y Alcance
${name}

## 2. Dependencias Externas Evaluadas
- Lista de dependencias nuevas a incorporar y verificación de licencia según \`license-policy.yaml\`.
`;
  fs.writeFileSync(proposalPath, proposalContent, 'utf-8');
  return proposalPath;
}

function renderSpecFile(changeDir: string, canonicalId: string, name: string, profile: ChangeProfile): { specPath: string; specFmObj: Record<string, unknown> } {
  const specPath = path.join(changeDir, 'spec.md');
  const specFmObj = {
    id: `SPEC-${canonicalId}`,
    type: 'delivery-spec',
    'change-id': canonicalId,
    profile,
    'acceptance-format': 'gherkin',
    'cucumber-tags': [`@${canonicalId}`, '@automated'],
  };
  const header = `---
id: SPEC-${canonicalId}
type: delivery-spec
change-id: ${canonicalId}
profile: ${profile}
acceptance-format: gherkin
cucumber-tags:
  - "@${canonicalId}"
  - "@automated"
---
`;
  const body = SPEC_BODY.replaceAll('{{CANONICAL_ID}}', canonicalId).replaceAll('{{NAME}}', name);
  fs.writeFileSync(specPath, `${header}\n${body}`, 'utf-8');
  return { specPath, specFmObj };
}

function renderDesignFile(changeDir: string, canonicalId: string, name: string, author: string, dateStr: string, citationsYamlBlock: string): string {
  const designPath = path.join(changeDir, 'design.md');
  const citationsSection = citationsYamlBlock ? `citations:\n${citationsYamlBlock}\n` : '';
  const header = `---
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
${citationsSection}---
`;
  const body = DESIGN_BODY.replaceAll('{{CANONICAL_ID}}', canonicalId).replaceAll('{{NAME}}', name).replaceAll('{{AUTHOR}}', author).replaceAll('{{DATE}}', dateStr);
  fs.writeFileSync(designPath, `${header}\n${body}`, 'utf-8');
  return designPath;
}

function buildTasksFrontmatter(canonicalId: string, name: string) {
  return {
    id: `TSK-PLAN-${canonicalId}`,
    type: 'task-plan',
    'change-id': canonicalId,
    title: `Desglose de Tareas Verificables: ${name}`,
    version: '1.0.0',
    'schema-version': '1.0',
    status: 'draft',
    'governance-summary': GOVERNANCE_SUMMARY_DEFAULT,
    tasks: DEFAULT_TASKS_ARRAY,
    supersedes: null,
    'superseded-by': null,
  };
}

function renderTasksFile(changeDir: string, canonicalId: string, name: string, author: string, dateStr: string): { tasksPath: string; tasksFm: Record<string, unknown> } {
  const tasksPath = path.join(changeDir, 'tasks.md');
  const tasksFm = buildTasksFrontmatter(canonicalId, name);
  const header = `---\n${yaml.dump(tasksFm, { indent: 2, lineWidth: -1 }).trim()}\n---\n`;
  const body = TASKS_BODY.replaceAll('{{CANONICAL_ID}}', canonicalId).replaceAll('{{NAME}}', name).replaceAll('{{AUTHOR}}', author).replaceAll('{{DATE}}', dateStr);
  fs.writeFileSync(tasksPath, `${header}\n${body}`, 'utf-8');
  return { tasksPath, tasksFm };
}

function buildHandoffSubgraph(citations: CitationsCollection): ProductHandoff['subgraph'] {
  const subgraph: ProductHandoff['subgraph'] = { requirements: citations.subRequirements };
  if (citations.subUseCases.length > 0) subgraph.useCases = citations.subUseCases;
  if (citations.subSecReqs.length > 0) subgraph.securityRequirements = citations.subSecReqs;
  if (citations.subRules.length > 0) subgraph.businessRules = citations.subRules;
  return subgraph;
}

function buildHandoffPayload(canonicalId: string, name: string, citations: CitationsCollection): ProductHandoff {
  return {
    id: `HOF-${canonicalId}`,
    type: 'handoff',
    title: `Handoff Canónico de Producto para ${name}`,
    changeId: canonicalId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    subgraph: buildHandoffSubgraph(citations),
    citations: citations.citedArtifacts.map((c) => ({ id: c.id, digest: c.digest, comment: c.comment })),
  };
}

function renderHandoffSidecar(
  rootDir: string,
  slug: string,
  canonicalId: string,
  name: string,
  framework: 'openspec' | 'speckit',
  citations: CitationsCollection
): { depositedPath: string; handoff: ProductHandoff } {
  const handoff = buildHandoffPayload(canonicalId, name, citations);
  const depositedPath = depositProductHandoffSidecar({ rootDir, changeId: slug, framework, handoff });
  return { depositedPath, handoff };
}

function validateScaffoldedArtifacts(
  rootDir: string,
  changeDir: string,
  adapter: SddAdapter,
  specFmObj: Record<string, unknown>,
  tasksFm: Record<string, unknown>,
  handoff: ProductHandoff
): string[] {
  const errors: string[] = [];
  const wsValidation = adapter.validateWorkspace(changeDir);
  if (!wsValidation.valid) errors.push(...wsValidation.errors);

  const specValidation = validateArtifactSchema(specFmObj, 'delivery-spec', rootDir);
  if (!specValidation.valid) errors.push(...specValidation.errors);

  const tasksValidation = validateArtifactSchema(tasksFm, 'tasks', rootDir);
  if (!tasksValidation.valid) errors.push(...tasksValidation.errors);

  const handoffValidation = validateArtifactSchema(handoff as unknown as Record<string, unknown>, 'handoff', rootDir);
  if (!handoffValidation.valid) errors.push(...handoffValidation.errors);

  return errors;
}

function buildScaffoldFailure(profile: ChangeProfile, error: string, slug = '', canonicalId = '', changeDir = ''): SddChangeScaffoldResult {
  return {
    success: false,
    changeId: slug,
    canonicalId,
    profile,
    changeDir,
    createdFiles: [],
    citedArtifacts: [],
    errors: [error],
  };
}

function renderAndCollectArtifactFiles(
  changeDir: string,
  canonicalId: string,
  name: string,
  author: string,
  dateStr: string,
  profile: ChangeProfile,
  citationsBlock: string,
  createdFiles: string[]
): { specFmObj: Record<string, unknown>; tasksFm: Record<string, unknown> } {
  createdFiles.push(renderProposalFile(changeDir, canonicalId, name, author, citationsBlock));
  const { specPath, specFmObj } = renderSpecFile(changeDir, canonicalId, name, profile);
  createdFiles.push(specPath);
  createdFiles.push(renderDesignFile(changeDir, canonicalId, name, author, dateStr, citationsBlock));
  const { tasksPath, tasksFm } = renderTasksFile(changeDir, canonicalId, name, author, dateStr);
  createdFiles.push(tasksPath);
  return { specFmObj, tasksFm };
}

function buildScaffoldSuccess(
  slug: string,
  canonicalId: string,
  profile: ChangeProfile,
  changeDir: string,
  createdFiles: string[],
  citations: CitationsCollection,
  errors: string[]
): SddChangeScaffoldResult {
  return {
    success: errors.length === 0,
    changeId: slug,
    canonicalId,
    profile,
    changeDir,
    createdFiles,
    productArtifactCreated: citations.productArtifactCreated,
    citedArtifacts: citations.citedArtifacts,
    errors,
  };
}

function executeStandardScaffolding(
  rootDir: string,
  changeDir: string,
  slug: string,
  canonicalId: string,
  name: string,
  padNum: string,
  author: string,
  dateStr: string,
  profile: ChangeProfile,
  framework: 'openspec' | 'speckit',
  inputFromIds: string[],
  artifactMap: Map<string, ArtifactInfo>,
  adapter: SddAdapter
): SddChangeScaffoldResult {
  const createdFiles: string[] = [];
  const citations = collectChangeCitations(rootDir, name, padNum, canonicalId, author, dateStr, inputFromIds, artifactMap, createdFiles);
  const citationsBlock = renderCitationsYamlBlock(citations.citedArtifacts);

  const { specFmObj, tasksFm } = renderAndCollectArtifactFiles(changeDir, canonicalId, name, author, dateStr, profile, citationsBlock, createdFiles);
  const { depositedPath, handoff } = renderHandoffSidecar(rootDir, slug, canonicalId, name, framework, citations);
  createdFiles.push(depositedPath);

  const errors = validateScaffoldedArtifacts(rootDir, changeDir, adapter, specFmObj, tasksFm, handoff);
  return buildScaffoldSuccess(slug, canonicalId, profile, changeDir, createdFiles, citations, errors);
}

function normalizeScaffoldOptions(options: SddChangeScaffoldOptions) {
  return {
    rootDir: options.rootDir || process.cwd(),
    framework: (options.framework || 'openspec') as 'openspec' | 'speckit',
    author: options.author || 'agent-developer / human-dev',
    profile: (options.profile || 'standard') as ChangeProfile,
    name: options.name.trim(),
  };
}

export function scaffoldSddChange(options: SddChangeScaffoldOptions): SddChangeScaffoldResult {
  const { rootDir, framework, author, profile, name } = normalizeScaffoldOptions(options);
  const dateStr = new Date().toISOString().split('T')[0];

  if (!name) return buildScaffoldFailure(profile, 'El nombre del cambio no puede estar vacío.');

  const { slug, canonicalId, padNum } = resolveChangeIdentifiers(rootDir, name, profile, options);
  const adapter = getSddAdapter(framework);
  const changeDir = adapter.getChangeWorkspaceDir(rootDir, slug);

  const dirError = ensureEmptyChangeDir(changeDir);
  if (dirError) return buildScaffoldFailure(profile, dirError, slug, canonicalId, changeDir);

  const artifactMap = scanCanonicalArtifacts(rootDir);
  const inputFromIds = parseInputFromIds(options.from);

  if (profile === 'patch') {
    return scaffoldPatchChange(rootDir, changeDir, slug, canonicalId, name, inputFromIds, artifactMap, adapter);
  }

  return executeStandardScaffolding(
    rootDir, changeDir, slug, canonicalId, name, padNum, author, dateStr, profile, framework, inputFromIds, artifactMap, adapter
  );
}
