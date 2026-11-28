/**
 * CLI Unit Tests for Gherkin Remediation Messages (RED Phase)
 * Cites: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001, TSK-080-02, TSK-080-03
 * Tag: @FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001 @CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildGherkinFailedGate } from '../src/commands/check.js';
import { buildGherkinViolations, printGherkinVerifyConsole } from '../src/commands/verify.js';

describe('@FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001: CLI Gherkin remediation messages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildGherkinViolations emits optional [--lang <lang>] for MISSING_STEP_FILE', () => {
    const violations = buildGherkinViolations({
      inSync: false,
      totalFeatures: 1,
      missingFiles: [],
      outOfSyncFiles: [],
      orphanFeatureFiles: [],
      missingStepFiles: ['tests/features/fr-080.feature'],
      stepLanguageMismatches: [],
    });

    const missingStep = violations.find((v) => v.type === 'MISSING_STEP_FILE');
    expect(missingStep).toBeDefined();
    expect(missingStep!.message).toContain('[--lang <lang>]');
    expect(missingStep!.message).not.toMatch(/\s--lang <lang>/);
  });

  it('printGherkinVerifyConsole emits optional [--lang <lang>] for MISSING_STEP_FILE', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg));
    });

    printGherkinVerifyConsole({
      inSync: false,
      totalFeatures: 1,
      missingFiles: [],
      outOfSyncFiles: [],
      orphanFeatureFiles: [],
      missingStepFiles: ['tests/features/fr-080.feature'],
      stepLanguageMismatches: [],
    });

    const output = logs.join('\n');
    expect(output).toContain('[--lang <lang>]');
    expect(output).not.toMatch(/\s--lang <lang>/);
  });

  it('buildGherkinFailedGate emits optional [--lang <lang>] when hasMissingSteps is true', () => {
    const gate = buildGherkinFailedGate(1, true, false);
    expect(gate.status).toBe('FAILED');
    expect(gate.remediation).toContain('[--lang <lang>]');
    expect(gate.remediation).not.toMatch(/\s--lang <lang>/);
  });
});
