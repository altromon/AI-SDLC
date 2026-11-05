import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { collectCodingRulesBypassViolations } from '../src/verifiers/coding-rules-bypass.js';

let tmp = '';
function setup(files: Record<string, string>): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crb-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), content);
  }
  return tmp;
}
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('coding rules bypass scanner', () => {
  it('returns nothing when no strict rules are deployed', () => {
    expect(collectCodingRulesBypassViolations(setup({ 'a/x.csproj': '<TreatWarningsAsErrors>false</TreatWarningsAsErrors>' }))).toEqual([]);
  });

  it('flags csproj weakening and nested Directory.Build.props without parent import', () => {
    const root = setup({
      'Directory.Build.props': '<Project/>',
      'src/Api/Api.csproj': '<Nullable>disable</Nullable>',
      'src/Api/Directory.Build.props': '<Project/>',
    });
    const v = collectCodingRulesBypassViolations(root);
    expect(v).toHaveLength(2);
  });

  it('accepts nested Directory.Build.props importing the parent', () => {
    const root = setup({
      'Directory.Build.props': '<Project/>',
      'src/Directory.Build.props': '<Import Project="$([MSBuild]::GetPathOfFileAbove(\'Directory.Build.props\', \'$(MSBuildThisFileDirectory)../\'))" />',
    });
    expect(collectCodingRulesBypassViolations(root)).toEqual([]);
  });

  it('flags tsconfig weakening when tsconfig.strict.json exists', () => {
    const root = setup({ 'tsconfig.strict.json': '{}', 'tsconfig.json': '{"extends":"./tsconfig.strict.json","compilerOptions":{"strict": false}}' });
    expect(collectCodingRulesBypassViolations(root)).toHaveLength(1);
  });
});