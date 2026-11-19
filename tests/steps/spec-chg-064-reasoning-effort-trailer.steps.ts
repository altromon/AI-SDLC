// BDD STEP DEFINITIONS (tests/features/spec-chg-064-reasoning-effort-trailer.feature)
// Traceability: @CHG-064-REASONING-EFFORT-TRAILER @FR-064-REASONING-EFFORT-TRAILER-001 @UC-064-REASONING-EFFORT-TRAILER CMP-064-REASONING-EFFORT-TRAILER
import { BddStepRegistry } from '@aisdlc/core';
import { registerSteps as registerFrSteps } from './fr-064-reasoning-effort-trailer-001.steps.js';

export function registerSteps(registry: BddStepRegistry): void {
  registerFrSteps(registry);
}
