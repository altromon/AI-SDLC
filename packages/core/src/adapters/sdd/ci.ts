/**
 * AI-SDLC: CI/CD Environment Adapters & Multi-Platform Resolvers
 * Supports GitHub Actions, GitLab CI, Azure DevOps and Bitbucket Pipelines.
 */

import * as fs from 'fs';

export type CiProvider = 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'generic';

export interface ResolvedCiEnv {
  provider: CiProvider;
  headRef?: string;
  prTitle?: string;
  prBody?: string;
  prId?: string;
  manualChangeId?: string;
  author: string;
}

export function resolveCiEnvironment(env: NodeJS.ProcessEnv = process.env): ResolvedCiEnv {
  const manualChangeId = env.MANUAL_CHANGE_ID?.trim() || env.CHANGE_ID?.trim() || undefined;

  let provider: CiProvider = 'generic';
  if (env.GITLAB_CI === 'true') {
    provider = 'gitlab';
  } else if (env.TF_BUILD === 'true') {
    provider = 'azure';
  } else if (env.BITBUCKET_COMMIT !== undefined || env.BITBUCKET_BRANCH !== undefined) {
    provider = 'bitbucket';
  } else if (env.GITHUB_ACTIONS === 'true') {
    provider = 'github';
  }

  // Branch / Ref extraction
  let headRef: string | undefined = env.PR_HEAD_REF?.trim() || undefined;
  if (!headRef) {
    if (provider === 'gitlab') {
      headRef =
        env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME?.trim() ||
        env.CI_COMMIT_REF_NAME?.trim() ||
        env.CI_COMMIT_BRANCH?.trim() ||
        undefined;
    } else if (provider === 'azure') {
      const azureBranch =
        env.SYSTEM_PULLREQUEST_SOURCEBRANCH?.trim() ||
        env.BUILD_SOURCEBRANCH?.trim() ||
        env.BUILD_SOURCEBRANCHNAME?.trim();
      if (azureBranch) {
        headRef = azureBranch.replace(/^refs\/heads\//, '');
      }
    } else if (provider === 'bitbucket') {
      headRef =
        env.BITBUCKET_BRANCH?.trim() ||
        env.BITBUCKET_PR_DESTINATION_BRANCH?.trim() ||
        undefined;
    } else if (provider === 'github') {
      headRef =
        env.GITHUB_HEAD_REF?.trim() ||
        env.GITHUB_REF_NAME?.trim() ||
        undefined;
    }
  }

  // PR / MR Title
  const prTitle: string | undefined =
    env.PR_TITLE?.trim() ||
    env.CI_MERGE_REQUEST_TITLE?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTTITLE?.trim() ||
    undefined;

  // PR / MR Body / Description
  const prBody: string | undefined =
    env.PR_BODY?.trim() ||
    env.CI_MERGE_REQUEST_DESCRIPTION?.trim() ||
    undefined;

  // PR / MR ID
  const prId: string | undefined =
    env.PR_NUMBER?.trim() ||
    env.CI_MERGE_REQUEST_IID?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTID?.trim() ||
    env.BITBUCKET_PR_ID?.trim() ||
    undefined;

  // Provider author attribution
  let author = 'CI/CD Automated SDD Integration';
  if (provider === 'github') {
    author = 'GitHub Actions CI (Automated SDD Integration)';
  } else if (provider === 'gitlab') {
    author = 'GitLab CI (Automated SDD Integration)';
  } else if (provider === 'azure') {
    author = 'Azure DevOps CI (Automated SDD Integration)';
  } else if (provider === 'bitbucket') {
    author = 'Bitbucket Pipelines (Automated SDD Integration)';
  }

  return {
    provider,
    headRef,
    prTitle,
    prBody,
    prId,
    manualChangeId,
    author,
  };
}

export function emitCiOutput(
  key: string,
  value: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  // 1. GitHub Actions output
  const outputFile = env.GITHUB_OUTPUT;
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`, 'utf-8');
  }

  // 2. Azure DevOps Logging Command
  if (env.TF_BUILD === 'true') {
    console.log(`##vso[task.setvariable variable=${key};isOutput=true]${value}`);
  }

  // 3. Dotenv output file (GitLab CI, Bitbucket, or explicit CI_OUTPUT_FILE)
  const envOutputFile =
    env.CI_OUTPUT_FILE ||
    env.GITLAB_ENV ||
    (env.GITLAB_CI === 'true' || env.BITBUCKET_COMMIT !== undefined
      ? 'sdd-integrate.env'
      : undefined);

  if (envOutputFile) {
    const uppercaseKey = key.toUpperCase();
    const envString = `${uppercaseKey}=${value}`;
    if (fs.existsSync(envOutputFile)) {
      const content = fs.readFileSync(envOutputFile, 'utf-8');
      const lines = content.split('\n');
      let found = false;
      const newLines = lines.map(line => {
        if (line.startsWith(`${uppercaseKey}=`)) {
          found = true;
          return envString;
        }
        return line;
      });
      if (!found) {
        newLines.push(envString);
      }
      fs.writeFileSync(envOutputFile, newLines.filter(l => l.trim() !== '').join('\n') + '\n', 'utf-8');
    } else {
      fs.writeFileSync(envOutputFile, envString + '\n', 'utf-8');
    }
  }
}
