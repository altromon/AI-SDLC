import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateComplianceEvidenceBundle } from '../src/compliance/compliance-service.js';
import { DoctorService } from '../src/doctor/doctor-service.js';
import {
  generateSecuritySarifReport,
  mapSastSeverityToSarifLevel,
  normalizeUri,
  resolveSastCwe,
  resolveSastOwasp,
  serializeSarifDocument,
} from '../src/reporters/sarif.js';

describe('DoctorService, SARIF Helpers & Async Compliance Bundle (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-doc-sarif-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // Ignore transient Windows EPERM lock during temp dir cleanup
    }
  });

  it('DoctorService.diagnose: returns structured DoctorReport for workspace (happy/boundary)', async () => {
    const svc = new DoctorService();
    const report = await svc.diagnose({ rootDir: tmpDir });
    expect(report.categories.length).toBeGreaterThan(0);
    expect(['pass', 'warn', 'fail']).toContain(report.overallStatus);
    expect(typeof report.exitCode).toBe('number');
  }, 15000);

  it('SARIF helpers: normalizeUri, severity mapping, CWE/OWASP resolution, and compact serialization (happy/boundary)', () => {
    expect(normalizeUri('src\\a\\b.ts')).toBe('src/a/b.ts');
    expect(mapSastSeverityToSarifLevel('CRITICAL')).toBe('error');
    expect(mapSastSeverityToSarifLevel('HIGH')).toBe('error');
    expect(mapSastSeverityToSarifLevel('MEDIUM')).toBe('warning');
    expect(mapSastSeverityToSarifLevel('LOW')).toBe('note');
    expect(mapSastSeverityToSarifLevel('unknown' as never)).toBe('note');

    expect(resolveSastCwe('SAST-001')).toContain('CWE-89');
    expect(Array.isArray(resolveSastCwe('UNKNOWN-RULE'))).toBe(true);
    expect(Array.isArray(resolveSastOwasp('UNKNOWN-RULE'))).toBe(true);

    const doc = generateSecuritySarifReport({ rootDir: tmpDir });
    const compact = serializeSarifDocument(doc, false);
    const pretty = serializeSarifDocument(doc, true);
    expect(compact.includes('\n')).toBe(false);
    expect(pretty.includes('\n')).toBe(true);
    expect(JSON.parse(compact).version).toBe('2.1.0');
  });

  it('generateComplianceEvidenceBundle: builds compliance bundle asynchronously on clean workspace (happy)', async () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const ok = true;\n', 'utf-8');

    const bundle = await generateComplianceEvidenceBundle({
      rootDir: tmpDir,
      version: '1.0.0',
      outputPath: path.join(tmpDir, 'reports', 'compliance-bundle.json'),
    });
    expect(bundle.success).toBe(true);
    expect(bundle.bundleDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.existsSync(bundle.outputPath)).toBe(true);
  }, 15000);
});
