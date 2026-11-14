import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIVACY_POLICY,
  detectPolyglotLoggerCall,
  scanFileForPrivacyViolations,
  stripMaskingCalls,
  type PrivacyPolicy,
} from '../src/index.js';

describe('TSK-002: Polyglot PII-SAST logging, masking stripper & ReDoS-safe matching', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-polyglot-log-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('stripMaskingCalls', () => {
    it('strips masked/pseudonymized calls while preserving unmasked arguments and string-literal safety', () => {
      expect(stripMaskingCalls('logger.info("Hash:", pseudonymize(user.email))')).not.toContain(
        'user.email'
      );

      const mixed = stripMaskingCalls('logger.info("id=" + mask(user.id) + " email=" + user.email)');
      expect(mixed).not.toContain('user.id');
      expect(mixed).toContain('user.email');

      const fakeMaskInString = stripMaskingCalls('logger.info("mask(" + user.email + ")")');
      expect(fakeMaskInString).toContain('user.email');

      const nested = stripMaskingCalls('logger.info(mask(getId(user)), user.email)');
      expect(nested).not.toContain('getId(user)');
      expect(nested).toContain('user.email');

      const parenInStringInsideMask = stripMaskingCalls(
        'logger.info(mask(format(user.email, ")")))'
      );
      expect(parenInStringInsideMask).not.toContain('user.email');
    });
  });

  describe('detectPolyglotLoggerCall', () => {
    it('detects corporate logger calls across Python, .NET/C#, Java, Go, and JS/TS', () => {
      // Python
      expect(detectPolyglotLoggerCall('logging.info("user=%s", user.email)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('logger.error(f"failed {user.email}")')).not.toBeNull();
      expect(detectPolyglotLoggerCall('structlog.get_logger().info("login", email=email)')).not.toBeNull();

      // .NET / C#
      expect(detectPolyglotLoggerCall('_logger.LogInformation("p={p}", phoneNumber)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('Logger.LogError("err {e}", user.Email)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('Console.WriteLine(user.Email)')).not.toBeNull();

      // Java
      expect(detectPolyglotLoggerCall('LOGGER.info("id={}", nationalId);')).not.toBeNull();
      expect(detectPolyglotLoggerCall('LOG.warn("email=" + email);')).not.toBeNull();
      expect(detectPolyglotLoggerCall('System.out.println(user.getEmail());')).not.toBeNull();

      // Go
      expect(detectPolyglotLoggerCall('slog.Info("login", "email", user.Email)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('slog.InfoContext(ctx, "login", "email", user.Email)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('log.Info().Str("email", user.Email).Msg("login")')).not.toBeNull();
      expect(detectPolyglotLoggerCall('zap.L().Info("login", zap.String("email", email))')).not.toBeNull();
      expect(detectPolyglotLoggerCall('logrus.WithField("email", email).Info("login")')).not.toBeNull();

      // JS / TS
      expect(detectPolyglotLoggerCall('console.log("email:", user.email)')).not.toBeNull();
      expect(detectPolyglotLoggerCall('logger.info({ email: user.email })')).not.toBeNull();
    });
  });

  describe('scanFileForPrivacyViolations with polyglot loggers & disallowedLogFields', () => {
    const disallowedFields = new Map<string, string>([
      ['email', 'DATA-ASSET-USER-001'],
      ['phone_number', 'DATA-ASSET-USER-001'],
      ['national_id', 'DATA-ASSET-USER-001'],
      ['patient_diagnosis', 'DATA-ASSET-HEALTH-001'],
    ]);

    it('flags unmasked PII fields across Python, C#, Java, Go, and TS with normalized tokens', () => {
      const cases: Array<{ file: string; code: string }> = [
        { file: 'src/auth.py', code: 'logging.info("user=%s", user.email)\n' },
        { file: 'src/Auth.cs', code: '_logger.LogInformation("p={p}", user.PhoneNumber);\n' },
        { file: 'src/Auth.java', code: 'LOGGER.warn("id={}", user.getNationalId());\n' },
        { file: 'src/auth.go', code: 'slog.InfoContext(ctx, "login", "email", user.Email)\n' },
        {
          file: 'src/zero.go',
          code: 'log.Info().Str("diag", patientDiagnosis).Msg("intake")\n',
        },
        { file: 'src/auth.ts', code: 'logger.error("failed", req.phoneNumber);\n' },
      ];

      for (const testCase of cases) {
        const fullPath = path.join(tempDir, testCase.file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, testCase.code, 'utf-8');

        const violations = scanFileForPrivacyViolations(
          fullPath,
          tempDir,
          DEFAULT_PRIVACY_POLICY,
          disallowedFields
        );
        expect(violations.some((v) => v.ruleId === 'PRIV-001-PII-IN-LOGS')).toBe(true);
      }
    });

    it('tracks multi-line logger calls with nested parens and reports exact offending lineNumber', () => {
      const file = path.join(tempDir, 'src', 'multiline.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'const ok = true;', // line 1
          'logger.info(', // line 2
          '  mask(getId(user)),', // line 3 (masked)
          '  user.patientDiagnosis', // line 4 (offending!)
          ');', // line 5
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );

      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe('PRIV-001-PII-IN-LOGS');
      expect(violations[0].lineNumber).toBe(4);
    });

    it('does not flag masked calls, but catches unmasked siblings and fake string-literal masks', () => {
      const file = path.join(tempDir, 'src', 'masking.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'logger.info("Hash:", pseudonymize(user.email));', // line 1 -> 0 violations
          'logger.info("id=" + mask(user.id) + " email=" + user.email);', // line 2 -> violation
          'logger.info("mask(" + user.email + ")");', // line 3 -> violation
          'logger.info(mask(getId(user)), user.email);', // line 4 -> violation
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      const lineNumbers = violations.map((v) => v.lineNumber);

      expect(lineNumbers).not.toContain(1);
      expect(lineNumbers).toEqual([2, 3, 4]);
    });

    it('respects inline exemptions (ai-sdlc:allow-pii, ai-sdlc:allow-sast, nosec)', () => {
      const file = path.join(tempDir, 'src', 'exempt.py');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'logger.info(user.email) # ai-sdlc:allow-pii',
          'logger.info(user.phone_number) # ai-sdlc:allow-sast',
          'logger.info(user.national_id) # nosec',
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(0);
    });

    it('skips both static PRIV-001 and dynamic DATA-ASSET-* log checks when fail_on_pii_in_logs is false', () => {
      const file = path.join(tempDir, 'src', 'disabled.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        'console.log("diag:", user.patientDiagnosis, user.email);\n',
        'utf-8'
      );

      const disabledPolicy: PrivacyPolicy = {
        ...DEFAULT_PRIVACY_POLICY,
        ci_gates: {
          ...DEFAULT_PRIVACY_POLICY.ci_gates,
          fail_on_pii_in_logs: false,
        },
      };

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        disabledPolicy,
        disallowedFields
      );
      expect(violations.filter((v) => v.ruleId === 'PRIV-001-PII-IN-LOGS')).toHaveLength(0);
    });

    it('preserves 3-argument backward compatibility for scanFileForPrivacyViolations', () => {
      const file = path.join(tempDir, 'src', 'legacy-caller.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'console.info("User email:", user.email);\n', 'utf-8');

      const violations = scanFileForPrivacyViolations(file, tempDir, DEFAULT_PRIVACY_POLICY);
      expect(violations.some((v) => v.ruleId === 'PRIV-001-PII-IN-LOGS')).toBe(true);
    });

    it('strips masking calls inside template literal ${...} interpolations', () => {
      const file = path.join(tempDir, 'src', 'template-mask.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'logger.info(`email: ${mask(user.email)}`);\n', 'utf-8');

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(0);
    });

    it('catches multi-line zerolog/logrus chains with exact offending lineNumber', () => {
      const file = path.join(tempDir, 'src', 'zerolog-chain.go');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'log.Info().', // line 1
          '  Str("email", user.Email)', // line 2 -> violation
          'log.Info().Str("ok", "1").', // line 3
          '  Str("email", user.Email)', // line 4 -> violation
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations.map((v) => v.lineNumber)).toEqual([2, 4]);
    });

    it('ignores benign log message strings and trailing comments containing PII field names', () => {
      const file = path.join(tempDir, 'src', 'benign-strings-comments.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'logger.info("User email sent", user.id);',
          'logger.info("ok"); // email',
          'slog.Info("masked", "email", pseudonymize(user.email))',
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(0);
    });

    it('ignores trailing comments containing unbalanced parentheses when tracking parenDepth', () => {
      const file = path.join(tempDir, 'src', 'comment-paren.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'logger.info("ok", user.id); // (',
          'const x = user.email;',
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(0);
    });

    it('ignores PII fields inside multi-line mask(...) calls', () => {
      const file = path.join(tempDir, 'src', 'multiline-mask.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        [
          'logger.info(',
          '  mask(',
          '    user.email',
          '  )',
          ');',
        ].join('\n'),
        'utf-8'
      );

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(0);
    });

    it('detects PascalCase Get* getter methods like user.GetEmail() as email', () => {
      const file = path.join(tempDir, 'src', 'getter.go');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'slog.Info("user", "id", user.GetEmail())\n', 'utf-8');

      const violations = scanFileForPrivacyViolations(
        file,
        tempDir,
        DEFAULT_PRIVACY_POLICY,
        disallowedFields
      );
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("'email'");
    });
  });
});
