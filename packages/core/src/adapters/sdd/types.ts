/**
 * AI-SDLC: SDD Ecosystem Adapters Interface (OpenSpec & Spec Kit)
 */

import { ProductHandoff, SddFramework, SddValidationResult } from '../../types/index.js';

export interface SddAdapter {
  readonly framework: SddFramework;
  getChangeWorkspaceDir(rootDir: string, changeId: string): string;
  depositSidecar(options: {
    rootDir: string;
    changeId: string;
    handoff: ProductHandoff;
    format?: 'yaml' | 'json';
  }): string;
  loadSidecar(changeWorkspaceDir: string): ProductHandoff | null;
  validateWorkspace(changeWorkspaceDir: string): SddValidationResult;
}
