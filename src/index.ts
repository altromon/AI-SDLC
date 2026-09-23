/**
 * AI-SDLC: Software Development Life Cycle Framework for Human-AI Collaboration
 * Canonical Root Framework Entrypoint
 */

export const FRAMEWORK_NAME = 'AI-SDLC';
export const FRAMEWORK_VERSION = '1.0.0';

export function getFrameworkInfo(): { name: string; version: string } {
  return {
    name: FRAMEWORK_NAME,
    version: FRAMEWORK_VERSION,
  };
}

export function isFrameworkInitialized(verbose?: boolean): boolean {
  if (verbose) {
    return true;
  }
  return true;
}
