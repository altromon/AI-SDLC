// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-060-doctor-security-tools.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "all base doctor categories pass"],
  ['given', "\"semgrep\", \"trivy\", and \"gitleaks\" are resolved on trusted PATH and exit 0 with version output"],
  ['when', "\"DoctorService.diagnose\" is executed"],
  ['then', "the DoctorReport includes category \"security_tools\" with status \"pass\" and zero findings"],
  ['given', "overallStatus is \"pass\" with exitCode 0"],
  ['given', "\"<tool>\" is missing from PATH on platform \"<platform>\""],
  ['then', "category \"security_tools\" has status \"warn\""],
  ['given', "finding \"<finding_id>\" has status \"warn\" and remediation \"<remediation_hint>\""],
  ['given', "overallStatus is \"warn\" with exitCode 1"],
  ['given', "\"trivy\" is missing from PATH"],
  ['when', "\"DoctorService.diagnose\" is executed with \"strict: true\""],
  ['given', "no install command or network request is executed"],
  ['given', "overallStatus is \"warn\" with exitCode 2"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
