import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  depositProductHandoffSidecar,
  getNextCorrelativeNumber,
  getSddAdapter,
  integrateSddChange,
  loadProductHandoffSidecar,
  OpenSpecAdapter,
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
    expect(telemetryReq?.productStatus).toBe('CONFORME');
    expect(telemetryReq?.archStatus).toBe('CONFORME');
    expect(telemetryReq?.testStatus).toBe('CONFORME');

    // Check report markdown output
    expect(result.reportMarkdown).toContain('Matriz de Trazabilidad de Requerimientos 360°');
    expect(result.reportMarkdown).toContain('FR-FIXTURE-001');
    expect(result.reportMarkdown).toContain('100% TRAZABLE');
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
    const testChangeDir = path.join(process.cwd(), 'specs', 'changes', 'active', 'chg-test-from-cli');
    if (fs.existsSync(testChangeDir)) {
      fs.rmSync(testChangeDir, { recursive: true, force: true });
    }

    const res = scaffoldSddChange({
      rootDir: process.cwd(),
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

    // Clean up created change folder
    if (fs.existsSync(res.changeDir)) {
      fs.rmSync(res.changeDir, { recursive: true, force: true });
    }
  });
});

