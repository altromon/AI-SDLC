import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifySkillsIntegrity } from '../src/verifiers/skill-integrity.js';

describe('Skill Integrity Verifier (Frontmatter & References)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-skill-integrity-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when SKILL.md has valid frontmatter and all ./references/*.md exist', () => {
    const skillDir = path.join(tmpDir, '.agent', 'skills', 'sample-skill');
    fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'references', 'guide.md'), '# Guide\n', 'utf-8');
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: sample-skill\ndescription: Use this skill when testing integrity.\n---\n\nSee [guide](./references/guide.md).\n',
      'utf-8'
    );

    const res = verifySkillsIntegrity(tmpDir);
    expect(res.success).toBe(true);
    expect(res.checkedSkills).toBe(1);
    expect(res.violations).toEqual([]);
  });

  it('detects missing frontmatter, mismatched name, short description, and broken reference links', () => {
    const badFmDir = path.join(tmpDir, '.agent', 'skills', 'no-fm');
    fs.mkdirSync(badFmDir, { recursive: true });
    fs.writeFileSync(path.join(badFmDir, 'SKILL.md'), '# No frontmatter\n', 'utf-8');

    const brokenRefDir = path.join(tmpDir, '.claude', 'skills', 'broken-ref');
    fs.mkdirSync(brokenRefDir, { recursive: true });
    fs.writeFileSync(
      path.join(brokenRefDir, 'SKILL.md'),
      '---\nname: wrong-name\ndescription: short\n---\n\nSee [missing](./references/missing.md).\n',
      'utf-8'
    );

    const res = verifySkillsIntegrity(tmpDir);
    expect(res.success).toBe(false);
    expect(res.checkedSkills).toBe(2);
    expect(res.violations.map((v) => v.code)).toEqual(
      expect.arrayContaining(['MISSING_FRONTMATTER', 'INVALID_NAME', 'MISSING_DESCRIPTION', 'BROKEN_REFERENCE'])
    );
  });
});
