/**
 * AI-SDLC: Deterministic Artifact Schema Verifier
 * Validates YAML frontmatters of product, security, architecture, manual, and safety artifacts
 * against canonical JSON Schema specifications (Draft 2020-12).
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ArtifactSchemaOptions,
  ArtifactSchemaResult,
  ArtifactSchemaViolation,
  ArtifactValidationResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ErrorObject, ValidateFunction } from 'ajv';

const ajvInstance = new (Ajv2020 as unknown as typeof import('ajv').default)({
  allErrors: true,
  strict: false,
  validateFormats: true,
  verbose: true,
});
(addFormats as unknown as (instance: unknown) => void)(ajvInstance);

const compiledSchemaCache = new WeakMap<object, ValidateFunction>();

function formatFieldPath(err: ErrorObject, propPath: string): string {
  const field = err.instancePath ? err.instancePath.replace(/^\//, '').replace(/\//g, '.') : propPath || 'root';
  return propPath && field !== 'root' && field ? `${propPath}.${field}` : field || 'root';
}

const KEYWORD_FORMATTERS: Record<string, (p: Record<string, unknown>, err: ErrorObject, fullPath: string) => string> = {
  required: (p, _err, fullPath) => `'${fullPath}' missing required field '${String(p?.missingProperty)}'`,
  additionalProperties: (p, _err, fullPath) => `'${fullPath}' contains disallowed extra property '${String(p?.additionalProperty)}'`,
  minLength: (p, _err, fullPath) => `'${fullPath}' length must be >= ${String(p?.limit)}`,
  maxLength: (p, _err, fullPath) => `'${fullPath}' length must be <= ${String(p?.limit)}`,
  enum: (p, err, fullPath) => `'${fullPath}' must be one of [${Array.isArray(p?.allowedValues) ? p.allowedValues.join(', ') : ''}], received '${String(err.data)}'`,
  uniqueItems: (_p, _err, fullPath) => `'${fullPath}' contains duplicate items (must have unique items)`,
  pattern: (p, err, fullPath) => `'${fullPath}' value '${String(err.data)}' does not match pattern ${String(p?.pattern)}`,
};

function formatKeywordMessage(err: ErrorObject, fullPath: string): string {
  const p = err.params as Record<string, unknown>;
  const formatter = KEYWORD_FORMATTERS[err.keyword];
  return formatter ? formatter(p, err, fullPath) : `'${fullPath}' ${err.message || 'validation failed'}`;
}

function formatAjvError(err: ErrorObject, propPath: string): string {
  const fullPath = formatFieldPath(err, propPath);
  return formatKeywordMessage(err, fullPath);
}
import { STARTER_SCHEMAS_MAP } from '../init/starter-schemas.js';

export const TYPE_TO_SCHEMA_MAP: Record<string, string> = {
  // Product
  actor: 'schemas/product/actor.schema.json',
  'business-rule': 'schemas/product/business-rule.schema.json',
  journey: 'schemas/product/journey.schema.json',
  requirement: 'schemas/product/requirement.schema.json',
  term: 'schemas/product/term.schema.json',
  'bounded-context': 'schemas/product/bounded-context.schema.json',
  'use-case': 'schemas/product/use-case.schema.json',

  // Security
  'abuse-case': 'schemas/security/abuse-case.schema.json',
  'security-enclave': 'schemas/security/enclave.schema.json',
  'security-requirement': 'schemas/security/security-req.schema.json',
  'threat-actor': 'schemas/security/threat-actor.schema.json',

  // Privacy & Data Protection
  'data-asset': 'schemas/privacy/data-asset.schema.json',
  'privacy-ropa': 'schemas/privacy/privacy-ropa.schema.json',
  'privacy-requirement': 'schemas/privacy/privacy-req.schema.json',
  'privacy-policy': 'schemas/privacy/privacy-policy.schema.json',

  // Architecture
  'architecture-introduction': 'schemas/architecture/introduction-and-goals.schema.json',
  'architecture-decision-record': 'schemas/architecture/adr.schema.json',
  component: 'schemas/architecture/component.schema.json',

  // Safety
  hazard: 'schemas/safety/hazard.schema.json',
  'safety-requirement': 'schemas/safety/safety-req.schema.json',

  // Manuals
  'user-manual': 'schemas/manuals/user-manual.schema.json',
  'production-manual': 'schemas/manuals/production-manual.schema.json',

  // SDD
  tasks: 'schemas/sdd/tasks.schema.json',
  handoff: 'schemas/sdd/handoff.schema.json',
  'spec-change-proposal': 'schemas/sdd/proposal.schema.json',
  proposal: 'schemas/sdd/proposal.schema.json',
  'spec-design': 'schemas/sdd/design.schema.json',
  'spec-change-design': 'schemas/sdd/design.schema.json',
  design: 'schemas/sdd/design.schema.json',
  'delivery-spec': 'schemas/sdd/spec.schema.json',
  spec: 'schemas/sdd/spec.schema.json',
  'release-kpis': 'schemas/sdd/release-kpis.schema.json',
  'session-telemetry': 'schemas/sdd/session-telemetry.schema.json',

  // Compliance
  'license-manifest': 'schemas/compliance/license-manifest.schema.json',

  // Workflow
  'agent-handoff': 'schemas/workflow/agent-handoff.schema.json',

  // IDE
  'mcp-config': 'schemas/ide/mcp-config.schema.json',
};

const PREFIX_TAXONOMY: Array<[string, string]> = [
  ['ACT-THREAT-', 'threat-actor'],
  ['ACT-', 'actor'],
  ['UC-', 'use-case'],
  ['BR-', 'business-rule'],
  ['FR-', 'requirement'],
  ['QR-', 'requirement'],
  ['CON-', 'requirement'],
  ['JRN-', 'journey'],
  ['TERM-', 'term'],
  ['BC-', 'bounded-context'],
  ['ABUSE-', 'abuse-case'],
  ['SEC-ENC-', 'security-enclave'],
  ['SEC-REQ-', 'security-requirement'],
  ['DATA-ASSET-', 'data-asset'],
  ['PRIV-ROPA-', 'privacy-ropa'],
  ['PRIV-REQ-', 'privacy-requirement'],
  ['PRIV-POL-', 'privacy-policy'],
  ['POL-PRIV-', 'privacy-policy'],
  ['HAZ-', 'hazard'],
  ['SAF-REQ-', 'safety-requirement'],
  ['SAF-', 'safety-requirement'],
  ['ARCH-INTRO-', 'architecture-introduction'],
  ['ADR-', 'architecture-decision-record'],
  ['CMP-', 'component'],
  ['MAN-USER-', 'user-manual'],
  ['MAN-PROD-', 'production-manual'],
  ['MAN-LIC-', 'license-manifest'],
  ['LIC-MAN-', 'license-manifest'],
  ['LIC-', 'license-manifest'],
  ['TSK-', 'tasks'],
  ['HOF-WORKFLOW-', 'agent-handoff'],
  ['AHOF-', 'agent-handoff'],
  ['HOF-', 'handoff'],
  ['SPEC-', 'delivery-spec'],
  ['DSG-', 'spec-design'],
  ['CHG-', 'spec-change-proposal'],
  ['PATCH-', 'spec-change-proposal'],
  ['PROP-', 'spec-change-proposal'],
  ['KPI-REL-', 'release-kpis'],
  ['REL-KPI-', 'release-kpis'],
  ['TEL-SES-', 'session-telemetry'],
  ['SES-TEL-', 'session-telemetry'],
  ['TEL-', 'session-telemetry'],
  ['MCP-CFG-', 'mcp-config'],
  ['IDE-MCP-', 'mcp-config'],
  ['MCP-', 'mcp-config'],
];

export function inferArtifactTypeFromId(id: string): string | null {
  for (const [prefix, type] of PREFIX_TAXONOMY) {
    if (id.startsWith(prefix)) {
      return type;
    }
  }
  return null;
}

export function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

const EXCLUDED_SCHEMA_DIRS = new Set([
  'node_modules', '.git', 'dist', 'bin', 'obj', 'build', 'out', 'target',
  'coverage', '.changeset', 'scratch', 'test-scaffold', 'fixtures',
  'templates', 'examples', '.agent', '.agents', '.claude', '.cursor',
  '.github', '.vscode', '.vs', '.idea',
]);

function walkHandoffSidecars(dir: string, fileList: string[] = []): string[] {
  try {
    if (!fs.existsSync(dir)) return fileList;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!EXCLUDED_SCHEMA_DIRS.has(file) && !file.startsWith('temp-') && !file.startsWith('.temp-')) {
          walkHandoffSidecars(fullPath, fileList);
        }
      } else if (file === 'handoff.yaml' || file === 'handoff.template.yaml') {
        fileList.push(fullPath);
      }
    }
  } catch {
    // Ignore concurrent fs errors
  }
  return fileList;
}

function extractArtifactData(filePath: string, content: string): Record<string, unknown> | null {
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    try {
      const parsed = yaml.load(content);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return extractFrontmatter(content);
}

export interface JsonSchemaRule {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchemaRule;
  required?: string[];
  properties?: Record<string, JsonSchemaRule>;
  additionalProperties?: boolean | JsonSchemaRule;
  oneOf?: JsonSchemaRule[];
  anyOf?: JsonSchemaRule[];
  format?: string;
  [key: string]: unknown;
}

function getOrCompileSchema(schema: JsonSchemaRule): ValidateFunction {
  const schemaObj = schema as Record<string, unknown>;
  if (typeof schemaObj.$id === 'string') {
    const existing = ajvInstance.getSchema(schemaObj.$id);
    if (existing) return existing;
    return ajvInstance.compile(schema as object);
  }
  const cached = compiledSchemaCache.get(schema);
  if (cached) return cached;
  const compiled = ajvInstance.compile(schema as object);
  compiledSchemaCache.set(schema, compiled);
  return compiled;
}

export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchemaRule,
  propPath = ''
): string[] {
  if (!schema || typeof schema !== 'object') return [];
  try {
    const validate = getOrCompileSchema(schema);
    const valid = validate(value);
    if (valid || !validate.errors) return [];
    return validate.errors.map((err) => formatAjvError(err, propPath));
  } catch (err: unknown) {
    return [`Schema error: ${err instanceof Error ? err.message : String(err)}`];
  }
}

function findSchemaFile(relSchemaPath: string, rootDir: string): string | null {
  const fullPath = path.join(rootDir, relSchemaPath);
  if (fs.existsSync(fullPath)) return fullPath;
  const fallbackPath = path.join(process.cwd(), relSchemaPath);
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return null;
}

function loadJsonSchema(fullPath: string | null, relSchemaPath: string): JsonSchemaRule | null {
  if (fullPath && fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch {
      // Fallback to embedded schema on read or parse failure
    }
  }
  return STARTER_SCHEMAS_MAP[relSchemaPath] || null;
}

export function resolveSchemaForArtifact(
  frontmatter: Record<string, unknown>,
  rootDir: string
): { schemaPath: string; schema: JsonSchemaRule } | null {
  const type =
    (frontmatter.type as string) ||
    (typeof frontmatter.id === 'string' ? inferArtifactTypeFromId(frontmatter.id) : null);

  if (!type || !TYPE_TO_SCHEMA_MAP[type]) return null;

  const relSchemaPath = TYPE_TO_SCHEMA_MAP[type];
  const schema = loadJsonSchema(findSchemaFile(relSchemaPath, rootDir), relSchemaPath);
  return schema ? { schemaPath: relSchemaPath, schema } : null;
}

function loadSchemaFromPathOrType(
  schemaOrType: string,
  rootDir: string
): { schema: JsonSchemaRule | null; schemaId?: string } {
  if (schemaOrType.endsWith('.json')) {
    const fullPath = path.isAbsolute(schemaOrType) ? schemaOrType : findSchemaFile(schemaOrType, rootDir);
    const relNormalized = schemaOrType.replace(/\\/g, '/');
    const schema = loadJsonSchema(fullPath, relNormalized);
    return { schema, schemaId: schemaOrType };
  }
  const relPath = TYPE_TO_SCHEMA_MAP[schemaOrType];
  if (relPath) {
    const schema = loadJsonSchema(findSchemaFile(relPath, rootDir), relPath);
    return { schema, schemaId: relPath };
  }
  return { schema: null };
}

function resolveValidationSchema(
  schemaOrType: string | JsonSchemaRule,
  rootDir: string
): { schema: JsonSchemaRule | null; schemaId?: string } {
  if (typeof schemaOrType === 'string') {
    return loadSchemaFromPathOrType(schemaOrType, rootDir);
  }
  return { schema: schemaOrType, schemaId: (schemaOrType as { $id?: string }).$id };
}

export function validateArtifactSchema(
  frontmatter: Record<string, unknown>,
  schemaOrType: string | JsonSchemaRule,
  rootDir: string = process.cwd()
): ArtifactValidationResult {
  const { schema, schemaId } = resolveValidationSchema(schemaOrType, rootDir);
  const id = frontmatter.id as string | undefined;
  const type = frontmatter.type as string | undefined;

  if (!schema) {
    return {
      valid: false,
      filePath: '',
      id,
      type,
      errors: [`Schema could not be resolved for '${String(schemaOrType)}'`],
    };
  }

  const errors = validateAgainstSchema(frontmatter, schema);
  return {
    valid: errors.length === 0,
    filePath: '',
    id,
    type,
    schemaId,
    errors,
  };
}

function collectCandidateSchemaFiles(options: ArtifactSchemaOptions, rootDir: string): string[] {
  if (!options.targetPath) {
    return [...walkMdFiles(rootDir), ...walkHandoffSidecars(rootDir)];
  }
  const target = path.isAbsolute(options.targetPath) ? options.targetPath : path.join(rootDir, options.targetPath);
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isDirectory()) {
    return [...walkMdFiles(target), ...walkHandoffSidecars(target)];
  }
  if (target.endsWith('.md') || target.endsWith('.yaml') || target.endsWith('.yml')) {
    return [target];
  }
  return [];
}

const IGNORED_PATH_PREFIXES = [
  'process/',
  'reports/',
  '.changeset/',
  'scratch/',
  'node_modules/',
  'dist/',
  'temp-',
  'test-',
];

function isIgnoredArtifactPath(relPath: string, hasExplicitTarget: boolean): boolean {
  if (!relPath.includes('/')) return true;
  if (!hasExplicitTarget && relPath.startsWith('templates/')) return true;
  return IGNORED_PATH_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function buildEvaluationSuccess(
  relPath: string,
  id: string,
  type: string,
  schemaPath: string,
  errors: string[]
): { result: ArtifactValidationResult; violations: ArtifactSchemaViolation[] } {
  const violations = errors.map((err) => ({
    filePath: relPath,
    id,
    type,
    schemaId: schemaPath,
    message: err,
  }));
  return {
    result: {
      valid: errors.length === 0,
      filePath: relPath,
      id,
      type,
      schemaId: schemaPath,
      errors,
    },
    violations,
  };
}

function buildEvaluationFailure(
  relPath: string,
  err: unknown
): { result: ArtifactValidationResult; violations: ArtifactSchemaViolation[] } {
  return {
    result: { valid: false, filePath: relPath, errors: [`Failed: ${String(err)}`] },
    violations: [{ filePath: relPath, message: `Failed to read or parse frontmatter: ${String(err)}` }],
  };
}

function evaluateArtifactFile(
  file: string,
  relPath: string,
  rootDir: string
): { result: ArtifactValidationResult; violations: ArtifactSchemaViolation[] } | null {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const frontmatter = extractArtifactData(file, content);
    if (!frontmatter || !frontmatter.id) return null;

    const schemaInfo = resolveSchemaForArtifact(frontmatter, rootDir);
    if (!schemaInfo) return null;

    const errors = validateAgainstSchema(frontmatter, schemaInfo.schema);
    return buildEvaluationSuccess(
      relPath,
      String(frontmatter.id),
      String(frontmatter.type || ''),
      schemaInfo.schemaPath,
      errors
    );
  } catch (err: unknown) {
    return buildEvaluationFailure(relPath, err);
  }
}

function assembleSchemaResult(
  totalEvaluated: number,
  validCount: number,
  violations: ArtifactSchemaViolation[],
  results: ArtifactValidationResult[]
): ArtifactSchemaResult {
  return {
    success: violations.length === 0,
    totalEvaluated,
    validCount,
    invalidCount: violations.length > 0 ? totalEvaluated - validCount : 0,
    violations,
    results,
  };
}

export function verifyArtifactsSchemas(
  options: ArtifactSchemaOptions = {}
): ArtifactSchemaResult {
  const rootDir = options.rootDir || process.cwd();
  const filesToScan = collectCandidateSchemaFiles(options, rootDir);
  const violations: ArtifactSchemaViolation[] = [];
  const results: ArtifactValidationResult[] = [];
  let validCount = 0;
  let totalEvaluated = 0;

  for (const file of filesToScan) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    if (isIgnoredArtifactPath(relPath, Boolean(options.targetPath))) continue;

    const evaluation = evaluateArtifactFile(file, relPath, rootDir);
    if (!evaluation) continue;

    totalEvaluated++;
    if (evaluation.result.valid) {
      validCount++;
    }
    results.push(evaluation.result);
    violations.push(...evaluation.violations);
  }

  return assembleSchemaResult(totalEvaluated, validCount, violations, results);
}

