import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, expect, it } from 'vitest';
import { runVerifyLicenses } from '../src/commands/verify.js';

describe('@ai-sdlc/cli verify licenses command suite', () => {
  it('should run dynamic license compliance verification on current repository and pass', () => {
    const passed = runVerifyLicenses({ silent: true });
    expect(passed).toBe(true);
  });

  it('should generate CycloneDX SBOM when path is provided via options', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-sbom-'));
    try {
      const customSbomPath = path.join(tmpDir, 'custom-sbom.json');
      const passed = runVerifyLicenses({
        sbom: customSbomPath,
        silent: true,
      });

      expect(passed).toBe(true);
      expect(fs.existsSync(customSbomPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(customSbomPath, 'utf-8'));
      expect(content.bomFormat).toBe('CycloneDX');
      expect(content.specVersion).toBe('1.5');
      expect(Array.isArray(content.components)).toBe(true);
      expect(content.components.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should generate THIRD_PARTY_NOTICES.md when requested via options', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-notices-'));
    try {
      const customNoticesPath = path.join(tmpDir, 'CUSTOM_NOTICES.md');
      const passed = runVerifyLicenses({
        notices: customNoticesPath,
        silent: true,
      });

      expect(passed).toBe(true);
      expect(fs.existsSync(customNoticesPath)).toBe(true);

      const content = fs.readFileSync(customNoticesPath, 'utf-8');
      expect(content).toContain('Third-Party Software Notices');
      expect(content).toContain('Resumen de Licencias de Terceros');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should support direct dependency scanning depth', () => {
    const passed = runVerifyLicenses({
      depth: 'direct',
      silent: true,
    });
    expect(passed).toBe(true);
  });
});
