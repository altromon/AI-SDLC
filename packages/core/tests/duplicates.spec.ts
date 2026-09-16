import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  calculateJaccardSimilarity,
  tokenizeTitle,
  verifyArtifactDuplicates,
} from '../src/verifiers/duplicates.js';

describe('AI-SDLC Duplicate Requirements Verifier Suite', () => {
  it('should pass with 0 errors on the canonical workspace', () => {
    const result = verifyArtifactDuplicates({
      rootDir: path.resolve(__dirname, '../../..'),
    });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.totalRequirements).toBeGreaterThanOrEqual(1);
    expect(result.reportMarkdown).toContain('CONFORME');
  });

  it('should calculate title tokenization and Jaccard similarity correctly', () => {
    const tokensA = tokenizeTitle('Ingesta Continua de Tramas Telemétricas');
    const tokensB = tokenizeTitle('Ingesta continua de tramas telemétricas UAV');
    const sim = calculateJaccardSimilarity(tokensA, tokensB);

    expect(sim).toBeGreaterThan(0.7);
  });

  it('should permit multiple distinct atomic requirements under the same UC-* (SRP)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-srp-'));
    const specsDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(specsDir, { recursive: true });

    // Requirement 1 for UC-001
    fs.writeFileSync(
      path.join(specsDir, 'FR-INGEST-001.md'),
      `---
id: FR-INGEST-001
type: requirement
title: Ingesta Perimetral de Datos
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-STREAM-TELEMETRY
cucumber-tags:
  - "@telemetry"
  - "@ingest"
---

## 1. Enunciado Normativo
El componente perimetral debe recibir paquetes telemétricos.
`
    );

    // Requirement 2 for the same UC-001 (SRP: Decompression & Validation)
    fs.writeFileSync(
      path.join(specsDir, 'FR-VALIDATE-002.md'),
      `---
id: FR-VALIDATE-002
type: requirement
title: Validación de Integridad Cinemática
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-STREAM-TELEMETRY
cucumber-tags:
  - "@telemetry"
  - "@kinematics"
---

## 1. Enunciado Normativo
El componente validador debe rechazar saltos de aceleración superiores a 5G.
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.totalRequirements).toBe(2);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect ID collisions across different files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-id-'));
    const dirA = path.join(tempDir, 'specs', 'product');
    const dirB = path.join(tempDir, 'specs', 'changes', 'active', 'chg-001');
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirB, { recursive: true });

    fs.writeFileSync(
      path.join(dirA, 'FR-AUTH-001.md'),
      `---
id: FR-AUTH-001
type: requirement
title: Autenticación de Usuarios
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-LOGIN
---
## 1. Enunciado Normativo
Debe validar contraseñas seguras.
`
    );

    fs.writeFileSync(
      path.join(dirB, 'FR-AUTH-001.md'),
      `---
id: FR-AUTH-001
type: requirement
title: Autenticación de Usuarios en Cambio
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-LOGIN
---
## 1. Enunciado Normativo
Debe validar tokens OAuth.
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBeGreaterThanOrEqual(1);
    const idIssue = result.issues.find((i) => i.type === 'ID_COLLISION');
    expect(idIssue).toBeDefined();
    expect(idIssue?.id).toBe('FR-AUTH-001');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect exact content / body copy-paste across different IDs', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-body-'));
    const specsDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(specsDir, { recursive: true });

    const sharedBody = `## 1. Enunciado Normativo
El sistema debe procesar telemetría geospacial a una frecuencia nominal de 10 Hz descartando paquetes corruptos.`;

    fs.writeFileSync(
      path.join(specsDir, 'FR-REQ-A.md'),
      `---
id: FR-REQ-A
type: requirement
title: Ingesta Telemétrica UAV Alpha
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-STREAM-A
---
${sharedBody}
`
    );

    fs.writeFileSync(
      path.join(specsDir, 'FR-REQ-B.md'),
      `---
id: FR-REQ-B
type: requirement
title: Ingesta Telemétrica UAV Beta
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-STREAM-B
---
${sharedBody}
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir });

    expect(result.success).toBe(false);
    const exactIssue = result.issues.find((i) => i.type === 'EXACT_CONTENT');
    expect(exactIssue).toBeDefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect title redundancy above threshold', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-title-'));
    const specsDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(specsDir, { recursive: true });

    fs.writeFileSync(
      path.join(specsDir, 'FR-TITLE-1.md'),
      `---
id: FR-TITLE-1
type: requirement
title: Ingesta Continua de Tramas Telemétricas en Tiempo Real
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-001
---
## 1. Enunciado Normativo
Texto único número 1.
`
    );

    fs.writeFileSync(
      path.join(specsDir, 'FR-TITLE-2.md'),
      `---
id: FR-TITLE-2
type: requirement
title: Ingesta Continua de Tramas Telemétricas en Tiempo Real para Drones
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-002
---
## 1. Enunciado Normativo
Texto único número 2 con comportamiento diferente.
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir, titleSimilarityThreshold: 0.8 });

    expect(result.success).toBe(false);
    const titleIssue = result.issues.find((i) => i.type === 'TITLE_SIMILARITY');
    expect(titleIssue).toBeDefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect BDD tag collisions between different requirements', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-bdd-'));
    const specsDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(specsDir, { recursive: true });

    fs.writeFileSync(
      path.join(specsDir, 'FR-BDD-1.md'),
      `---
id: FR-BDD-1
type: requirement
title: Capacidad Uno
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-001
cucumber-tags:
  - "@telemetry_stream"
  - "@realtime_gps"
---
## 1. Enunciado Normativo
Cuerpo 1.
`
    );

    fs.writeFileSync(
      path.join(specsDir, 'FR-BDD-2.md'),
      `---
id: FR-BDD-2
type: requirement
title: Capacidad Dos Diferente
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-002
cucumber-tags:
  - "@realtime_gps"
  - "@telemetry_stream"
---
## 1. Enunciado Normativo
Cuerpo 2.
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir });

    expect(result.success).toBe(false);
    const bddIssue = result.issues.find((i) => i.type === 'BDD_TAG_COLLISION');
    expect(bddIssue).toBeDefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should emit a warning when two requirements govern the same atomic business rule', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-br-'));
    const specsDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(specsDir, { recursive: true });

    fs.writeFileSync(
      path.join(specsDir, 'FR-BR-A.md'),
      `---
id: FR-BR-A
type: requirement
title: Validación de Tramas Primaria
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-001
  - BR-TELEMETRY-VALIDITY
---
## 1. Enunciado Normativo
Cuerpo primario.
`
    );

    fs.writeFileSync(
      path.join(specsDir, 'FR-BR-B.md'),
      `---
id: FR-BR-B
type: requirement
title: Validación de Tramas Secundaria
status: active
version: 1.0.0
category: functional
derives-from:
  - UC-002
  - BR-TELEMETRY-VALIDITY
---
## 1. Enunciado Normativo
Cuerpo secundario.
`
    );

    const result = verifyArtifactDuplicates({ rootDir: tempDir });

    expect(result.success).toBe(true); // Warnings do not block
    expect(result.warningCount).toBe(1);
    const brIssue = result.issues.find((i) => i.type === 'SHARED_BUSINESS_RULE');
    expect(brIssue).toBeDefined();
    expect(brIssue?.severity).toBe('WARNING');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
