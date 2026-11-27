// BDD STEP DEFINITIONS (tests/features/uc-079-sca-recursive-doctor-toolchains.feature)
// Traceability: @UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
import { BddStepRegistry } from '@aisdlc/core';
import { registerSteps as registerFrSteps } from './fr-079-sca-recursive-doctor-toolchains-001.steps.js';

export function registerSteps(registry: BddStepRegistry): void {
  registerFrSteps(registry);
}
