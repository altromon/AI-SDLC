import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  resolveCiEnvironment,
  emitCiOutput,
  runCiIntegration,
} from '../../../scripts/sdd-integrate-ci.js';

describe('Multi-Platform CI/CD Environment Adapters & SDD Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-ci-env-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('resolveCiEnvironment', () => {
    it('should resolve GitLab CI environment variables correctly', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        GITLAB_CI: 'true',
        CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: 'feat/CHG-022-multi-platform-ci-cd',
        CI_MERGE_REQUEST_TITLE: 'feat(ci): multi-platform support',
        CI_MERGE_REQUEST_DESCRIPTION: 'Closes #36 with multi-ci templates',
        CI_MERGE_REQUEST_IID: '36',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('gitlab');
      expect(resolved.headRef).toBe('feat/CHG-022-multi-platform-ci-cd');
      expect(resolved.prTitle).toBe('feat(ci): multi-platform support');
      expect(resolved.prBody).toBe('Closes #36 with multi-ci templates');
      expect(resolved.prId).toBe('36');
      expect(resolved.author).toContain('GitLab CI');
    });

    it('should resolve GitLab CI fallback branch (CI_COMMIT_REF_NAME)', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        GITLAB_CI: 'true',
        CI_COMMIT_REF_NAME: 'release/v1.2.0',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('gitlab');
      expect(resolved.headRef).toBe('release/v1.2.0');
    });

    it('should resolve Azure DevOps environment variables correctly', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        TF_BUILD: 'true',
        BUILD_SOURCEBRANCH: 'refs/heads/feat/CHG-010-azure-pipeline',
        SYSTEM_PULLREQUEST_PULLREQUESTTITLE: 'feat(azure): support pipelines',
        SYSTEM_PULLREQUEST_PULLREQUESTID: '105',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('azure');
      expect(resolved.headRef).toBe('feat/CHG-010-azure-pipeline');
      expect(resolved.prTitle).toBe('feat(azure): support pipelines');
      expect(resolved.prId).toBe('105');
      expect(resolved.author).toContain('Azure DevOps CI');
    });

    it('should resolve Bitbucket Pipelines environment variables correctly', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        BITBUCKET_COMMIT: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        BITBUCKET_BRANCH: 'feat/CHG-008-bitbucket',
        BITBUCKET_PR_ID: '42',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('bitbucket');
      expect(resolved.headRef).toBe('feat/CHG-008-bitbucket');
      expect(resolved.prId).toBe('42');
      expect(resolved.author).toContain('Bitbucket Pipelines');
    });

    it('should resolve GitHub Actions environment variables correctly', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        GITHUB_ACTIONS: 'true',
        GITHUB_HEAD_REF: 'feat/CHG-001-telemetry',
        PR_TITLE: 'feat(telemetry): ingest telemetry',
        PR_BODY: 'Proposal details in specs/changes/active/chg-001',
        PR_NUMBER: '12',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('github');
      expect(resolved.headRef).toBe('feat/CHG-001-telemetry');
      expect(resolved.prTitle).toBe('feat(telemetry): ingest telemetry');
      expect(resolved.prBody).toBe('Proposal details in specs/changes/active/chg-001');
      expect(resolved.prId).toBe('12');
      expect(resolved.author).toContain('GitHub Actions CI');
    });

    it('should prioritize explicit PR_HEAD_REF and MANUAL_CHANGE_ID across all providers', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        GITLAB_CI: 'true',
        CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: 'branch-from-gitlab',
        PR_HEAD_REF: 'override-branch',
        MANUAL_CHANGE_ID: 'chg-manual-override',
      };

      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.headRef).toBe('override-branch');
      expect(resolved.manualChangeId).toBe('chg-manual-override');
    });

    it('should fallback gracefully to generic provider if no CI detected', () => {
      const mockEnv: NodeJS.ProcessEnv = {};
      const resolved = resolveCiEnvironment(mockEnv);
      expect(resolved.provider).toBe('generic');
      expect(resolved.author).toBe('CI/CD Automated SDD Integration');
      expect(resolved.headRef).toBeUndefined();
    });
  });

  describe('emitCiOutput', () => {
    it('should write outputs to GITHUB_OUTPUT file when running on GitHub Actions', () => {
      const githubOutputFile = path.join(tempDir, 'github_output.txt');
      fs.writeFileSync(githubOutputFile, '', 'utf-8');

      const mockEnv: NodeJS.ProcessEnv = {
        GITHUB_ACTIONS: 'true',
        GITHUB_OUTPUT: githubOutputFile,
      };

      emitCiOutput('integrated', 'true', mockEnv);
      emitCiOutput('change_id', 'chg-022-test', mockEnv);

      const content = fs.readFileSync(githubOutputFile, 'utf-8');
      expect(content).toContain('integrated=true\n');
      expect(content).toContain('change_id=chg-022-test\n');
    });

    it('should write uppercase key-values to CI_OUTPUT_FILE for GitLab/generic', () => {
      const dotenvFile = path.join(tempDir, 'sdd-integrate.env');

      const mockEnv: NodeJS.ProcessEnv = {
        CI_OUTPUT_FILE: dotenvFile,
      };

      emitCiOutput('integrated', 'true', mockEnv);
      emitCiOutput('change_id', 'chg-022-test', mockEnv);

      const content = fs.readFileSync(dotenvFile, 'utf-8');
      expect(content).toContain('INTEGRATED=true\n');
      expect(content).toContain('CHANGE_ID=chg-022-test\n');
    });
  });

  describe('runCiIntegration execution safety', () => {
    it('should safely exit with code 0 when no active changes exist', () => {
      const exitCode = runCiIntegration({
        rootDir: tempDir,
        env: {
          GITLAB_CI: 'true',
          CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: 'feat/non-existent',
        },
      });

      expect(exitCode).toBe(0);
    });
  });
});
