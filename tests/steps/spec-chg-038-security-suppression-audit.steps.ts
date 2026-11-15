// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/spec-chg-038-security-suppression-audit.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un hallazgo de seguridad acompañado de '// ai-sdlc:allow-sast rule=\"SAST-001\" reason=\"Sanitizado en capa previa\" expires=\"2099-01-01\" approved-by=\"sec@empresa.com\"'"],
  ['when', "se ejecuta la verificación de seguridad"],
  ['then', "la supresión es clasificada como activa"],
  ['given', "el hallazgo correspondiente no bloquea el gate"],
  ['given', "la supresión se incluye en \"reports/SUPPRESSIONS_AUDIT.md\""],
  ['given', "un hallazgo de seguridad acompañado de un comentario '// nosec' o supresión sin 'expires'"],
  ['then', "la supresión es clasificada como inválida"],
  ['given', "el hallazgo de seguridad original permanece activo"],
  ['given', "un hallazgo de seguridad con supresión cuya fecha 'expires' es anterior a hoy"],
  ['then', "la supresión es clasificada como expirada"],
  ['given', "el Quality Gate de seguridad falla con código de salida 1"],
  ['given', "una vulnerabilidad crítica con comentario de supresión sin aprobador válido"],
  ['when', "el motor SAST analiza el archivo"],
  ['then', "la supresión es descartada y se reporta violación bloqueante"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
