/**
 * Cites: FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
 * Tag: @FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { hasModalityDriverSignature } from '../src/verifiers/test-discovery.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

describe('Language-Agnostic Test Stack: Polyglot Web E2E Drivers & Single-Runtime QA Discipline (FR-068)', () => {
  it('hasModalityDriverSignature recognizes C# Microsoft.Playwright bindings', () => {
    expect(hasModalityDriverSignature('using Microsoft.Playwright;', 'web')).toBe(true);
    expect(hasModalityDriverSignature('public class LoginTests : PageTest {}', 'web')).toBe(true);
    expect(hasModalityDriverSignature('public async Task Run(IPage page) {}', 'web')).toBe(true);
    expect(hasModalityDriverSignature('await page.GotoAsync("/login");', 'web')).toBe(true);
    expect(hasModalityDriverSignature('await page.GetByRole(AriaRole.Button).ClickAsync();', 'web')).toBe(true);
    expect(hasModalityDriverSignature('await Expect(Page.Locator("h1")).ToBeVisibleAsync();', 'web')).toBe(true);
  });

  it('hasModalityDriverSignature recognizes Python Playwright bindings', () => {
    expect(hasModalityDriverSignature('from playwright.sync_api import sync_playwright', 'web')).toBe(true);
    expect(hasModalityDriverSignature('with sync_playwright() as p: pass', 'web')).toBe(true);
    expect(hasModalityDriverSignature('page.get_by_role("button", name="Submit").click()', 'web')).toBe(true);
  });

  it('hasModalityDriverSignature recognizes Go playwright-go bindings', () => {
    expect(hasModalityDriverSignature('import "github.com/playwright-community/playwright-go"', 'web')).toBe(true);
    expect(hasModalityDriverSignature('browser, err := pw.Chromium.Launch()', 'web')).toBe(true);
    expect(hasModalityDriverSignature('_, err = page.Goto("http://localhost:3000")', 'web')).toBe(true);
  });

  it('hasModalityDriverSignature recognizes Rust playwright crate bindings', () => {
    expect(hasModalityDriverSignature('let pw = playwright::Playwright::initialize().await?;', 'web')).toBe(true);
    expect(hasModalityDriverSignature('page.goto_builder("http://localhost:3000").goto().await?;', 'web')).toBe(true);
  });

  it('hasModalityDriverSignature rejects comment-only and plain stub tests without Web E2E driver signatures', () => {
    expect(hasModalityDriverSignature('// using Microsoft.Playwright; await Page.GotoAsync("/");', 'web')).toBe(false);
    expect(hasModalityDriverSignature('# from playwright.sync_api import sync_playwright', 'web')).toBe(false);
    expect(hasModalityDriverSignature('/* playwright-go pw.Chromium */', 'web')).toBe(false);
    expect(hasModalityDriverSignature('[Fact] public void Login_Works() { Assert.True(true); }', 'web')).toBe(false);
    expect(hasModalityDriverSignature('test("Login renders", () => { expect(true).toBe(true); });', 'web')).toBe(false);
  });

  it('QA directives and agent templates enforce language-agnostic single-runtime QA discipline unless approved by an ADR', () => {
    const filesToCheck = [
      '.agent/agents/agent-qa-engineer.md',
      '.agent/rules/ai-sdlc-testing.md',
      'packages/core/src/init/agent-templates.ts',
    ];

    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
      expect(content, `${relPath} must mention secondary test runtime prohibition`).toMatch(
        /secondary\s+(?:test\s+)?runtime/i
      );
      expect(content, `${relPath} must forbid/prohibit secondary runtime`).toMatch(
        /forbid|prohibit|strictly forbidden|never introduce/i
      );
      expect(content, `${relPath} must allow exception only when approved by an ADR`).toMatch(/ADR/i);
    }
  });
});
