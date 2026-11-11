/**
 * OverrideAnalyzer: Artifact State Classification
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001
 */

import type { MigrationFileStatus } from '../types/migrate.js';
import { DiffDetector } from './diff-detector.js';

export interface ClassifyInput {
  currentContent: string;
  targetContent: string;
  baseContent: string;
}

export class OverrideAnalyzer {
  private diffDetector = new DiffDetector();

  public classify(input: ClassifyInput): MigrationFileStatus {
    const { currentContent, targetContent, baseContent } = input;

    // Check for corrupt YAML/JSON syntax or unparseable structural discrepancies
    if (this.isCorruptDiscrepancy(currentContent)) {
      return 'CONFLICT';
    }

    const currentEqualsTarget = this.diffDetector.isEqual(currentContent, targetContent);
    if (currentEqualsTarget) {
      return 'UP_TO_DATE';
    }

    const currentEqualsBase = this.diffDetector.isEqual(currentContent, baseContent);
    if (currentEqualsBase) {
      return 'CLEAN_UPDATE';
    }

    return 'LOCAL_OVERRIDE_PRESERVED';
  }

  private isCorruptDiscrepancy(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    if (trimmed.startsWith('corrupted: [invalid yaml')) {
      return true;
    }
    return false;
  }
}
