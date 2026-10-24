import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { STARTER_TEMPLATES_MANUALS_PRODUCTION_MANUAL_TEMPLATE_MD } from '../src/init/starter-templates.js';

describe('Release Supply Chain Provenance & Verification Suite (FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001)', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const releaseYmlPath = path.join(rootDir, '.github', 'workflows', 'release.yml');
  const prodManualTemplatePath = path.join(rootDir, 'templates', 'manuals', 'production-manual.template.md');

  it('validates .github/workflows/release.yml declared permissions and publishing command', () => {
    expect(fs.existsSync(releaseYmlPath)).toBe(true);
    const content = fs.readFileSync(releaseYmlPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, any>;

    // 1. Required permissions for OIDC and SLSA Attestations
    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions['id-token']).toBe('write');
    expect(parsed.permissions['attestations']).toBe('write');

    // 2. Changeset publish with --provenance
    expect(content).toContain('pnpm changeset publish');
    expect(content).toContain('NPM_CONFIG_PROVENANCE: true');

    // 3. Sigstore/Cosign installation and signing
    expect(content).toContain('sigstore/cosign-installer');
    expect(content).toContain('cosign sign-blob');

    // 4. SLSA provenance attestation action
    expect(content).toContain('actions/attest-build-provenance');
  });

  it('validates production-manual.template.md contains deterministic Cosign and SLSA verification commands', () => {
    expect(fs.existsSync(prodManualTemplatePath)).toBe(true);
    const content = fs.readFileSync(prodManualTemplatePath, 'utf-8');

    expect(content).toContain('cosign verify-blob');
    expect(content).toContain('gh attestation verify');
  });

  it('ensures starter templates in @aisdlc/core are synchronized with production manual template', () => {
    expect(STARTER_TEMPLATES_MANUALS_PRODUCTION_MANUAL_TEMPLATE_MD).toContain('cosign verify-blob');
    expect(STARTER_TEMPLATES_MANUALS_PRODUCTION_MANUAL_TEMPLATE_MD).toContain('gh attestation verify');
  });
});
