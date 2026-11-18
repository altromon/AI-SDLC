/**
 * RED Phase Unit & Contract Tests — Deterministic Polyglot UI and E2E Modality Test Gate
 * Traceability: FR-063-UI-E2E-MODALITY-GATE-001, UC-063-UI-E2E-MODALITY-GATE, CMP-063-UI-E2E-MODALITY-GATE
 * Task: TSK-063-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  createDefaultQualityPolicy,
  extractUiComponentName,
  isUiComponentTested,
  verifyQualityGate,
} from '../src/verifiers/quality-gate.js';
import {
  detectUiComponentModality,
  hasModalityDriverSignature,
  inferFallbackUiModality,
  isUiComponentFile,
  isUiTestFile,
  stripTestComments,
} from '../src/verifiers/test-discovery.js';

function createTempWorkspace(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeWorkspaceFile(rootDir: string, relPath: string, content: string): void {
  const fullPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

describe('FR-063-UI-E2E-MODALITY-GATE-001 / CMP-063-UI-E2E-MODALITY-GATE: Deterministic Polyglot UI & E2E Modality Gate', () => {
  describe('Default Policy Activation (UC-063-UI-E2E-MODALITY-GATE)', () => {
    it('enables require_ui_component_tests by default in createDefaultQualityPolicy()', () => {
      const policy = createDefaultQualityPolicy();
      expect(policy.require_ui_component_tests).toBe(true);
    });

    it('enforces UI component tests in STRICT mode when quality-policy.yaml omits test_enforcement', () => {
      const tmpDir = createTempWorkspace('ai-sdlc-chg063-default-');
      try {
        writeWorkspaceFile(
          tmpDir,
          'quality-policy.yaml',
          [
            'version: "1.0"',
            'project: "Default UI Policy App"',
            'enforcement_mode: "STRICT"',
            'scope:',
            '  target_directories: ["src"]',
          ].join('\n')
        );
        writeWorkspaceFile(
          tmpDir,
          'src/components/CheckoutPanel.tsx',
          'export function CheckoutPanel() { return null; }\n'
        );

        const blocked = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(blocked.policy.require_ui_component_tests).toBe(true);
        expect(blocked.success).toBe(false);
        expect(blocked.untestedUiComponents).toEqual([
          { file: 'src/components/CheckoutPanel.tsx', componentName: 'CheckoutPanel' },
        ]);

        writeWorkspaceFile(
          tmpDir,
          'tests/e2e/checkout-panel.e2e.ts',
          [
            "import { test, expect } from '@playwright/test';",
            "test('CheckoutPanel nominal', async ({ page }) => {",
            "  await page.goto('http://localhost:3000/checkout');",
            "  await expect(page.getByTestId('CheckoutPanel')).toBeVisible();",
            '});',
          ].join('\n')
        );

        const passed = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(passed.policy.require_ui_component_tests).toBe(true);
        expect(passed.untestedUiComponents).toEqual([]);
        expect(passed.success).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('4-Modality UI Component Discovery (isUiComponentFile)', () => {
    it('discovers Web UI components across React, Vue, Svelte, Angular, Blazor, and Razor', () => {
      const webComponents = [
        'src/components/CheckoutPanel.tsx',
        'src/components/SubmitButton.jsx',
        'src/pages/LoginView.vue',
        'src/views/NavBar.svelte',
        'src/app/header.component.ts',
        'src/Pages/Orders.razor',
        'src/Views/Home.cshtml',
      ];
      for (const file of webComponents) {
        expect(isUiComponentFile(file), `expected web component: ${file}`).toBe(true);
      }
    });

    it('discovers Desktop UI components across WPF, WinForms, Avalonia, and XAML code-behind', () => {
      const desktopComponents = [
        'src/windows/MainWindow.cs',
        'src/windows/MainWindow.xaml',
        'src/views/MainWindow.axaml',
        'src/views/OrderEditor.xaml.cs',
        'src/views/OrderEditor.axaml.cs',
        'src/windows/SettingsDialog.cs',
      ];
      for (const file of desktopComponents) {
        expect(isUiComponentFile(file), `expected desktop component: ${file}`).toBe(true);
      }
    });

    it('discovers Console CLI/TUI components while excluding non-component auxiliary files', () => {
      const consoleComponents = [
        'src/cli/run.ts',
        'src/commands/deploy.ts',
        'src/console/menu.ts',
        'src/tui/dashboard.ts',
        'src/DoctorCommand.ts',
        'src/SyncCli.cs',
      ];
      for (const file of consoleComponents) {
        expect(isUiComponentFile(file), `expected console component: ${file}`).toBe(true);
      }

      const auxiliaryFiles = [
        'src/tui/app.ts',
        'src/cli/cli.ts',
        'src/cli/index.ts',
        'src/components/types.ts',
      ];
      for (const file of auxiliaryFiles) {
        expect(isUiComponentFile(file), `expected non-component auxiliary excluded: ${file}`).toBe(false);
      }
    });

    it('discovers Mobile UI components across Android Kotlin, iOS Swift, and Flutter Dart', () => {
      const mobileComponents = [
        'src/screens/ProfileScreen.kt',
        'src/views/LoginView.swift',
        'src/pages/SettingsPage.dart',
        'src/widgets/UserAvatarWidget.dart',
      ];
      for (const file of mobileComponents) {
        expect(isUiComponentFile(file), `expected mobile component: ${file}`).toBe(true);
      }
    });
  });

  describe('2-Tier Modality Precedence (detectUiComponentModality & extractUiComponentName)', () => {
    it('gives Tier 1 unambiguous extensions/suffixes precedence over Tier 2 directory globs (ADV-CHG-063-002 PoCs)', () => {
      expect(detectUiComponentModality('src/dialogs/ConfirmDialog.tsx')).toBe('web');
      expect(detectUiComponentModality('src/screens/LoginScreen.tsx')).toBe('web');
      expect(detectUiComponentModality('src/commands/CommandPalette.tsx')).toBe('web');
      expect(detectUiComponentModality('packages/cli/src/components/ReportView.tsx')).toBe('web');
      expect(detectUiComponentModality('src/views/OrderEditor.xaml.cs')).toBe('desktop');
      expect(detectUiComponentModality('src/views/OrderEditor.axaml.cs')).toBe('desktop');
      expect(detectUiComponentModality('src/widgets/UserAvatar.dart')).toBe('mobile');
      expect(detectUiComponentModality('src/views/LoginView.swift')).toBe('mobile');
      expect(detectUiComponentModality('src/components/DoctorCommand.ts')).toBe('console');
    });

    it('resolves Tier 2 directory globs for generic extensions and returns null for non-UI files', () => {
      expect(detectUiComponentModality('src/tui/app.ts')).toBe('console');
      expect(detectUiComponentModality('src/cli/run.ts')).toBe('console');
      expect(detectUiComponentModality('src/commands/deploy.ts')).toBe('console');
      expect(detectUiComponentModality('src/console/menu.ts')).toBe('console');
      expect(detectUiComponentModality('src/windows/CustomHost.py')).toBe('desktop');
      expect(detectUiComponentModality('src/dialogs/ConfirmPrompt.py')).toBe('desktop');
      expect(detectUiComponentModality('src/screens/OnboardingFlow.ts')).toBe('mobile');
      expect(detectUiComponentModality('src/components/DatePicker.ts')).toBe('web');
      expect(detectUiComponentModality('src/domain/calculator.ts')).toBeNull();
    });

    it('normalizes composite and polyglot extensions in extractUiComponentName()', () => {
      expect(extractUiComponentName('src/views/OrderEditor.xaml.cs')).toBe('OrderEditor');
      expect(extractUiComponentName('src/views/OrderEditor.axaml.cs')).toBe('OrderEditor');
      expect(extractUiComponentName('src/app/header.component.ts')).toBe('header');
      expect(extractUiComponentName('src/Pages/Orders.razor')).toBe('Orders');
      expect(extractUiComponentName('src/Views/Home.cshtml')).toBe('Home');
      expect(extractUiComponentName('src/windows/MainWindow.xaml')).toBe('MainWindow');
      expect(extractUiComponentName('src/screens/ProfileScreen.dart')).toBe('ProfileScreen');
    });
  });

  describe('Monorepo-Compatible UI/E2E Test File Discovery (isUiTestFile)', () => {
    it('recognizes monorepo and 4-modality UI/E2E test file paths', () => {
      const uiTestPaths = [
        'packages/cli/tests/check.spec.ts',
        'tests/cli/doctor.cli.spec.ts',
        'tests/console/menu-cli.test.ts',
        'tests/desktop/MainWindowFlaUITests.cs',
        'tests/e2e/login.e2e.ts',
        'packages/web/tests/e2e/checkout.e2e.ts',
        'tests/mobile/HomeScreenWidgetTest.dart',
      ];
      for (const testPath of uiTestPaths) {
        expect(isUiTestFile(testPath), `expected UI test file: ${testPath}`).toBe(true);
      }
      expect(isUiTestFile('tests/unit/calculator.spec.ts')).toBe(false);
    });
  });

  describe('Comment Stripping (stripTestComments)', () => {
    it('strips block, HTML, line, and hash comments while preserving http:// and https:// URLs', () => {
      const input = [
        '/* block comment with @playwright/test and LoginView */',
        '<!-- html comment with FlaUI -->',
        '// line comment mentioning MainWindow',
        '# python comment mentioning CliRunner',
        "await page.goto('http://localhost:3000/login');",
        "await page.goto('https://example.com/checkout'); // trailing comment",
      ].join('\n');

      const cleaned = stripTestComments(input);
      expect(cleaned).not.toContain('block comment');
      expect(cleaned).not.toContain('html comment');
      expect(cleaned).not.toContain('line comment');
      expect(cleaned).not.toContain('python comment');
      expect(cleaned).not.toContain('trailing comment');
      expect(cleaned).toContain("http://localhost:3000/login");
      expect(cleaned).toContain("https://example.com/checkout");
    });

    it('handles large newline payloads in linear time without ReDoS (ADV-CHG-063-C2-001)', () => {
      const start = performance.now();
      const cleaned = stripTestComments('\n'.repeat(20000));
      const elapsedMs = performance.now() - start;
      expect(cleaned.length).toBe(20000);
      expect(elapsedMs).toBeLessThan(100);
    });

    it('strips inline # comments while preserving quoted CSS selectors like "#submit" (ADV-CHG-063-C2-002)', () => {
      const playwrightSnippet = "await page.locator('#submit').click();  # inline comment with CliRunner";
      const cleaned = stripTestComments(playwrightSnippet);
      expect(cleaned).toContain("'#submit'");
      expect(cleaned).not.toContain('CliRunner');

      expect(
        isUiComponentTested(
          'DoctorCommand',
          [{ relPath: 'tests/cli/test_cli_doctor.py', content: 'assert True  # CliRunner DoctorCommand' }],
          'console',
          true
        )
      ).toBe(false);
      expect(
        isUiComponentTested(
          'ProfileScreen',
          [{ relPath: 'tests/mobile/profile.yaml', content: 'name: stub  # appId: com.example ProfileScreen' }],
          'mobile',
          true
        )
      ).toBe(false);
    });

    it('infers fallback modality by file extension directly via inferFallbackUiModality()', () => {
      expect(inferFallbackUiModality('src/panels/OrdersPanel.cs')).toBe('desktop');
      expect(inferFallbackUiModality('src/panels/OrdersPanel.xaml')).toBe('desktop');
      expect(inferFallbackUiModality('src/tools/status.py')).toBe('console');
      expect(inferFallbackUiModality('cmd/sync/main.go')).toBe('console');
      expect(inferFallbackUiModality('src/bin/runner.rs')).toBe('console');
      expect(inferFallbackUiModality('src/ui/Home.kt')).toBe('mobile');
      expect(inferFallbackUiModality('src/ui/Home.swift')).toBe('mobile');
      expect(inferFallbackUiModality('src/ui/Home.dart')).toBe('mobile');
      expect(inferFallbackUiModality('src/ui/Widget.ts')).toBe('web');
      expect(inferFallbackUiModality('src/ui/Widget.js')).toBe('web');
    });
  });

  describe('Modality Driver Signatures (hasModalityDriverSignature)', () => {
    it('detects authentic Web E2E/DOM driver signatures and rejects stubs/comments', () => {
      expect(hasModalityDriverSignature("import { test } from '@playwright/test'; await page.goto('http://localhost:3000');", 'web')).toBe(true);
      expect(hasModalityDriverSignature("cy.visit('https://example.com/login');", 'web')).toBe(true);
      expect(hasModalityDriverSignature("render(<CheckoutPanel />); expect(screen.getByText('Pay')).toBeTruthy();", 'web')).toBe(true);
      expect(hasModalityDriverSignature('// @playwright/test page.goto', 'web')).toBe(false);
      expect(hasModalityDriverSignature("expect('CheckoutPanel').toBe('CheckoutPanel');", 'web')).toBe(false);
    });

    it('detects authentic Desktop automation signatures and rejects bare Window token or comments', () => {
      expect(hasModalityDriverSignature('using FlaUI.UIA3; var app = Application.Launch("app.exe");', 'desktop')).toBe(true);
      expect(hasModalityDriverSignature('var driver = new WindowsDriver<WindowsElement>(uri, opts);', 'desktop')).toBe(true);
      expect(hasModalityDriverSignature('using Avalonia.Headless; var btn = view.FindFirstDescendant();', 'desktop')).toBe(true);
      expect(hasModalityDriverSignature('public class MainWindowTests { var Window = "MainWindow"; }', 'desktop')).toBe(false);
      expect(hasModalityDriverSignature('/* FlaUI Application.Launch */', 'desktop')).toBe(false);
    });

    it('detects authentic Console CLI/TUI driver signatures and rejects bare console.log or comments', () => {
      expect(hasModalityDriverSignature("import { execFileSync } from 'child_process'; execFileSync('node', ['doctor']);", 'console')).toBe(true);
      expect(hasModalityDriverSignature('var app = new CommandAppTester(); // Spectre.Console.Testing', 'console')).toBe(true);
      expect(hasModalityDriverSignature('from click.testing import CliRunner\nrunner = CliRunner()', 'console')).toBe(true);
      expect(hasModalityDriverSignature("const spy = vi.spyOn(console, 'log'); runDoctorCommand();", 'console')).toBe(true);
      expect(hasModalityDriverSignature('console.log("DoctorCommand");', 'console')).toBe(false);
      expect(hasModalityDriverSignature('# CliRunner DoctorCommand', 'console')).toBe(false);
      expect(hasModalityDriverSignature("/DoctorCommand/.exec('DoctorCommand');", 'console')).toBe(false);
    });

    it('detects authentic Mobile E2E/widget driver signatures and rejects stubs/comments', () => {
      expect(hasModalityDriverSignature("testWidgets('ProfileScreen', (WidgetTester tester) async { await tester.tap(find.byKey(k)); });", 'mobile')).toBe(true);
      expect(hasModalityDriverSignature('let app = XCUIApplication(); app.launch()', 'mobile')).toBe(true);
      expect(hasModalityDriverSignature('onView(withId(R.id.profile)).check(matches(isDisplayed()))', 'mobile')).toBe(true);
      expect(hasModalityDriverSignature('appId: com.example.app\n---\n- assertVisible: "ProfileScreen"', 'mobile')).toBe(true);
      expect(hasModalityDriverSignature('await element(by.id("ProfileScreen")).tap();', 'mobile')).toBe(true);
      expect(hasModalityDriverSignature('# WidgetTester ProfileScreen', 'mobile')).toBe(false);
      expect(hasModalityDriverSignature('assert "ProfileScreen" == "ProfileScreen"', 'mobile')).toBe(false);
    });
  });

  describe('Stub & Bypass Rejection (isUiComponentTested & verifyQualityGate)', () => {
    it('rejects stub tests without driver signature, comment-only refs, filename-only matches, bare console.log, and bare Window token', () => {
      // 1. Stub mentioning component name without real driver
      expect(
        isUiComponentTested(
          'CheckoutPanel',
          [{ relPath: 'tests/e2e/checkout-panel.e2e.ts', content: 'const name = "CheckoutPanel"; expect(true).toBe(true);' }],
          'web',
          true
        )
      ).toBe(false);

      // 2. Comment-only reference (Web & Console)
      expect(
        isUiComponentTested(
          'LoginView',
          [{ relPath: 'tests/e2e/login.e2e.ts', content: '// @playwright/test LoginView\nexpect(1).toBe(1);' }],
          'web',
          true
        )
      ).toBe(false);
      expect(
        isUiComponentTested(
          'DoctorCommand',
          [{ relPath: 'tests/cli/test_cli_doctor.py', content: '# CliRunner DoctorCommand\nassert True' }],
          'console',
          true
        )
      ).toBe(false);

      // 3. Filename-only match with no component reference in body
      expect(
        isUiComponentTested(
          'CheckoutPanel',
          [{ relPath: 'tests/e2e/checkout-panel.e2e.ts', content: "import { test } from '@playwright/test'; await page.goto('http://localhost:3000');" }],
          'web',
          true
        )
      ).toBe(false);

      // 4. Bare console.log("DoctorCommand") stub
      expect(
        isUiComponentTested(
          'DoctorCommand',
          [{ relPath: 'tests/cli/doctor.cli.spec.ts', content: 'console.log("DoctorCommand"); expect(true).toBe(true);' }],
          'console',
          true
        )
      ).toBe(false);

      // 5. Bare Window token without FlaUI/desktop driver
      expect(
        isUiComponentTested(
          'MainWindow',
          [{ relPath: 'tests/desktop/MainWindowUiTest.cs', content: 'public class MainWindowTests { var w = "MainWindow"; }' }],
          'desktop',
          true
        )
      ).toBe(false);
    });

    it('passes all 4 modalities in verifyQualityGate when canonical E2E driver signatures are present', () => {
      const tmpDir = createTempWorkspace('ai-sdlc-chg063-4mod-');
      try {
        writeWorkspaceFile(
          tmpDir,
          'quality-policy.yaml',
          [
            'version: "1.0"',
            'project: "4-Modality App"',
            'enforcement_mode: "STRICT"',
            'scope:',
            '  target_directories: ["src"]',
          ].join('\n')
        );

        writeWorkspaceFile(tmpDir, 'src/pages/LoginView.vue', '<template><div>Login</div></template>\n');
        writeWorkspaceFile(tmpDir, 'src/windows/MainWindow.xaml', '<Window x:Class="MainWindow"></Window>\n');
        writeWorkspaceFile(tmpDir, 'src/commands/DoctorCommand.ts', 'export function runDoctor() { return 0; }\n');
        writeWorkspaceFile(tmpDir, 'src/screens/ProfileScreen.dart', 'class ProfileScreen {}\n');

        writeWorkspaceFile(
          tmpDir,
          'tests/e2e/login-view.e2e.ts',
          "import { test } from '@playwright/test'; test('LoginView', async ({ page }) => { await page.goto('http://localhost:3000/login'); });\n"
        );
        writeWorkspaceFile(
          tmpDir,
          'tests/desktop/MainWindowFlaUITest.cs',
          'using FlaUI.UIA3; public class MainWindowFlaUITest { public void Run() { var app = Application.Launch("app.exe"); var name = "MainWindow"; } }\n'
        );
        writeWorkspaceFile(
          tmpDir,
          'tests/cli/doctor-command.e2e.ts',
          "import { execFileSync } from 'child_process'; execFileSync('node', ['DoctorCommand']);\n"
        );
        writeWorkspaceFile(
          tmpDir,
          'tests/mobile/ProfileScreenWidgetTest.dart',
          "void main() { testWidgets('ProfileScreen', (WidgetTester tester) async { await tester.tap(find.byKey(key)); }); }\n"
        );

        const result = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(result.untestedUiComponents).toEqual([]);
        expect(result.success).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('infers fallback modality by extension for custom ui_component_patterns (src/panels/OrdersPanel.cs -> desktop)', () => {
      const tmpDir = createTempWorkspace('ai-sdlc-chg063-custom-');
      try {
        writeWorkspaceFile(
          tmpDir,
          'quality-policy.yaml',
          [
            'version: "1.0"',
            'project: "Custom Panels App"',
            'enforcement_mode: "STRICT"',
            'scope:',
            '  target_directories: ["src"]',
            'thresholds:',
            '  test_enforcement:',
            '    require_ui_component_tests: true',
            '    ui_component_patterns: ["**/panels/**"]',
            '    ui_test_patterns: ["tests/flaui/**"]',
          ].join('\n')
        );

        writeWorkspaceFile(tmpDir, 'src/panels/OrdersPanel.cs', 'public class OrdersPanel {}\n');
        writeWorkspaceFile(
          tmpDir,
          'tests/flaui/OrdersPanelFlaUITests.cs',
          'public class OrdersPanelFlaUITests { var x = "OrdersPanel"; }\n'
        );

        const stubBlocked = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(stubBlocked.success).toBe(false);
        expect(stubBlocked.untestedUiComponents).toEqual([
          { file: 'src/panels/OrdersPanel.cs', componentName: 'OrdersPanel' },
        ]);

        writeWorkspaceFile(
          tmpDir,
          'tests/flaui/OrdersPanelFlaUITests.cs',
          'using FlaUI.UIA3; public class OrdersPanelFlaUITests { void Run() { Application.Launch("app.exe"); var target = "OrdersPanel"; } }\n'
        );

        const passed = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(passed.success).toBe(true);
        expect(passed.untestedUiComponents).toEqual([]);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('supports opting out of driver signature checks via verify_ui_driver_signatures: false', () => {
      const tmpDir = createTempWorkspace('ai-sdlc-chg063-optout-');
      try {
        writeWorkspaceFile(
          tmpDir,
          'quality-policy.yaml',
          [
            'version: "1.0"',
            'project: "Driver Opt-Out App"',
            'enforcement_mode: "STRICT"',
            'scope:',
            '  target_directories: ["src"]',
            'thresholds:',
            '  test_enforcement:',
            '    require_ui_component_tests: true',
            '    verify_ui_driver_signatures: false',
          ].join('\n')
        );

        writeWorkspaceFile(tmpDir, 'src/windows/SettingsDialog.cs', 'public class SettingsDialog {}\n');
        writeWorkspaceFile(
          tmpDir,
          'tests/desktop/SettingsDialogUiTest.cs',
          'public class SettingsDialogUiTest { var target = "SettingsDialog"; }\n'
        );

        const result = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });
        expect(result.policy.verify_ui_driver_signatures).toBe(false);
        expect(result.untestedUiComponents).toEqual([]);
        expect(result.success).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
