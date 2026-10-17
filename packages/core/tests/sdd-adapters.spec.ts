import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  depositProductHandoffSidecar,
  getNextCorrelativeNumber,
  getSddAdapter,
  integrateSddChange,
  loadProductHandoffSidecar,
  OpenSpecAdapter,
  parseSpecCatalogScope,
  ProductHandoff,
  scaffoldSddChange,
  scanAllProductHandoffs,
  slugify,
  SpecKitAdapter,
  verifySddIntegration,
  verifyTraceability,
} from '../src/index.js';


describe('SDD Formal Ecosystem Adapters (OpenSpec & Spec Kit)', () => {
  const tmpTestDir = path.join(process.cwd(), 'scratch', 'test-sdd-adapters');

  it('should instantiate OpenSpec and SpecKit adapters via factory', () => {
    const openspec = getSddAdapter('openspec');
    expect(openspec).toBeInstanceOf(OpenSpecAdapter);
    expect(openspec.framework).toBe('openspec');

    const speckit = getSddAdapter('speckit');
    expect(speckit).toBeInstanceOf(SpecKitAdapter);
    expect(speckit.framework).toBe('speckit');
  });

  it('should deposit and load a PDaC handoff sidecar (HOF-*) in OpenSpec format', () => {
    const changeId = 'chg-test-openspec';
    const handoff: ProductHandoff = {
      id: 'HOF-TEST-OPENSPEC',
      type: 'handoff',
      changeId,
      title: 'Handoff de Prueba OpenSpec',
      subgraph: {
        requirements: ['FR-TEST-001'],
        useCases: ['UC-TEST-001'],
        securityRequirements: ['SEC-REQ-TEST-001'],
      },
    };

    const sidecarPath = depositProductHandoffSidecar({
      rootDir: tmpTestDir,
      changeId,
      framework: 'openspec',
      handoff,
    });

    expect(fs.existsSync(sidecarPath)).toBe(true);
    expect(sidecarPath).toContain('handoff.yaml');

    const loaded = loadProductHandoffSidecar(path.dirname(sidecarPath));
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('HOF-TEST-OPENSPEC');
    expect(loaded?.subgraph.requirements).toContain('FR-TEST-001');

    // Clean up
    fs.rmSync(tmpTestDir, { recursive: true, force: true });
  });

  it('should deposit and load a PDaC handoff sidecar in Spec Kit format', () => {
    const changeId = 'chg-test-speckit';
    const handoff: ProductHandoff = {
      id: 'HOF-TEST-SPECKIT',
      type: 'handoff',
      changeId,
      title: 'Handoff de Prueba Spec Kit',
      subgraph: {
        requirements: ['FR-SPECKIT-001'],
        businessRules: ['BR-SPECKIT-VALIDITY'],
      },
    };

    const sidecarPath = depositProductHandoffSidecar({
      rootDir: tmpTestDir,
      changeId,
      framework: 'speckit',
      handoff,
    });

    expect(fs.existsSync(sidecarPath)).toBe(true);

    const loaded = loadProductHandoffSidecar(path.dirname(sidecarPath));
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('HOF-TEST-SPECKIT');
    expect(loaded?.subgraph.requirements).toContain('FR-SPECKIT-001');

    // Clean up
    fs.rmSync(tmpTestDir, { recursive: true, force: true });
  });

  it('should scan and detect deposited handoffs in workspace', () => {
    const handoff: ProductHandoff = {
      id: 'HOF-SCAN-TEST',
      type: 'handoff',
      changeId: 'chg-scan-01',
      subgraph: {
        requirements: ['FR-001'],
      },
    };

    depositProductHandoffSidecar({
      rootDir: tmpTestDir,
      changeId: 'chg-scan-01',
      framework: 'openspec',
      handoff,
    });

    const scanned = scanAllProductHandoffs(tmpTestDir);
    expect(scanned.size).toBeGreaterThanOrEqual(1);

    // Clean up
    fs.rmSync(tmpTestDir, { recursive: true, force: true });
  });
});

describe('Automated 360° Traceability Engine (PDaC HOF-* ➔ arc42 ➔ BDD)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('should verify complete 360° traceability against repository canonical artifacts', () => {
    const result = verifyTraceability({ rootDir: fixturesDir });

    expect(result.success).toBe(true);
    expect(result.orphanCount).toBe(0);
    expect(result.totalRequirements).toBeGreaterThanOrEqual(1);

    // Check that HOF-FIXTURE-001 is linked
    const telemetryReq = result.rows.find((r) => r.id === 'FR-FIXTURE-001');
    expect(telemetryReq).toBeDefined();
    expect(telemetryReq?.hofId).toBe('HOF-FIXTURE-001');
    expect(telemetryReq?.productStatus).toBe('COMPLIANT');
    expect(telemetryReq?.archStatus).toBe('COMPLIANT');
    expect(telemetryReq?.testStatus).toBe('COMPLIANT');

    // Check report markdown output
    expect(result.reportMarkdown).toContain('360° Requirements Traceability Matrix');
    expect(result.reportMarkdown).toContain('FR-FIXTURE-001');
    expect(result.reportMarkdown).toContain('100% TRACEABLE');
  });
});

describe('SDD Canonical Specification Integration Engine', () => {
  const tmpIntegrationDir = path.join(process.cwd(), 'scratch', 'test-sdd-integration');

  it('should reject integration if tasks in tasks.md are pending or blocked', () => {
    const changeDir = path.join(tmpIntegrationDir, 'specs', 'changes', 'active', 'chg-pending');
    fs.mkdirSync(changeDir, { recursive: true });

    // Create tasks.md with 1 completed and 1 pending task
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      `---
tasks:
  - id: TSK-001
    status: COMPLETED
  - id: TSK-002
    status: PENDING
---
`
    );

    // Create handoff sidecar
    fs.writeFileSync(
      path.join(changeDir, 'handoff.yaml'),
      `id: HOF-TEST-PENDING
type: handoff
changeId: chg-pending
subgraph:
  requirements:
    - FR-TEST-001
`
    );

    const res = integrateSddChange({
      rootDir: tmpIntegrationDir,
      changeId: 'chg-pending',
    });

    expect(res.success).toBe(false);
    expect(res.errors[0]).toContain('tareas pendientes o bloqueadas');
    expect(res.pendingTasks).toContain('TSK-002');

    // Clean up
    fs.rmSync(tmpIntegrationDir, { recursive: true, force: true });
  });

  it('should integrate implemented requirements and architecture services when tasks are completed', () => {
    const changeDir = path.join(tmpIntegrationDir, 'specs', 'changes', 'active', 'chg-completed');
    const productDir = path.join(tmpIntegrationDir, 'product');
    const archDir = path.join(tmpIntegrationDir, 'architecture', 'services');

    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(productDir, { recursive: true });
    fs.mkdirSync(archDir, { recursive: true });

    // Create tasks.md with all completed tasks
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      `---
tasks:
  - id: TSK-001
    status: COMPLETED
  - id: TSK-002
    status: COMPLETED
---
`
    );

    // Create proposal.md
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      `---
id: CHG-COMPLETED
type: spec-change-proposal
status: approved
---
# Proposal
`
    );

    // Create handoff.yaml
    fs.writeFileSync(
      path.join(changeDir, 'handoff.yaml'),
      `id: HOF-TEST-COMPLETED
type: handoff
changeId: chg-completed
subgraph:
  requirements:
    - FR-INT-001
citations:
  - id: CMP-INT-001
`
    );

    // Create canonical product requirement
    fs.writeFileSync(
      path.join(productDir, 'FR-INT-001.md'),
      `---
id: FR-INT-001
type: requirement
status: draft
version: "1.0.0"
---
# Requirement FR-INT-001

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-01 | Original | Creación inicial | CHG-INIT |
`
    );

    // Create canonical architecture component
    fs.writeFileSync(
      path.join(archDir, 'CMP-INT-001.md'),
      `---
id: CMP-INT-001
type: component
level: 1
implementation-type: service
satisfies-requirements: []
---
# Component CMP-INT-001

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-01 | Original | Creación inicial | CHG-INIT |
`
    );

    const res = integrateSddChange({
      rootDir: tmpIntegrationDir,
      changeId: 'chg-completed',
      author: 'IntegrationBot',
    });

    expect(res.success).toBe(true);
    expect(res.integratedRequirements).toContain('FR-INT-001');
    expect(res.updatedProductArtifacts).toContain('FR-INT-001');
    expect(res.updatedArchitectureArtifacts).toContain('CMP-INT-001');
    expect(res.archived).toBe(true);

    // Verify product artifact updated
    const updatedProduct = fs.readFileSync(path.join(productDir, 'FR-INT-001.md'), 'utf-8');
    expect(updatedProduct).toContain('status: active');
    expect(updatedProduct).toContain('chg-completed');

    // Verify architecture component updated
    const updatedService = fs.readFileSync(path.join(archDir, 'CMP-INT-001.md'), 'utf-8');
    expect(updatedService).toContain('FR-INT-001');
    expect(updatedService).toContain('chg-completed');

    // Verify change was archived to completed/
    expect(fs.existsSync(path.join(tmpIntegrationDir, 'specs', 'changes', 'completed', 'chg-completed'))).toBe(true);

    // Clean up
    fs.rmSync(tmpIntegrationDir, { recursive: true, force: true });
  });

  it('should verify SDD canonical integration status', () => {
    const auditRes = verifySddIntegration({ rootDir: process.cwd() });
    expect(auditRes.audits.length).toBeGreaterThanOrEqual(1);
  });

  it('should normalize slugs and calculate next correlative number', () => {
    expect(slugify('Reintento resiliente de telemetría')).toBe('reintento-resiliente-de-telemetria');
    expect(slugify('  ¡Feature Especial (v2.0)!  ')).toBe('feature-especial-v2-0');
    expect(getNextCorrelativeNumber(process.cwd())).toBeGreaterThanOrEqual(2);
  });

  it('should scaffold greenfield SDD change and dual-scaffold product draft requirement (Option A)', () => {
    const tmpScaffoldDir = path.join(process.cwd(), 'scratch', 'test-sdd-scaffold-greenfield');
    if (fs.existsSync(tmpScaffoldDir)) {
      fs.rmSync(tmpScaffoldDir, { recursive: true, force: true });
    }

    const res = scaffoldSddChange({
      rootDir: tmpScaffoldDir,
      name: 'Módulo de Facturación Automática',
      framework: 'openspec',
      silent: true,
    });

    expect(res.success).toBe(true);
    expect(res.changeId).toBe('chg-001-modulo-de-facturacion-automatica');
    expect(res.canonicalId).toBe('CHG-001-MODULO-DE-FACTURACION-AUTOMATICA');
    expect(res.productArtifactCreated).toBeDefined();
    expect(fs.existsSync(res.productArtifactCreated!)).toBe(true);

    // Verify product artifact content has status draft and real digest
    const productContent = fs.readFileSync(res.productArtifactCreated!, 'utf-8');
    expect(productContent).toContain('status: draft');
    expect(productContent).toContain('FR-001-MODULO-DE-FACTURACION-AUTOMATICA-001');

    // Verify 4 SDD files + handoff.yaml created
    expect(fs.existsSync(path.join(res.changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(res.changeDir, 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(res.changeDir, 'design.md'))).toBe(true);
    expect(fs.existsSync(path.join(res.changeDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(res.changeDir, 'handoff.yaml'))).toBe(true);

    // Verify sidecar handoff
    const handoff = loadProductHandoffSidecar(res.changeDir);
    expect(handoff).not.toBeNull();
    expect(handoff?.id).toBe('HOF-CHG-001-MODULO-DE-FACTURACION-AUTOMATICA');
    expect(handoff?.citations?.[0]?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(handoff?.citations?.[0]?.digest).not.toContain('00000000000000000000000000000000');

    // Clean up
    fs.rmSync(tmpScaffoldDir, { recursive: true, force: true });
  });

  it('should scaffold SDD change citing existing canonical artifact with --from', () => {
    const tmpFromDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-sdd-adapters-from-'));
    const ucDir = path.join(tmpFromDir, 'product', 'use-cases');
    const reqDir = path.join(tmpFromDir, 'product', 'requirements');
    fs.mkdirSync(ucDir, { recursive: true });
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(
      path.join(ucDir, 'UC-028-NATIVE-MCP-SERVER.md'),
      `---
id: UC-028-NATIVE-MCP-SERVER
type: use-case
title: Native MCP Server
---
# Native MCP Server
`
    );
    fs.writeFileSync(
      path.join(reqDir, 'FR-028-NATIVE-MCP-SERVER-001.md'),
      `---
id: FR-028-NATIVE-MCP-SERVER-001
type: requirement
title: MCP Server Requirement
derives-from:
  - UC-028-NATIVE-MCP-SERVER
---
# FR-028 Requirement
`
    );

    try {
      const res = scaffoldSddChange({
        rootDir: tmpFromDir,
        name: 'Reintento resiliente de servidor MCP',
        changeId: 'chg-test-from-cli',
        from: 'UC-028-NATIVE-MCP-SERVER',
        framework: 'openspec',
        silent: true,
      });

      expect(res.success).toBe(true);
      expect(res.citedArtifacts.some((c) => c.id === 'UC-028-NATIVE-MCP-SERVER')).toBe(true);
      expect(res.citedArtifacts.some((c) => c.id === 'FR-028-NATIVE-MCP-SERVER-001')).toBe(true);

      const handoff = loadProductHandoffSidecar(res.changeDir);
      expect(handoff?.subgraph.requirements).toContain('FR-028-NATIVE-MCP-SERVER-001');
      expect(handoff?.subgraph.useCases).toContain('UC-028-NATIVE-MCP-SERVER');
    } finally {
      fs.rmSync(tmpFromDir, { recursive: true, force: true });
    }
  });
});

describe('SDD Canonical Artifact Materialization from spec.md', () => {
  const tmpDir = path.join(process.cwd(), 'scratch', 'test-sdd-materialize');

  const SPEC_WITH_CATALOG = `---
id: SPEC-CHG-TEST-MATERIALIZE
type: delivery-spec
change-id: CHG-TEST-MATERIALIZE
profile: standard
---

# Delivery Specification: CHG-TEST-MATERIALIZE

## 1. Catalog Scope and Traceability (Canonical Alignment)

### 1.1 Affected Existing Catalog Items (Modifications / Deprecations)

| Catalog Category | Catalog ID | Action (\`MODIFIED\` / \`DEPRECATED\`) | Description of Delta & Behavioral Impact |
| :--- | :--- | :--- | :--- |
| Functional Requirement | \`FR-EXISTING-001\` | \`MODIFIED\` | Extends validation rules |

### 1.2 New Catalog Items Introduced (Additions)

| Catalog Category | Proposed ID | Target Catalog Location | Formal Scope & Functional Contract |
| :--- | :--- | :--- | :--- |
| Functional Requirement | \`FR-MAT-001\` | \`product/requirements/\` | Automated signature verification |
| Use Case | \`UC-MAT-001\` | \`product/use-cases/\` | End-to-end telemetry subscription |
| Actor / Persona | \`ACT-MAT-001\` | \`product/actors/\` | External auditor agent role |

---

## 2. Requirement Deltas and Formal Contracts

### [FR-MAT-001]: Automated Signature Verification
* **Operation:** \`ADDED\`
* **Primary Actor(s):** \`ACT-MAT-001\`
* **Behavioral Contract (Delta Specification):**
  * **Baseline (Before):** None (New requirement)
  * **Target Delta (After):** System verifies cryptographic signature on every incoming payload.
`;

  it('should parse new catalog items from spec.md section 1.2', () => {
    const scope = parseSpecCatalogScope(SPEC_WITH_CATALOG);
    expect(scope.newItems).toHaveLength(3);
    expect(scope.newItems.map((i: any) => i.id)).toContain('FR-MAT-001');
    expect(scope.newItems.map((i: any) => i.id)).toContain('UC-MAT-001');
    expect(scope.newItems.map((i: any) => i.id)).toContain('ACT-MAT-001');
    expect(scope.newItems.find((i: any) => i.id === 'FR-MAT-001').targetDir).toBe('product/requirements/');
    expect(scope.newItems.find((i: any) => i.id === 'UC-MAT-001').targetDir).toBe('product/use-cases/');
    expect(scope.newItems.find((i: any) => i.id === 'ACT-MAT-001').targetDir).toBe('product/actors/');
  });

  it('should parse affected existing catalog items from spec.md section 1.1', () => {
    const scope = parseSpecCatalogScope(SPEC_WITH_CATALOG);
    expect(scope.affectedItems).toHaveLength(1);
    expect(scope.affectedItems[0].id).toBe('FR-EXISTING-001');
    expect(scope.affectedItems[0].action).toBe('MODIFIED');
  });

  it('should return empty scope when spec.md has no sections 1.1 / 1.2 (simplified format)', () => {
    const simplifiedSpec = `---
id: SPEC-CHG-SIMPLE
type: delivery-spec
---
## 1. Escenarios de Comportamiento Funcional
### Escenario 1: Flujo Exitoso
- GIVEN / WHEN / THEN
`;
    const scope = parseSpecCatalogScope(simplifiedSpec);
    expect(scope.newItems).toHaveLength(0);
    expect(scope.affectedItems).toHaveLength(0);
  });

  it('should materialize new canonical artifacts and populate createdCanonicalArtifacts in result', () => {
    const changeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-test-materialize');
    fs.mkdirSync(changeDir, { recursive: true });

    fs.writeFileSync(path.join(changeDir, 'tasks.md'), `---
tasks:
  - id: TSK-001
    status: COMPLETED
---
`);
    fs.writeFileSync(path.join(changeDir, 'spec.md'), SPEC_WITH_CATALOG);
    fs.writeFileSync(path.join(changeDir, 'handoff.yaml'), `id: HOF-TEST-MATERIALIZE
type: handoff
changeId: chg-test-materialize
subgraph:
  requirements:
    - FR-MAT-001
`);

    const res = integrateSddChange({
      rootDir: tmpDir,
      changeId: 'chg-test-materialize',
      author: 'TestBot',
    });

    expect(res.success).toBe(true);
    expect(res.createdCanonicalArtifacts).toBeDefined();
    expect(res.createdCanonicalArtifacts).toContain('FR-MAT-001');
    expect(res.createdCanonicalArtifacts).toContain('UC-MAT-001');
    expect(res.createdCanonicalArtifacts).toContain('ACT-MAT-001');

    // Verify physical files were created
    expect(fs.existsSync(path.join(tmpDir, 'product', 'requirements', 'FR-MAT-001.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'product', 'use-cases', 'UC-MAT-001.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'product', 'actors', 'ACT-MAT-001.md'))).toBe(true);

    // Verify materialized file has valid frontmatter
    const frContent = fs.readFileSync(path.join(tmpDir, 'product', 'requirements', 'FR-MAT-001.md'), 'utf-8');
    expect(frContent).toContain('id: FR-MAT-001');
    expect(frContent).toContain('status: draft');
    expect(frContent).toContain('Historial de Revisiones');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('SDD Data Protection & Privacy Artifact Integration', () => {
  const tmpPrivacyDir = path.join(process.cwd(), 'scratch', 'test-sdd-privacy-integration');

  it('should promote privacy requirements, data assets, and ROPA entries during integrateSddChange', () => {
    const changeDir = path.join(tmpPrivacyDir, 'specs', 'changes', 'active', 'chg-privacy-test');
    const privReqDir = path.join(tmpPrivacyDir, 'specs', 'privacy', 'requirements');
    const dataAssetDir = path.join(tmpPrivacyDir, 'specs', 'privacy', 'assets');
    const ropaDir = path.join(tmpPrivacyDir, 'specs', 'privacy', 'ropa');
    const archDir = path.join(tmpPrivacyDir, 'architecture', 'components');

    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(privReqDir, { recursive: true });
    fs.mkdirSync(dataAssetDir, { recursive: true });
    fs.mkdirSync(ropaDir, { recursive: true });
    fs.mkdirSync(archDir, { recursive: true });

    // 1. Create canonical draft privacy requirement
    fs.writeFileSync(
      path.join(privReqDir, 'PRIV-REQ-MASKING-001.md'),
      `---
id: PRIV-REQ-MASKING-001
type: privacy-requirement
status: draft
version: "1.0.0"
title: Mandatory Pseudonymization
---
# PRIV-REQ-MASKING-001: Mandatory Pseudonymization

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-01 | DPO | Draft inicial | CHG-INIT |
`
    );

    // 2. Create canonical draft data asset
    fs.writeFileSync(
      path.join(dataAssetDir, 'DATA-ASSET-USER-PROFILE-001.md'),
      `---
id: DATA-ASSET-USER-PROFILE-001
type: data-asset
status: draft
version: "1.0.0"
title: User Profile PII
---
# DATA-ASSET-USER-PROFILE-001: User Profile PII

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-01 | DPO | Draft inicial | CHG-INIT |
`
    );

    // 3. Create canonical draft privacy ROPA
    fs.writeFileSync(
      path.join(ropaDir, 'PRIV-ROPA-USER-AUTH-001.md'),
      `---
id: PRIV-ROPA-USER-AUTH-001
type: privacy-ropa
status: draft
version: "1.0.0"
title: User Auth Processing
---
# PRIV-ROPA-USER-AUTH-001: User Auth Processing

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-01 | DPO | Draft inicial | CHG-INIT |
`
    );

    // 4. Create canonical architecture component
    fs.writeFileSync(
      path.join(archDir, 'CMP-CORE-AUTH.md'),
      `---
id: CMP-CORE-AUTH
type: component
satisfies-requirements: []
---
# Component CMP-CORE-AUTH

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-01 | Architect | Creación inicial | CHG-INIT |
`
    );

    // 5. Create change workspace: tasks.md (completed)
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      `---
tasks:
  - id: TSK-001
    status: COMPLETED
    satisfies-requirements:
      - PRIV-REQ-MASKING-001
---
`
    );

    // 6. Create change proposal.md
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      `---
id: CHG-PRIVACY-TEST
type: spec-change-proposal
status: approved
---
# Proposal Privacy Test
`
    );

    // 7. Create change handoff.yaml
    fs.writeFileSync(
      path.join(changeDir, 'handoff.yaml'),
      `id: HOF-CHG-PRIVACY-TEST
type: handoff
changeId: chg-privacy-test
subgraph:
  requirements: []
  privacyRequirements:
    - PRIV-REQ-MASKING-001
  dataAssets:
    - DATA-ASSET-USER-PROFILE-001
  privacyRopa:
    - PRIV-ROPA-USER-AUTH-001
citations:
  - id: CMP-CORE-AUTH
`
    );

    // Run integrateSddChange
    const res = integrateSddChange({
      rootDir: tmpPrivacyDir,
      changeId: 'chg-privacy-test',
      author: 'PrivacyOfficerAgent',
    });

    expect(res.success).toBe(true);
    expect(res.integratedRequirements).toContain('PRIV-REQ-MASKING-001');
    expect(res.integratedRequirements).toContain('DATA-ASSET-USER-PROFILE-001');
    expect(res.integratedRequirements).toContain('PRIV-ROPA-USER-AUTH-001');

    expect(res.updatedProductArtifacts).toContain('PRIV-REQ-MASKING-001');
    expect(res.updatedProductArtifacts).toContain('DATA-ASSET-USER-PROFILE-001');
    expect(res.updatedProductArtifacts).toContain('PRIV-ROPA-USER-AUTH-001');
    expect(res.updatedArchitectureArtifacts).toContain('CMP-CORE-AUTH');
    expect(res.archived).toBe(true);

    // Verify PRIV-REQ-MASKING-001 was promoted to active with revision history
    const updatedReq = fs.readFileSync(path.join(privReqDir, 'PRIV-REQ-MASKING-001.md'), 'utf-8');
    expect(updatedReq).toContain('status: active');
    expect(updatedReq).toContain('chg-privacy-test');
    expect(updatedReq).toContain('PrivacyOfficerAgent');

    // Verify DATA-ASSET was promoted to active with revision history
    const updatedAsset = fs.readFileSync(path.join(dataAssetDir, 'DATA-ASSET-USER-PROFILE-001.md'), 'utf-8');
    expect(updatedAsset).toContain('status: active');
    expect(updatedAsset).toContain('chg-privacy-test');

    // Verify PRIV-ROPA was promoted to active with revision history
    const updatedRopa = fs.readFileSync(path.join(ropaDir, 'PRIV-ROPA-USER-AUTH-001.md'), 'utf-8');
    expect(updatedRopa).toContain('status: active');
    expect(updatedRopa).toContain('chg-privacy-test');

    // Verify architecture component satisfies PRIV-REQ-MASKING-001, but NOT data assets or ROPAs
    const updatedArch = fs.readFileSync(path.join(archDir, 'CMP-CORE-AUTH.md'), 'utf-8');
    expect(updatedArch).toContain('PRIV-REQ-MASKING-001');
    expect(updatedArch).not.toContain('DATA-ASSET-USER-PROFILE-001');
    expect(updatedArch).not.toContain('PRIV-ROPA-USER-AUTH-001');

    fs.rmSync(tmpPrivacyDir, { recursive: true, force: true });
  });

  it('should scaffold SDD change citing privacy artifacts and deposit handoff sidecar correctly', () => {
    const tmpScaffoldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-sdd-privacy-scaffold-'));
    const privReqDir = path.join(tmpScaffoldDir, 'specs', 'privacy', 'requirements');
    fs.mkdirSync(privReqDir, { recursive: true });

    fs.writeFileSync(
      path.join(privReqDir, 'PRIV-REQ-EXPORT-001.md'),
      `---
id: PRIV-REQ-EXPORT-001
type: privacy-requirement
status: draft
version: "1.0.0"
title: User Data Export Right
---
# PRIV-REQ-EXPORT-001: User Data Export Right
`
    );

    try {
      const res = scaffoldSddChange({
        rootDir: tmpScaffoldDir,
        name: 'Implementación de Derecho ARCO de Portabilidad',
        changeId: 'chg-privacy-arco-export',
        from: 'PRIV-REQ-EXPORT-001',
        framework: 'openspec',
        silent: true,
      });

      expect(res.success).toBe(true);
      expect(res.citedArtifacts.some((c) => c.id === 'PRIV-REQ-EXPORT-001')).toBe(true);

      const handoff = loadProductHandoffSidecar(res.changeDir);
      expect(handoff?.subgraph.privacyRequirements).toContain('PRIV-REQ-EXPORT-001');

      // Verify tasks.md includes the privacy requirement in satisfies-requirements
      const tasksContent = fs.readFileSync(path.join(res.changeDir, 'tasks.md'), 'utf-8');
      expect(tasksContent).toContain('PRIV-REQ-EXPORT-001');
    } finally {
      fs.rmSync(tmpScaffoldDir, { recursive: true, force: true });
    }
  });
});
