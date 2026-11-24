/**
 * Cites: FR-027-NORMALIZE-IDE-RULESETS-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001
 * Tag: @FR-027-NORMALIZE-IDE-RULESETS-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AISDLC_MANIFEST_FILENAME } from '../src/version.js';
import {
  LIFECYCLE_SKILL_TEMPLATES,
  PROTECTED_CODING_RULES_FILES,
  SPECIALIZED_AGENT_TEMPLATES,
  VALID_AGENT_TARGETS,
  appendAntigravityFiles,
  appendClaudeFiles,
  appendCopilotFiles,
  appendCursorFiles,
  appendHierarchicalAgentsMd,
  appendMcpFiles,
  appendSkillReferenceFiles,
  assembleScaffoldingPlan,
  buildInitError,
  buildInitSuccessResult,
  collectAgentFiles,
  collectArchitectureTemplateFiles,
  collectPolicyAndSchemaFiles,
  collectStarterFiles,
  createDirectoriesOnDisk,
  executeScaffoldingOnDisk,
  formatAgentsConfigured,
  getBaseDirectories,
  getCiWorkflowFiles,
  initProject,
  injectMissingScripts,
  isTargetIncluded,
  mergeDirectories,
  parsePackageJsonObject,
  persistFileToDisk,
  recordDryRunFile,
  resolveAgentTargets,
  resolveSafeTargetPath,
  tryInstallGitHook,
  updateConsumerPackageJson,
  validateArchitectureGranularity,
  validateCiProvider,
  validateInitOptions,
  writeProjectFiles,
  writeSingleFile,
} from '../src/init/index.js';

describe('M3.2 Init Subsystem Unit & Regression Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-init-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('resolveAgentTargets & isTargetIncluded & formatAgentsConfigured', () => {
    it('resolves default/all, comma-separated, array, disabled, and unrecognized targets', () => {
      expect(Array.from(resolveAgentTargets(undefined))).toEqual([...VALID_AGENT_TARGETS]);
      expect(Array.from(resolveAgentTargets(true))).toEqual([...VALID_AGENT_TARGETS]);
      expect(Array.from(resolveAgentTargets('all'))).toEqual([...VALID_AGENT_TARGETS]);

      expect(resolveAgentTargets(false).size).toBe(0);
      expect(resolveAgentTargets('none').size).toBe(0);
      expect(resolveAgentTargets('').size).toBe(0);
      expect(resolveAgentTargets('   ').size).toBe(0);
      expect(resolveAgentTargets([]).size).toBe(0);

      expect(Array.from(resolveAgentTargets('cursor, claude, unknown'))).toEqual([
        'cursor',
        'claude',
      ]);
      expect(Array.from(resolveAgentTargets(['  Claude ', 'MCP']))).toEqual(['claude', 'mcp']);
      expect(Array.from(resolveAgentTargets(['cursor', 'all']))).toEqual([...VALID_AGENT_TARGETS]);
    });

    it('checks target inclusion and formats configured target list with all first', () => {
      expect(isTargetIncluded(new Set(['cursor']), 'cursor')).toBe(true);
      expect(isTargetIncluded(new Set(['cursor']), 'claude')).toBe(false);
      expect(isTargetIncluded(new Set(['all']), 'copilot')).toBe(true);
      expect(isTargetIncluded(new Set(), 'cursor')).toBe(false);

      expect(formatAgentsConfigured(new Set(['cursor', 'all', 'claude']))).toEqual([
        'all',
        'cursor',
        'claude',
      ]);
      expect(formatAgentsConfigured(new Set(['cursor', 'mcp']))).toEqual(['cursor', 'mcp']);
      expect(formatAgentsConfigured(new Set())).toEqual([]);
    });
  });

  describe('Agent & Skill File Collectors', () => {
    it('appends hierarchical AGENTS.md files without overwriting existing arrays', () => {
      const dirs = ['existing'];
      const files = [{ relPath: 'README.md', content: 'hi' }];
      appendHierarchicalAgentsMd(dirs, files);

      expect(dirs).toEqual(['existing', 'specs', 'src', 'tests']);
      expect(files.map((f) => f.relPath)).toEqual([
        'README.md',
        'specs/AGENTS.md',
        'src/AGENTS.md',
        'tests/AGENTS.md',
      ]);
    });

    it('appends skill reference files for known skills and safely ignores unknown or prototype keys', () => {
      const dirs: string[] = [];
      const files: { relPath: string; content: string }[] = [];

      appendSkillReferenceFiles('.agent/skills/aisdlc-greenfield', 'aisdlc-greenfield', dirs, files);
      expect(dirs).toEqual(['.agent/skills/aisdlc-greenfield/references']);
      expect(files.some((f) => f.relPath.endsWith('inception-checklist.md'))).toBe(true);

      const prevCount = files.length;
      appendSkillReferenceFiles('.agent/skills/unknown', 'nonexistent-skill', dirs, files);
      appendSkillReferenceFiles('.agent/skills/proto', 'constructor', dirs, files);
      appendSkillReferenceFiles('.agent/skills/proto', 'toString', dirs, files);
      expect(files).toHaveLength(prevCount);
    });

    it('appends Antigravity, Cursor, Claude, Copilot, and MCP files accurately', () => {
      const agDirs: string[] = [];
      const agFiles: { relPath: string; content: string }[] = [];
      appendAntigravityFiles(agDirs, agFiles);
      expect(agFiles.some((f) => f.relPath === '.agent/hooks.json')).toBe(true);
      expect(agFiles.some((f) => f.relPath === 'scripts/guard-branch.cjs')).toBe(true);
      expect(agFiles.some((f) => f.relPath === 'specs/AGENTS.md')).toBe(true);

      const curDirs: string[] = [];
      const curFiles: { relPath: string; content: string }[] = [];
      appendCursorFiles(curDirs, curFiles);
      expect(curDirs).toEqual(['.cursor/rules']);
      expect(curFiles).toHaveLength(
        4 + SPECIALIZED_AGENT_TEMPLATES.length + LIFECYCLE_SKILL_TEMPLATES.length
      );

      const clDirs: string[] = [];
      const clFiles: { relPath: string; content: string }[] = [];
      appendClaudeFiles(clDirs, clFiles);
      expect(clFiles.some((f) => f.relPath === 'CLAUDE.md')).toBe(true);
      expect(
        clFiles.some((f) => f.relPath === `.claude/skills/${SPECIALIZED_AGENT_TEMPLATES[0].id}/SKILL.md`)
      ).toBe(true);

      const copDirs: string[] = [];
      const copFiles: { relPath: string; content: string }[] = [];
      appendCopilotFiles(copDirs, copFiles);
      expect(copFiles).toHaveLength(
        1 + SPECIALIZED_AGENT_TEMPLATES.length + LIFECYCLE_SKILL_TEMPLATES.length
      );

      const mcpDirs: string[] = [];
      const mcpFiles: { relPath: string; content: string }[] = [];
      appendMcpFiles(mcpDirs, mcpFiles);
      expect(mcpDirs).toEqual(['.cursor', '.vscode']);
      expect(mcpFiles.map((f) => f.relPath)).toEqual([
        '.cursor/mcp.json',
        'antigravity.mcp.json',
        '.vscode/mcp.json',
      ]);
      for (const f of mcpFiles) {
        expect(() => JSON.parse(f.content)).not.toThrow();
      }
    });

    it('deduplicates files and dirs across multiple targets in collectAgentFiles', () => {
      const emptyTargets = collectAgentFiles(new Set());
      expect(emptyTargets.files.map((f) => f.relPath)).toEqual([
        '.cursor/mcp.json',
        'antigravity.mcp.json',
        '.vscode/mcp.json',
      ]);

      const multi = collectAgentFiles(new Set(['antigravity', 'claude']));
      const specsAgentsCount = multi.files.filter((f) => f.relPath === 'specs/AGENTS.md').length;
      expect(specsAgentsCount).toBe(1);
      expect(new Set(multi.dirs).size).toBe(multi.dirs.length);
    });
  });

  describe('Path Safety & Disk Writing Helpers', () => {
    it('resolves safe relative paths inside destDir and blocks traversal, absolute, and null-byte paths', () => {
      const safe = resolveSafeTargetPath(tmpDir, 'specs/FR-001.md');
      expect(safe).toBe(path.resolve(tmpDir, 'specs/FR-001.md'));
      expect(resolveSafeTargetPath(tmpDir, '.', true)).toBe(path.resolve(tmpDir));

      expect(() => resolveSafeTargetPath(tmpDir, '../escape.txt')).toThrow(/traversal/i);
      expect(() => resolveSafeTargetPath(tmpDir, 'a/../../escape.txt')).toThrow(/traversal/i);
      expect(() => resolveSafeTargetPath(tmpDir, '')).toThrow(/traversal/i);
      expect(() => resolveSafeTargetPath(tmpDir, 'bad\0path')).toThrow(/Invalid target path/i);
      expect(() => resolveSafeTargetPath(tmpDir, path.resolve(tmpDir, 'abs.txt'))).toThrow(
        /Absolute target path/i
      );
      expect(() => resolveSafeTargetPath(tmpDir, 'C:drive-rel.txt')).toThrow(
        /Absolute target path/i
      );
    });

    it('records dry-run operations accurately via recordDryRunFile', () => {
      const res = { filesCreated: [] as string[], filesUpdated: [] as string[] };
      recordDryRunFile(false, false, 'new.txt', res);
      recordDryRunFile(true, true, 'upd.txt', res);
      recordDryRunFile(true, false, 'skip.txt', res);

      expect(res.filesCreated).toEqual(['new.txt']);
      expect(res.filesUpdated).toEqual(['upd.txt']);
    });

    it('persists new and updated files via persistFileToDisk', () => {
      const target = path.join(tmpDir, 'deep', 'nested', 'file.txt');
      const res = { filesCreated: [] as string[], filesUpdated: [] as string[] };

      persistFileToDisk(target, 'v1', false, 'deep/nested/file.txt', res);
      expect(fs.readFileSync(target, 'utf-8')).toBe('v1');
      expect(res.filesCreated).toEqual(['deep/nested/file.txt']);

      persistFileToDisk(target, 'v2', true, 'deep/nested/file.txt', res);
      expect(fs.readFileSync(target, 'utf-8')).toBe('v2');
      expect(res.filesUpdated).toEqual(['deep/nested/file.txt']);
    });

    it('enforces protected coding rules across slash variants in writeSingleFile', () => {
      const protectedFile = PROTECTED_CODING_RULES_FILES[0]; // Directory.Build.props
      const fullProtected = path.join(tmpDir, protectedFile);
      fs.writeFileSync(fullProtected, 'custom-user-content', 'utf-8');

      const res = { filesCreated: [] as string[], filesUpdated: [] as string[] };
      writeSingleFile(fullProtected, 'overwrite-attempt', `./${protectedFile}`, { force: true }, res);
      writeSingleFile(
        path.join(tmpDir, 'gradle/init.d/aisdlc-strict.init.gradle.kts'),
        'overwrite-attempt',
        'gradle\\init.d\\aisdlc-strict.init.gradle.kts',
        { dryRun: true, force: true },
        res
      );
      expect(fs.readFileSync(fullProtected, 'utf-8')).toBe('custom-user-content');
      expect(res.filesUpdated).toEqual([]);

      const normalPath = path.join(tmpDir, 'normal.txt');
      fs.writeFileSync(normalPath, 'old', 'utf-8');
      writeSingleFile(normalPath, 'new', 'normal.txt', { force: false }, res);
      expect(fs.readFileSync(normalPath, 'utf-8')).toBe('old');

      writeSingleFile(normalPath, 'new', 'normal.txt', { force: true }, res);
      expect(fs.readFileSync(normalPath, 'utf-8')).toBe('new');
      expect(res.filesUpdated).toEqual(['normal.txt']);
    });

    it('writes batches via writeProjectFiles and rejects path traversal entries', () => {
      const batch = writeProjectFiles(tmpDir, [
        { relPath: 'a/one.txt', content: '1' },
        { relPath: 'b/two.txt', content: '2' },
      ]);
      expect(batch.filesCreated).toEqual(['a/one.txt', 'b/two.txt']);
      expect(fs.readFileSync(path.join(tmpDir, 'a', 'one.txt'), 'utf-8')).toBe('1');

      expect(writeProjectFiles(tmpDir, [])).toEqual({ filesCreated: [], filesUpdated: [] });
      expect(() =>
        writeProjectFiles(tmpDir, [{ relPath: '../outside.txt', content: 'evil' }])
      ).toThrow(/traversal/i);
    });

    it('creates directories on disk or simulates dryRun and rejects traversal in createDirectoriesOnDisk', () => {
      const dry = createDirectoriesOnDisk(tmpDir, ['dry-dir'], true);
      expect(dry).toEqual(['dry-dir']);
      expect(fs.existsSync(path.join(tmpDir, 'dry-dir'))).toBe(false);

      const real = createDirectoriesOnDisk(tmpDir, ['real/sub'], false);
      expect(real).toEqual(['real/sub']);
      expect(fs.statSync(path.join(tmpDir, 'real', 'sub')).isDirectory()).toBe(true);

      expect(() => createDirectoriesOnDisk(tmpDir, ['../escape'], false)).toThrow(/traversal/i);
    });
  });

  describe('Option Validators & Scaffolding Collectors', () => {
    it('validates CI providers and architecture granularities', () => {
      expect(validateCiProvider(undefined)).toEqual({ valid: true });
      expect(validateCiProvider('none')).toEqual({ valid: true });
      expect(validateCiProvider('  GitLab ')).toEqual({ valid: true, provider: 'gitlab' });
      expect(validateCiProvider('circleci').valid).toBe(false);
      expect(validateCiProvider('   ').valid).toBe(false);

      expect(validateArchitectureGranularity(undefined)).toEqual({
        valid: true,
        granularity: 'minimal',
      });
      expect(validateArchitectureGranularity(' FULL ')).toEqual({
        valid: true,
        granularity: 'full',
      });
      expect(validateArchitectureGranularity('none')).toEqual({
        valid: true,
        granularity: 'none',
      });
      expect(validateArchitectureGranularity('ultra').valid).toBe(false);
      expect(validateArchitectureGranularity(123).valid).toBe(false);

      expect(validateInitOptions({ ci: 'github', architecture: 'complete' })).toEqual({
        valid: true,
        ciProvider: 'github',
        archGranularity: 'complete',
      });
      expect(validateInitOptions({ ci: 'bad-ci', architecture: 'ultra' }).error).toContain(
        'bad-ci'
      );
      expect(validateInitOptions({ ci: 'gitlab', architecture: 'ultra' }).error).toContain(
        'ultra'
      );
    });

    it('generates base directories, CI workflow files, policies/schemas, architecture templates, and starter files', () => {
      expect(getBaseDirectories('github')).toContain('.github/workflows');
      expect(getBaseDirectories(undefined)).toContain('.github');
      expect(getBaseDirectories('gitlab')).not.toContain('.github');

      expect(getCiWorkflowFiles('github')).toHaveLength(4);
      expect(getCiWorkflowFiles('gitlab')).toHaveLength(1);
      expect(getCiWorkflowFiles('azure')).toHaveLength(1);
      expect(getCiWorkflowFiles('bitbucket')).toHaveLength(1);
      expect(getCiWorkflowFiles(undefined)).toEqual([]);

      const policyFiles = collectPolicyAndSchemaFiles();
      const rels = policyFiles.map((f) => f.relPath);
      expect(rels).toContain('quality-policy.yaml');
      expect(rels).toContain('license-policy.yaml');
      expect(rels).toContain('privacy-policy.yaml');
      expect(rels).toContain('templates/coding-rules/dotnet/Directory.Build.props');
      expect(rels.filter((r) => r.startsWith('schemas/'))).toHaveLength(34);

      expect(collectArchitectureTemplateFiles('minimal')).toHaveLength(3);
      expect(collectArchitectureTemplateFiles('full')).toHaveLength(13);
      expect(collectArchitectureTemplateFiles('none')).toEqual([]);
      for (const f of collectArchitectureTemplateFiles('minimal')) {
        expect(f.relPath.startsWith('templates/architecture/')).toBe(true);
        expect(f.relPath).not.toContain('\\');
      }

      const starterGithub = collectStarterFiles(undefined, [], 'none', []);
      expect(starterGithub.some((f) => f.relPath === AISDLC_MANIFEST_FILENAME)).toBe(true);
      expect(starterGithub.some((f) => f.relPath === '.github/PULL_REQUEST_TEMPLATE.md')).toBe(
        true
      );

      const starterGitlab = collectStarterFiles('gitlab', [], 'none', ['dotnet']);
      expect(starterGitlab.some((f) => f.relPath === '.github/PULL_REQUEST_TEMPLATE.md')).toBe(
        false
      );
      expect(starterGitlab.some((f) => f.relPath === 'Directory.Build.props')).toBe(true);
    });
  });

  describe('package.json Parsing, Script Injection & Git Hook Installer', () => {
    it('parses valid package.json objects and rejects arrays, primitives, invalid JSON, and malformed scripts', () => {
      expect(parsePackageJsonObject('{"name":"app"}')).toEqual({ name: 'app' });
      expect(parsePackageJsonObject('{"name":"app","scripts":null}')).toEqual({
        name: 'app',
        scripts: null,
      });
      expect(parsePackageJsonObject('{broken')).toBeNull();
      expect(parsePackageJsonObject('null')).toBeNull();
      expect(parsePackageJsonObject('[]')).toBeNull();
      expect(parsePackageJsonObject('"str"')).toBeNull();
      expect(parsePackageJsonObject('{"scripts":[]}')).toBeNull();
      expect(parsePackageJsonObject('{"scripts":"bad"}')).toBeNull();
    });

    it('injects only missing scripts via injectMissingScripts', () => {
      const scripts: Record<string, string> = { check: 'custom-check' };
      expect(injectMissingScripts(scripts)).toBe(true);
      expect(scripts.check).toBe('custom-check');
      expect(scripts['verify:all']).toBe('aisdlc verify all');
      expect(injectMissingScripts(scripts)).toBe(false);
    });

    it('safely updates package.json and leaves arrays or malformed scripts untouched', () => {
      expect(updateConsumerPackageJson(tmpDir)).toBe(false);

      const pkgPath = path.join(tmpDir, 'package.json');
      fs.writeFileSync(pkgPath, '[]', 'utf-8');
      expect(updateConsumerPackageJson(tmpDir)).toBe(false);
      expect(fs.readFileSync(pkgPath, 'utf-8')).toBe('[]');

      fs.writeFileSync(pkgPath, '{"scripts":[]}', 'utf-8');
      expect(updateConsumerPackageJson(tmpDir)).toBe(false);
      expect(fs.readFileSync(pkgPath, 'utf-8')).toBe('{"scripts":[]}');

      fs.writeFileSync(pkgPath, JSON.stringify({ name: 'demo' }), 'utf-8');
      expect(updateConsumerPackageJson(tmpDir, true)).toBe(true);
      expect(JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).scripts).toBeUndefined();

      expect(updateConsumerPackageJson(tmpDir, false)).toBe(true);
      expect(JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).scripts['verify:quality']).toBe(
        'aisdlc verify quality'
      );
      expect(updateConsumerPackageJson(tmpDir, false)).toBe(false);
    });

    it('installs git hooks only when .git is a directory and not in dryRun mode', () => {
      expect(tryInstallGitHook(tmpDir, false)).toBe(false);

      // Worktree/submodule .git regular file must not crash
      fs.writeFileSync(path.join(tmpDir, '.git'), 'gitdir: ../.git/worktrees/wt\n', 'utf-8');
      expect(tryInstallGitHook(tmpDir, false)).toBe(false);
      fs.rmSync(path.join(tmpDir, '.git'));

      fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });
      expect(tryInstallGitHook(tmpDir, true)).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'pre-commit'))).toBe(false);

      expect(tryInstallGitHook(tmpDir, false)).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'pre-commit'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'prepare-commit-msg'))).toBe(true);
    });
  });

  describe('Plan Assembly, Result Builders & initProject Execution', () => {
    it('merges and deduplicates directory arrays including duplicates in base', () => {
      expect(mergeDirectories(['a', 'a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(mergeDirectories([], [])).toEqual([]);
    });

    it('constructs error and success InitProjectResult objects', () => {
      const err = buildInitError(tmpDir, 'boom');
      expect(err).toEqual({
        success: false,
        targetDir: tmpDir,
        directoriesCreated: [],
        filesCreated: [],
        filesUpdated: [],
        agentsConfigured: [],
        gitHookInstalled: false,
        error: 'boom',
      });

      const ok = buildInitSuccessResult(
        tmpDir,
        ['specs'],
        ['quality-policy.yaml'],
        [],
        'github',
        ['cursor'],
        'minimal',
        ['typescript'],
        true
      );
      expect(ok.success).toBe(true);
      expect(ok.ciProvider).toBe('github');
      expect(ok.stacksConfigured).toEqual(['typescript']);
      expect(ok.gitHookInstalled).toBe(true);
    });

    it('assembles scaffolding plan and executes on disk (dryRun and real)', () => {
      const plan = assembleScaffoldingPlan('gitlab', 'none', 'none', []);
      expect(plan.agentTargets.size).toBe(0);
      expect(plan.directories).not.toContain('.github');
      expect(plan.starterFiles.some((f) => f.relPath === '.gitlab-ci.yml')).toBe(true);

      const dryResult = executeScaffoldingOnDisk(
        tmpDir,
        { dryRun: true, agents: 'cursor', ci: 'gitlab' },
        'gitlab',
        'none',
        []
      );
      expect(dryResult.success).toBe(true);
      expect(dryResult.filesCreated.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(tmpDir, '.gitlab-ci.yml'))).toBe(false);

      const realResult = executeScaffoldingOnDisk(
        tmpDir,
        { dryRun: false, agents: 'cursor', ci: 'gitlab' },
        'gitlab',
        'none',
        []
      );
      expect(realResult.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.gitlab-ci.yml'))).toBe(true);
    });

    it('returns InitProjectResult failure cleanly when targetDir is a regular file', () => {
      const fileTarget = path.join(tmpDir, 'not-a-directory');
      fs.writeFileSync(fileTarget, 'occupied', 'utf-8');

      const result = initProject({ targetDir: fileTarget });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
