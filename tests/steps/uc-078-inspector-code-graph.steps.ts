// BDD STEP DEFINITIONS (tests/features/uc-078-inspector-code-graph.feature)
// Traceability: @UC-078-INSPECTOR-CODE-GRAPH @FR-078-INSPECTOR-CODE-GRAPH-001 @CHG-078-INSPECTOR-CODE-GRAPH @TSK-003
import { BddStepRegistry } from '@aisdlc/core';
import { registerSteps as registerFr078Steps } from './fr-078-inspector-code-graph-001.steps.js';

export function registerSteps(registry: BddStepRegistry): void {
  registerFr078Steps(registry);
}
