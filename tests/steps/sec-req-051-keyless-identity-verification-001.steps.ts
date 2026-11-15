// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-051-keyless-identity-verification-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an in-toto attestation generated with an untrusted OIDC issuer \"https://attacker.evil-idp.com\""],
  ['when', "the attestation verification routine inspects the signature bundle"],
  ['then', "the process must reject the attestation with diagnostic \"ERR_UNTRUSTED_OIDC_ISSUER\""],
  ['given', "the verification must return an exit status of 1"],
  ['given', "a CI/CD runner presenting a valid GitHub Actions OIDC token from the official repository"],
  ['when', "\"aisdlc report compliance --keyless\" executes in production CI"],
  ['then', "the generated in-toto statement must record the verified repository and workflow identity"],
  ['given', "the attestation verification must confirm signature validity against the transparency log"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
