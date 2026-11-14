---
id: DSG-CHG-060-DOCTOR-SECURITY-TOOLS
type: spec-design
change-id: CHG-060-DOCTOR-SECURITY-TOOLS
title: 'Diseño Técnico: Doctor Diagnostics for Optional Security CLIs'
version: '1.0.0'
schema-version: '1.0'
handoff: 'HOF-CHG-060-DOCTOR-SECURITY-TOOLS'
architecture-component: 'CMP-060-DOCTOR-SECURITY-TOOLS'
enclave: 'SEC-ENC-DMZ'
status: draft
contracts: []
citations:
  - id: UC-060-DOCTOR-SECURITY-TOOLS
    digest: sha256:220cb398fe11050f672ae05a16b9a7a8d8fd804b337983a1918b2304e0f92b83
    comment: Caso de uso para diagnóstico de herramientas opcionales de seguridad en aisdlc doctor
  - id: FR-060-DOCTOR-SECURITY-TOOLS-001
    digest: sha256:139b76c9d23414b6a301368225bf1093c5de32933a22a9052140f835e5b16fb7
    comment: Requerimiento funcional de diagnóstico no bloqueante para semgrep, trivy y gitleaks
  - id: CMP-060-DOCTOR-SECURITY-TOOLS
    digest: sha256:afd9d2ee5585294f7df1c074a18a7322e743ac76a93aca7046ce894e40fcb040
    comment: Componente arquitectónico de diagnóstico de herramientas opcionales de seguridad
---

# Diseño Técnico: CHG-060-DOCTOR-SECURITY-TOOLS

## 1. Mapeo Arquitectónico, Diseño Modular y Enclave Zero Trust
Materializa `CMP-060-DOCTOR-SECURITY-TOOLS` en el enclave `SEC-ENC-DMZ` siguiendo YAGNI estricto, reutilizando los helpers de seguridad de `tool-installer.ts` y la infraestructura de `CMP-052-DOCTOR-ENGINE`:

1. **`packages/core/src/types/doctor.ts`**:
   - Añadir `'security_tools'` al tipo unión `DiagnosticCategory`.
   - Ampliar `IProcessRunner.execSafe` para aceptar `'node' | 'pnpm' | 'git' | 'semgrep' | 'trivy' | 'gitleaks'`.
2. **`packages/core/src/doctor/process-runner.ts`**:
   - Añadir `'semgrep'`, `'trivy'`, `'gitleaks'` a `ALLOWED_TOOLS` en `SafeProcessRunnerAdapter`, manteniendo `shell: false`, `maxBuffer: 1024` y `timeout` acotado (`Math.min(options.timeout ?? 2000, 2000)`).
   - Tras validar `ALLOWED_TOOLS`, `SafeProcessRunnerAdapter.execSafe` (para `semgrep`/`trivy`/`gitleaks` y herramientas existentes) DEBE resolver el binario mediante `resolveTrustedBinaryPath(executable, cwd)` y ejecutar ese `trustedPath` absoluto (nunca el nombre bare con `cwd: rootDir`, previniendo CWE-426).
   - `buildSafeEnvironment(cwd?)` DEBE eliminar `.`, rutas relativas y `cwd` de `PATH`/`Path`, e inyectar `SEMGREP_ENABLE_VERSION_CHECK: '0'` y `SEMGREP_SEND_METRICS: 'off'` para evitar peticiones de telemetría/versión salientes durante `semgrep --version`.
   - Para shims `.cmd`/`.bat` en Windows, `SafeProcessRunnerAdapter` DEBE validar argumentos contra `WIN_CMD_META_RE` y ejecutar vía `ComSpec` (`/d /s /c`, `shell: false`), reutilizando o espejando `tool-installer.ts`.
3. **`packages/core/src/verifiers/tool-installer.ts`**:
   - Añadir `'gitleaks'` a `InstallableTool` y `TOOL_INSTALL_ALLOWLIST`:
     - `win32`: `['winget', ['install', 'Gitleaks.Gitleaks']]`
     - `darwin`: `['brew', ['install', 'gitleaks']]`
     - `linux`: `['go', ['install', 'github.com/gitleaks/gitleaks/v8@latest']]`
   - Esto permite reutilizar `getToolInstallSpec(tool, platform)` y `resolveTrustedBinaryPath(binaryName, rootDir)` de forma uniforme para los tres binarios sin duplicar tablas de comandos.
4. **`packages/core/src/doctor/security-tools-check.ts`**:
   - Exportar `SecurityToolsHealthCheck` con constructor:
     ```ts
     constructor(
       runner?: IProcessRunner,
       resolveBinary: (bin: string, rootDir?: string) => string | null = resolveTrustedBinaryPath,
       platform: NodeJS.Platform = process.platform
     )
     ```
   - Definir las herramientas a sondear con sus flags canónicos de versión:
     - `semgrep`: `['--version']`
     - `trivy`: `['--version']`
     - `gitleaks`: `['version']`
   - Para cada herramienta:
     1. Resolver ruta confiable mediante `this.resolveBinary(tool.name, rootDir)` (CWE-426: omite `.` y `rootDir`).
     2. Si devuelve `null`, emitir `DiagnosticFinding` con `id: WARN_SECURITY_TOOL_${TOOL}_MISSING`, `category: 'security_tools'`, `status: 'warn'`, y `remediation` desde `getToolInstallSpec(tool.name, this.platform)?.displayCommand`.
     3. Si existe ruta confiable, invocar `this.runner.execSafe(tool.name, [tool.flag], { cwd: rootDir, timeout: options.timeout })`.
     4. Si `res.exitCode !== 0` o `!res.stdout.trim()` o lanza excepción, pasar explícitamente `stderr` y mensajes de error por `redactSensitiveDiagnostics(text, rootDir)` (de `tool-installer.ts`) y `sanitizeDlpText` (de `security/dlp-sanitizer.ts`) antes de almacenarlos en `finding.details` / `finding.message`, emitiendo `DiagnosticFinding` con `id: WARN_SECURITY_TOOL_${TOOL}_ISSUE`, `category: 'security_tools'`, `status: 'warn'` y `remediation` canónico.
   - Retornar `CategoryReport` con `category: 'security_tools'`, `title: 'Optional Security CLIs (Semgrep, Trivy, Gitleaks)'`, `status: findings.length > 0 ? 'warn' : 'pass'`, `findings`. Nunca retorna `'fail'`.
5. **`packages/core/src/doctor/doctor-service.ts` y `packages/core/src/doctor/index.ts`**:
   - Registrar `private securityToolsCheck = new SecurityToolsHealthCheck();` en `DoctorOrchestrator` e invocar `categories.push(await this.securityToolsCheck.inspect(options));` dentro de `runAll(options)`.
   - Reexportar `SecurityToolsHealthCheck` desde `packages/core/src/doctor/index.ts`.
6. **CLI y Reporter (`packages/cli/src/commands/doctor.ts`, `packages/core/src/doctor/reporter.ts`)**:
   - `DoctorReporter.formatTerminal` imprime dinámicamente `[${cat.category.toUpperCase()}] ${cat.title}` sin diccionario estático de categorías; no requiere cambios funcionales, solo verificación en pruebas.
7. **Pruebas (`packages/core/tests/doctor.spec.ts` y `packages/core/tests/security-tools-check.spec.ts`)**:
   - `doctor.spec.ts` ya mockea `runCategoryChecks` en los tests de `DoctorService`; se añaden aserciones para la categoría `'security_tools'` asegurando que las pruebas no fallen en máquinas donde `semgrep`, `trivy` o `gitleaks` no estén instalados.

## 2. Umbrales de Calidad y Seguridad
- Todas las funciones nuevas o modificadas deben cumplir `CC <= 10`, `Cognitive <= 15`, `MI >= 50` y `Lines <= 100`.
- `aisdlc doctor` no instala herramientas ni realiza peticiones de red bajo ninguna opción (`--fix`, `--strict`, `--offline`).
- El reporte completo pasa por `sanitizeDlpPayload(report)` en `DoctorService.diagnose`.
