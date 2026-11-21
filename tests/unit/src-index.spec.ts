/**
 * AI-SDLC: Root Framework Entrypoint Unit Tests
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001
 */

import { describe, expect, it } from 'vitest';
import {
  FRAMEWORK_NAME,
  FRAMEWORK_VERSION,
  getFrameworkInfo,
  isFrameworkInitialized,
} from '../../src/index.js';

describe('@FR-046-NATIVE-SDK-CLI-AST-001: Root src/index.ts entrypoint', () => {
  describe('getFrameworkInfo', () => {
    it('returns canonical framework name and SemVer version (happy)', () => {
      const info = getFrameworkInfo();
      expect(info).toEqual({
        name: FRAMEWORK_NAME,
        version: FRAMEWORK_VERSION,
      });
      expect(info.name).toBe('AI-SDLC');
      expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('returns a fresh object with exact keys and isolates caller mutations (boundary)', () => {
      const first = getFrameworkInfo();
      const second = getFrameworkInfo();
      expect(Object.keys(first).sort()).toEqual(['name', 'version']);
      expect(first).not.toBe(second);

      first.name = 'MUTATED';
      first.version = '0.0.0';
      expect(getFrameworkInfo()).toEqual({
        name: 'AI-SDLC',
        version: '1.0.0',
      });
    });

    it('ignores unexpected extra runtime arguments cleanly (malformed)', () => {
      const info = Reflect.apply(getFrameworkInfo, undefined, ['unexpected', 42, null]);
      expect(info).toEqual({ name: 'AI-SDLC', version: '1.0.0' });
    });
  });

  describe('isFrameworkInitialized', () => {
    it('returns true when verbose flag is true (happy)', () => {
      const result = isFrameworkInitialized(true);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('returns true when verbose flag is omitted or false (sad/boundary)', () => {
      expect(isFrameworkInitialized()).toBe(true);
      expect(isFrameworkInitialized(undefined)).toBe(true);
      expect(isFrameworkInitialized(false)).toBe(true);
    });

    it('handles malformed non-boolean runtime inputs without throwing (malformed)', () => {
      const malformedInputs: unknown[] = [null, '', 0, 1, 'true', {}, []];
      for (const input of malformedInputs) {
        expect(isFrameworkInitialized(input as boolean)).toBe(true);
      }
    });
  });
});
