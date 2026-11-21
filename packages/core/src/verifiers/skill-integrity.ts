/**
 * Skill Integrity Verifier
 * Validates SKILL.md YAML frontmatter and relative ./references/*.md links.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface SkillIntegrityViolation {
  skillFile: string;
  code: 'MISSING_FRONTMATTER' | 'INVALID_NAME' | 'MISSING_DESCRIPTION' | 'BROKEN_REFERENCE';
  message: string;
}

export interface SkillIntegrityResult {
  success: boolean;
  checkedSkills: number;
  violations: SkillIntegrityViolation[];
}

function parseSkillFrontmatter(content: string): Record<string, unknown> | null {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function extractReferenceLinks(content: string): string[] {
  const links = new Set<string>();
  const regex = /\(\.\/(references\/[^)\s]+\.md)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    links.add(match[1]);
  }
  return Array.from(links);
}

function validateSingleSkill(skillDir: string, rootDir: string, expectedName: string): SkillIntegrityViolation[] {
  const skillFile = path.join(skillDir, 'SKILL.md');
  const relSkillFile = path.relative(rootDir, skillFile).replace(/\\/g, '/');
  if (!fs.existsSync(skillFile)) return [];

  const content = fs.readFileSync(skillFile, 'utf-8');
  const fm = parseSkillFrontmatter(content);
  if (!fm) {
    return [{ skillFile: relSkillFile, code: 'MISSING_FRONTMATTER', message: 'Missing or invalid YAML frontmatter' }];
  }

  const violations: SkillIntegrityViolation[] = [];
  if (typeof fm.name !== 'string' || fm.name.trim() !== expectedName) {
    violations.push({ skillFile: relSkillFile, code: 'INVALID_NAME', message: `Frontmatter name must match '${expectedName}'` });
  }
  if (typeof fm.description !== 'string' || fm.description.trim().length < 10) {
    violations.push({ skillFile: relSkillFile, code: 'MISSING_DESCRIPTION', message: 'Frontmatter description is missing or too short' });
  }

  for (const refRel of extractReferenceLinks(content)) {
    if (!fs.existsSync(path.join(skillDir, refRel))) {
      violations.push({ skillFile: relSkillFile, code: 'BROKEN_REFERENCE', message: `Referenced file './${refRel}' does not exist` });
    }
  }
  return violations;
}

export function verifySkillsIntegrity(rootDir: string = process.cwd()): SkillIntegrityResult {
  const resolvedRoot = path.resolve(rootDir);
  const roots = [path.join(resolvedRoot, '.agent', 'skills'), path.join(resolvedRoot, '.claude', 'skills')];
  const violations: SkillIntegrityViolation[] = [];
  let checkedSkills = 0;

  for (const skillsRoot of roots) {
    if (!fs.existsSync(skillsRoot)) continue;
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(skillsRoot, entry.name);
      if (fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
        checkedSkills++;
        violations.push(...validateSingleSkill(skillDir, resolvedRoot, entry.name));
      }
    }
  }

  return { success: violations.length === 0, checkedSkills, violations };
}
