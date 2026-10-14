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

function detectCiProvider(env: NodeJS.ProcessEnv): CiProvider {
  if (env.GITLAB_CI === 'true') return 'gitlab';
  if (env.TF_BUILD === 'true') return 'azure';
  if (env.BITBUCKET_COMMIT !== undefined || env.BITBUCKET_BRANCH !== undefined) return 'bitbucket';
  if (env.GITHUB_ACTIONS === 'true') return 'github';
  return 'generic';
}

function resolveGitLabRef(env: NodeJS.ProcessEnv): string | undefined {
  return env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME?.trim() ||
    env.CI_COMMIT_REF_NAME?.trim() ||
    env.CI_COMMIT_BRANCH?.trim();
}

function resolveAzureRef(env: NodeJS.ProcessEnv): string | undefined {
  const azureBranch = env.SYSTEM_PULLREQUEST_SOURCEBRANCH?.trim() ||
    env.BUILD_SOURCEBRANCH?.trim() ||
    env.BUILD_SOURCEBRANCHNAME?.trim();
  return azureBranch ? azureBranch.replace(/^refs\/heads\//, '') : undefined;
}

function resolveHeadRef(provider: CiProvider, env: NodeJS.ProcessEnv): string | undefined {
  if (env.PR_HEAD_REF?.trim()) return env.PR_HEAD_REF.trim();
  if (provider === 'gitlab') return resolveGitLabRef(env);
  if (provider === 'azure') return resolveAzureRef(env);
  if (provider === 'bitbucket') return env.BITBUCKET_BRANCH?.trim() || env.BITBUCKET_PR_DESTINATION_BRANCH?.trim();
  if (provider === 'github') return env.GITHUB_HEAD_REF?.trim() || env.GITHUB_REF_NAME?.trim();
  return undefined;
}

function resolvePrTitle(env: NodeJS.ProcessEnv): string | undefined {
  return env.PR_TITLE?.trim() ||
    env.CI_MERGE_REQUEST_TITLE?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTTITLE?.trim();
}

function resolvePrBody(env: NodeJS.ProcessEnv): string | undefined {
  return env.PR_BODY?.trim() || env.CI_MERGE_REQUEST_DESCRIPTION?.trim();
}

function resolvePrId(env: NodeJS.ProcessEnv): string | undefined {
  return env.PR_NUMBER?.trim() ||
    env.CI_MERGE_REQUEST_IID?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTID?.trim() ||
    env.BITBUCKET_PR_ID?.trim();
}

const CI_AUTHORS: Record<CiProvider, string> = {
  github: 'GitHub Actions CI (Automated SDD Integration)',
  gitlab: 'GitLab CI (Automated SDD Integration)',
  azure: 'Azure DevOps CI (Automated SDD Integration)',
  bitbucket: 'Bitbucket Pipelines (Automated SDD Integration)',
  generic: 'CI/CD Automated SDD Integration',
};

export function resolveCiEnvironment(env: NodeJS.ProcessEnv = process.env): ResolvedCiEnv {
  const manualChangeId = env.MANUAL_CHANGE_ID?.trim() || env.CHANGE_ID?.trim() || undefined;
  const provider = detectCiProvider(env);

  return {
    provider,
    headRef: resolveHeadRef(provider, env),
    prTitle: resolvePrTitle(env),
    prBody: resolvePrBody(env),
    prId: resolvePrId(env),
    manualChangeId,
    author: CI_AUTHORS[provider],
  };
}

function updateExistingEnvFile(filePath: string, envString: string, uppercaseKey: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map((line) => {
    if (line.startsWith(`${uppercaseKey}=`)) {
      found = true;
      return envString;
    }
    return line;
  });
  if (!found) newLines.push(envString);
  fs.writeFileSync(filePath, newLines.filter((l) => l.trim() !== '').join('\n') + '\n', 'utf-8');
}

function writeEnvOutputFile(envOutputFile: string, key: string, value: string): void {
  const uppercaseKey = key.toUpperCase();
  const envString = `${uppercaseKey}=${value}`;
  if (fs.existsSync(envOutputFile)) {
    updateExistingEnvFile(envOutputFile, envString, uppercaseKey);
  } else {
    fs.writeFileSync(envOutputFile, envString + '\n', 'utf-8');
  }
}

function resolveEnvOutputFilePath(env: NodeJS.ProcessEnv): string | undefined {
  if (env.CI_OUTPUT_FILE) return env.CI_OUTPUT_FILE;
  if (env.GITLAB_ENV) return env.GITLAB_ENV;
  if (env.GITLAB_CI === 'true' || env.BITBUCKET_COMMIT !== undefined) return 'sdd-integrate.env';
  return undefined;
}

export function emitCiOutput(
  key: string,
  value: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (env.GITHUB_OUTPUT && fs.existsSync(env.GITHUB_OUTPUT)) {
    fs.appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`, 'utf-8');
  }

  if (env.TF_BUILD === 'true') {
    console.log(`##vso[task.setvariable variable=${key};isOutput=true]${value}`);
  }

  const envOutputFile = resolveEnvOutputFilePath(env);
  if (envOutputFile) {
    writeEnvOutputFile(envOutputFile, key, value);
  }
}
