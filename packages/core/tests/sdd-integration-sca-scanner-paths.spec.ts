import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendRevisionHistoryRow,
  findChangeWorkspaceDir,
  parseTasksFromContent,
} from '../src/adapters/sdd/integration.js';
import { isReviewerRole } from '../src/adapters/sdd/review-report.js';
import {
  extractDirectDepNames,
  findLicenseFile,
  isToolAvailable,
  normalizeSpdxLicense,
  parseSyftOutput,
  readPackageJson,
  resolveLicenseFromFile,
} from '../src/verifiers/sca/scanner.js';

describe('SDD Integration Helpers & SCA Scanner Unit Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sdd-sca-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parseTasksFromContent, appendRevisionHistoryRow, findChangeWorkspaceDir, isReviewerRole (happy/sad/boundary/malformed)', () => {
    expect(parseTasksFromContent('')).toEqual([]);
    expect(parseTasksFromContent('---\ntasks:\n  - id: TSK-1\n    title: Do x\n---\n')).toHaveLength(1);
    expect(parseTasksFromContent('---\ninvalid: [yaml\n---\n')).toEqual([]);

    const withHistory =
      '# Doc\n\n## Historial de Revisiones\n| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |\n| --- | --- | --- | --- | --- |\n';
    const updated = appendRevisionHistoryRow(withHistory, {
      version: '1.1',
      date: '2026-02-01',
      author: 'Agent',
      description: 'Added feature',
      reference: 'CHG-1',
    });
    expect(updated).toContain('| **1.1** | 2026-02-01 | Agent | Added feature | CHG-1 |');
    // Idempotent when reference already exists
    expect(
      appendRevisionHistoryRow(updated, {
        version: '1.1',
        date: '2026-02-01',
        author: 'Agent',
        description: 'Added feature',
        reference: 'CHG-1',
      })
    ).toBe(updated);

    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-100');
    const compDir = path.join(tmpDir, 'specs', 'changes', 'completed', 'chg-101');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.mkdirSync(compDir, { recursive: true });
    expect(findChangeWorkspaceDir(tmpDir, 'chg-100')).toBe(activeDir);
    expect(findChangeWorkspaceDir(tmpDir, 'chg-101')).toBe(compDir);
    expect(findChangeWorkspaceDir(tmpDir, 'chg-404')).toBeNull();

    expect(isReviewerRole('agent-auditor')).toBe(true);
    expect(isReviewerRole('agent-adversary')).toBe(true);
    expect(isReviewerRole('agent-developer')).toBe(false);
    expect(isReviewerRole('')).toBe(false);
  });

  it('SCA scanner helpers: normalizeSpdxLicense, readPackageJson, extractDirectDepNames, findLicenseFile, parseSyftOutput, isToolAvailable (happy/sad/malformed)', () => {
    expect(normalizeSpdxLicense('MIT')).toBe('MIT');
    expect(normalizeSpdxLicense({ type: 'Apache-2.0' })).toBe('Apache-2.0');
    expect(normalizeSpdxLicense('')).toBe('UNKNOWN');
    expect(normalizeSpdxLicense(null)).toBe('UNKNOWN');

    expect(readPackageJson(path.join(tmpDir, 'missing.json'))).toBeNull();
    const pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, '{bad-json', 'utf-8');
    expect(readPackageJson(pkgPath)).toBeNull();

    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'app', dependencies: { zod: '^3.0.0' }, devDependencies: { vitest: '^2.0.0' } }),
      'utf-8'
    );
    expect(readPackageJson(pkgPath)?.name).toBe('app');
    expect(extractDirectDepNames(tmpDir, false).has('vitest')).toBe(true);
    expect(extractDirectDepNames(tmpDir, true).has('vitest')).toBe(false);

    expect(findLicenseFile(tmpDir)).toBeUndefined();
    const licPath = path.join(tmpDir, 'LICENSE');
    fs.writeFileSync(licPath, 'Permission is hereby granted, free of charge, MIT License', 'utf-8');
    expect(findLicenseFile(tmpDir)).toBe(licPath);
    expect(resolveLicenseFromFile(licPath)).toBe('MIT');
    expect(resolveLicenseFromFile(undefined)).toBeUndefined();

    expect(parseSyftOutput('')).toEqual([]);
    expect(parseSyftOutput('{malformed')).toEqual([]);
    const syft = parseSyftOutput(
      JSON.stringify({
        artifacts: [{ name: 'zod', version: '3.22.4', licenses: [{ value: 'MIT' }], purl: 'pkg:npm/zod@3.22.4' }],
      })
    );
    expect(syft).toHaveLength(1);
    expect(syft[0]).toMatchObject({ name: 'zod', version: '3.22.4', spdxLicense: 'MIT' });

    expect(isToolAvailable('definitely_nonexistent_binary_xyz_123')).toBe(false);
  });
});
