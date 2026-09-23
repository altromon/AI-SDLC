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

export const TYPE_TO_SCHEMA_MAP: Record<string, string> = {
  // Product
  actor: 'schemas/product/actor.schema.json',
  'business-rule': 'schemas/product/business-rule.schema.json',
  journey: 'schemas/product/journey.schema.json',
  requirement: 'schemas/product/requirement.schema.json',
  term: 'schemas/product/term.schema.json',
  'use-case': 'schemas/product/use-case.schema.json',

  // Security
  'abuse-case': 'schemas/security/abuse-case.schema.json',
  'security-enclave': 'schemas/security/enclave.schema.json',
  'security-requirement': 'schemas/security/security-req.schema.json',
  'threat-actor': 'schemas/security/threat-actor.schema.json',

  // Architecture
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
};

export function inferArtifactTypeFromId(id: string): string | null {
  if (id.startsWith('ACT-THREAT-')) return 'threat-actor';
  if (id.startsWith('ACT-')) return 'actor';
  if (id.startsWith('UC-')) return 'use-case';
  if (id.startsWith('BR-')) return 'business-rule';
  if (id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-')) return 'requirement';
  if (id.startsWith('JRN-')) return 'journey';
  if (id.startsWith('TERM-')) return 'term';
  if (id.startsWith('ABUSE-')) return 'abuse-case';
  if (id.startsWith('SEC-ENC-')) return 'security-enclave';
  if (id.startsWith('SEC-REQ-')) return 'security-requirement';
  if (id.startsWith('HAZ-')) return 'hazard';
  if (id.startsWith('SAF-REQ-') || id.startsWith('SAF-')) return 'safety-requirement';
  if (id.startsWith('ADR-')) return 'architecture-decision-record';
  if (id.startsWith('CMP-')) return 'component';
  if (id.startsWith('MAN-USER-')) return 'user-manual';
  if (id.startsWith('MAN-PROD-')) return 'production-manual';
  if (id.startsWith('TSK-')) return 'tasks';
  if (id.startsWith('HOF-')) return 'handoff';
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

/**
 * Deterministic JSON Schema validator matching Draft 2020-12 core specifications
 */
export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchemaRule,
  propPath = ''
): string[] {
  const errors: string[] = [];
  const currentProp = propPath || 'root';

  // 1. const validation
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`'${currentProp}' must equal '${schema.const}', received '${String(value)}'`);
    return errors;
  }

  // 2. enum validation
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(
      `'${currentProp}' must be one of [${schema.enum.join(', ')}], received '${String(value)}'`
    );
    return errors;
  }

  // 3. oneOf validation
  if (schema.oneOf) {
    let matchCount = 0;
    for (const sub of schema.oneOf) {
      if (validateAgainstSchema(value, sub, propPath).length === 0) {
        matchCount++;
      }
    }
    if (matchCount !== 1) {
      errors.push(`'${currentProp}' must match exactly one sub-schema in oneOf`);
    }
    return errors;
  }

  // 4. anyOf validation
  if (schema.anyOf) {
    const anyMatched = schema.anyOf.some(
      (sub) => validateAgainstSchema(value, sub, propPath).length === 0
    );
    if (!anyMatched) {
      errors.push(`'${currentProp}' did not match any allowed alternative in anyOf`);
    }
    return errors;
  }

  // 5. type validation
  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    let actualType: string = typeof value;
    if (value === null) actualType = 'null';
    else if (Array.isArray(value)) actualType = 'array';
    else if (actualType === 'number' && Number.isInteger(value)) actualType = 'integer';

    const matchesType = allowedTypes.some((t) => {
      if (t === actualType) return true;
      if (t === 'number' && actualType === 'integer') return true;
      return false;
    });

    if (!matchesType) {
      errors.push(
        `'${currentProp}' expected type [${allowedTypes.join('|')}], received '${actualType}'`
      );
      return errors;
    }
  }

  // If null and allowed, skip further string/number/object checks
  if (value === null) {
    return errors;
  }

  // 6. String validations
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`'${currentProp}' length must be >= ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`'${currentProp}' length must be <= ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`'${currentProp}' value '${value}' does not match pattern ${schema.pattern}`);
      }
    }
    if (schema.format === 'date') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value) || isNaN(Date.parse(value))) {
        errors.push(`'${currentProp}' must be a valid ISO-8601 date string (YYYY-MM-DD)`);
      }
    }
  }

  // 7. Number validations
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`'${currentProp}' must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`'${currentProp}' must be <= ${schema.maximum}`);
    }
  }

  // 8. Array validations
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`'${currentProp}' items count must be >= ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`'${currentProp}' items count must be <= ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, idx) => {
        errors.push(...validateAgainstSchema(item, schema.items!, `${currentProp}[${idx}]`));
      });
    }
  }

  // 9. Object validations
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    // Check required fields
    if (schema.required) {
      for (const reqKey of schema.required) {
        if (!(reqKey in record) || record[reqKey] === undefined) {
          errors.push(`'${currentProp}' missing required field '${reqKey}'`);
        }
      }
    }

    // Check properties
    const properties = schema.properties || {};
    for (const [key, propVal] of Object.entries(record)) {
      if (key in properties) {
        errors.push(
          ...validateAgainstSchema(
            propVal,
            properties[key],
            propPath ? `${propPath}.${key}` : key
          )
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`'${currentProp}' contains disallowed extra property '${key}'`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(
          ...validateAgainstSchema(
            propVal,
            schema.additionalProperties as JsonSchemaRule,
            propPath ? `${propPath}.${key}` : key
          )
        );
      }
    }
  }

  return errors;
}

export function resolveSchemaForArtifact(
  frontmatter: Record<string, unknown>,
  rootDir: string
): { schemaPath: string; schema: JsonSchemaRule } | null {
  const type =
    (frontmatter.type as string) ||
    (typeof frontmatter.id === 'string' ? inferArtifactTypeFromId(frontmatter.id) : null);

  if (!type || !TYPE_TO_SCHEMA_MAP[type]) {
    return null;
  }

  const relSchemaPath = TYPE_TO_SCHEMA_MAP[type];
  let fullSchemaPath = path.join(rootDir, relSchemaPath);
  if (!fs.existsSync(fullSchemaPath)) {
    const fallbackPath = path.join(process.cwd(), relSchemaPath);
    if (fs.existsSync(fallbackPath)) {
      fullSchemaPath = fallbackPath;
    } else {
      return null;
    }
  }

  try {
    const raw = fs.readFileSync(fullSchemaPath, 'utf-8');
    const schema = JSON.parse(raw) as JsonSchemaRule;
    return { schemaPath: relSchemaPath, schema };
  } catch {
    return null;
  }
}

export function validateArtifactSchema(
  frontmatter: Record<string, unknown>,
  schemaOrType: string | JsonSchemaRule,
  rootDir: string = process.cwd()
): ArtifactValidationResult {
  let schema: JsonSchemaRule | null = null;
  let schemaId: string | undefined;

  if (typeof schemaOrType === 'string') {
    if (schemaOrType.endsWith('.json')) {
      let fullPath = path.isAbsolute(schemaOrType)
        ? schemaOrType
        : path.join(rootDir, schemaOrType);
      if (!fs.existsSync(fullPath)) {
        const fallbackPath = path.join(process.cwd(), schemaOrType);
        if (fs.existsSync(fallbackPath)) {
          fullPath = fallbackPath;
        }
      }
      if (fs.existsSync(fullPath)) {
        schema = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        schemaId = schemaOrType;
      }
    } else if (TYPE_TO_SCHEMA_MAP[schemaOrType]) {
      const relPath = TYPE_TO_SCHEMA_MAP[schemaOrType];
      let fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) {
        const fallbackPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(fallbackPath)) {
          fullPath = fallbackPath;
        }
      }
      if (fs.existsSync(fullPath)) {
        schema = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        schemaId = relPath;
      }
    }
  }
 else {
    schema = schemaOrType;
    schemaId = (schema as { $id?: string }).$id;
  }

  if (!schema) {
    return {
      valid: false,
      filePath: '',
      id: frontmatter.id as string | undefined,
      type: frontmatter.type as string | undefined,
      errors: [`Schema could not be resolved for '${String(schemaOrType)}'`],
    };
  }

  const errors = validateAgainstSchema(frontmatter, schema);
  return {
    valid: errors.length === 0,
    filePath: '',
    id: frontmatter.id as string | undefined,
    type: frontmatter.type as string | undefined,
    schemaId,
    errors,
  };
}

export function verifyArtifactsSchemas(
  options: ArtifactSchemaOptions = {}
): ArtifactSchemaResult {
  const rootDir = options.rootDir || process.cwd();
  let filesToScan: string[] = [];

  if (options.targetPath) {
    const target = path.isAbsolute(options.targetPath)
      ? options.targetPath
      : path.join(rootDir, options.targetPath);
    if (fs.existsSync(target)) {
      if (fs.statSync(target).isDirectory()) {
        filesToScan = walkMdFiles(target);
      } else if (target.endsWith('.md')) {
        filesToScan = [target];
      }
    }
  } else {
    filesToScan = walkMdFiles(rootDir);
  }

  const violations: ArtifactSchemaViolation[] = [];
  const results: ArtifactValidationResult[] = [];
  let validCount = 0;
  let totalEvaluated = 0;

  for (const file of filesToScan) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');

    // Skip root-level markdown documents, process guides, reports, changesets
    if (
      relPath.startsWith('process/') ||
      relPath.startsWith('reports/') ||
      relPath.startsWith('.changeset/') ||
      relPath.startsWith('node_modules/') ||
      relPath.startsWith('dist/') ||
      !relPath.includes('/')
    ) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      if (!frontmatter || !frontmatter.id) {
        continue;
      }

      const schemaInfo = resolveSchemaForArtifact(frontmatter, rootDir);
      if (!schemaInfo) {
        continue;
      }

      totalEvaluated++;
      const errors = validateAgainstSchema(frontmatter, schemaInfo.schema);
      const isValid = errors.length === 0;

      if (isValid) {
        validCount++;
        results.push({
          valid: true,
          filePath: relPath,
          id: String(frontmatter.id),
          type: String(frontmatter.type || ''),
          schemaId: schemaInfo.schemaPath,
          errors: [],
        });
      } else {
        results.push({
          valid: false,
          filePath: relPath,
          id: String(frontmatter.id),
          type: String(frontmatter.type || ''),
          schemaId: schemaInfo.schemaPath,
          errors,
        });

        for (const err of errors) {
          violations.push({
            filePath: relPath,
            id: String(frontmatter.id),
            type: String(frontmatter.type || ''),
            schemaId: schemaInfo.schemaPath,
            message: err,
          });
        }
      }
    } catch (err: unknown) {
      violations.push({
        filePath: relPath,
        message: `Failed to read or parse frontmatter: ${String(err)}`,
      });
    }
  }

  return {
    success: violations.length === 0,
    totalEvaluated,
    validCount,
    invalidCount: violations.length > 0 ? totalEvaluated - validCount : 0,
    violations,
    results,
  };
}
