import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { verifyQualityGate } from '../src/verifiers/quality-gate.js';

describe('Generalized UI Component & Per-Method Test Enforcement', () => {
  it('activates require_function_unit_tests and require_ui_component_tests from quality-policy.yaml across Web, Desktop, Console/TUI, and Mobile', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-ui-enf-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'quality-policy.yaml'),
        [
          'version: "1.0"',
          'project: "Polyglot UI App"',
          'enforcement_mode: "STRICT"',
          'scope:',
          '  target_directories: ["src"]',
          'thresholds:',
          '  test_enforcement:',
          '    require_function_unit_tests: true',
          '    require_ui_component_tests: true',
        ].join('\n'),
        'utf-8'
      );

      // 1. Create UI components across 4 modalities + 1 domain function
      fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'src', 'windows'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'src', 'tui'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'src', 'screens'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests', 'unit'), { recursive: true });

      fs.writeFileSync(
        path.join(tmpDir, 'src', 'components', 'LoginModal.tsx'),
        'export function LoginModal() { return null; }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'windows', 'MainWindow.cs'),
        'public class MainWindow { public void Render() {} }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'tui', 'StatusView.py'),
        'def render_status():\n    return "ok"\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'screens', 'ProfileScreen.kt'),
        'class ProfileScreen {}\n',
        'utf-8'
      );

      // Unit tests for all functions so only UI component tests are missing
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'unit', 'all.spec.ts'),
        'LoginModal(); Render(); render_status();\n',
        'utf-8'
      );

      const blocked = verifyQualityGate({ rootDir: tmpDir });
      expect(blocked.success).toBe(false);
      expect(blocked.untestedFunctions).toEqual([]);
      expect(blocked.untestedUiComponents?.map((c) => c.componentName).sort()).toEqual([
        'LoginModal',
        'MainWindow',
        'ProfileScreen',
        'StatusView',
      ]);

      // 2. Add UI/E2E tests for each modality (Playwright, FlaUI, CLI/TUI, Maestro)
      fs.mkdirSync(path.join(tmpDir, 'tests', 'e2e'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests', 'desktop'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests', 'cli'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests', 'mobile'), { recursive: true });

      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'e2e', 'login-modal.spec.ts'),
        'test("LoginModal nominal", async ({ page }) => { await page.getByTestId("login-modal").click(); });\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'desktop', 'MainWindowTests.cs'),
        'public class MainWindowTests { /* FlaUI MainWindow */ }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'cli', 'test_status_view.py'),
        'def test_status_view(): assert "StatusView"\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'mobile', 'profile-screen.yaml'),
        'appId: com.example.app\n---\n- assertVisible: "ProfileScreen"\n',
        'utf-8'
      );

      const passed = verifyQualityGate({ rootDir: tmpDir });
      expect(passed.success).toBe(true);
      expect(passed.untestedUiComponents).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('supports custom ui_component_patterns and ui_test_patterns in quality-policy.yaml', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-ui-custom-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'quality-policy.yaml'),
        [
          'version: "1.0"',
          'project: "Custom UI App"',
          'enforcement_mode: "STRICT"',
          'scope:',
          '  target_directories: ["src"]',
          'thresholds:',
          '  test_enforcement:',
          '    require_ui_component_tests: true',
          '    ui_component_patterns: ["**/panels/**"]',
          '    ui_test_patterns: ["tests/flaui/**"]',
        ].join('\n'),
        'utf-8'
      );

      fs.mkdirSync(path.join(tmpDir, 'src', 'panels'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'panels', 'OrdersPanel.cs'), 'class OrdersPanel {}\n', 'utf-8');

      const blocked = verifyQualityGate({ rootDir: tmpDir });
      expect(blocked.success).toBe(false);
      expect(blocked.untestedUiComponents).toEqual([
        { file: 'src/panels/OrdersPanel.cs', componentName: 'OrdersPanel' },
      ]);

      fs.mkdirSync(path.join(tmpDir, 'tests', 'flaui'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'flaui', 'OrdersPanelFlaUITests.cs'),
        'class OrdersPanelFlaUITests { /* OrdersPanel */ }\n',
        'utf-8'
      );

      const passed = verifyQualityGate({ rootDir: tmpDir });
      expect(passed.success).toBe(true);
      expect(passed.untestedUiComponents).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
