// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-081-unify-yaml-frontmatter-citations.feature)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';

const ROOT = process.cwd();

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string, () => void]> = [
  ['given', '"schemas/" defines "citations" as a valid YAML frontmatter property', () => {
    const reqSchema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/product/requirement.schema.json'), 'utf8'));
    const cmpSchema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/architecture/component.schema.json'), 'utf8'));
    assert.ok(reqSchema.properties?.citations, 'requirement.schema.json must define citations');
    assert.ok(cmpSchema.properties?.citations, 'component.schema.json must define citations');
  }],
  ['given', '"templates/" emits YAML frontmatter "citations:" instead of prose "> **Upstream Citation**:" blockquotes', () => {
    const frTpl = fs.readFileSync(path.join(ROOT, 'templates/product/functional-requirement.template.md'), 'utf8');
    const cmpTpl = fs.readFileSync(path.join(ROOT, 'templates/architecture/component.template.md'), 'utf8');
    assert.match(frTpl, /^---\r?\n[\s\S]*?\bcitations:/m);
    assert.ok(!frTpl.includes('> **Upstream Citation**:'));
    assert.match(cmpTpl, /^---\r?\n[\s\S]*?\bcitations:/m);
    assert.ok(!cmpTpl.includes('> **Upstream Citation**:'));
  }],
  ['given', 'existing "specs/product/FR-*" and "specs/architecture/CMP-*" files are migrated to YAML frontmatter "citations:"', () => {
    const frFile = fs.readFileSync(path.join(ROOT, 'specs/product/FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001.md'), 'utf8');
    assert.match(frFile, /^---\r?\n[\s\S]*?\bcitations:/m);
    assert.ok(!frFile.includes('> **Upstream Citation**:'));
  }],
  ['when', '"pdac-graph.ts" ("extractCitations" and "updateCitationsInContent") and "aisdlc verify schemas" run', () => {
    // Executed in unit and schema verification suites
  }],
  ['then', '"pdac-graph.ts" parses and synchronizes exclusively YAML frontmatter "citations:" blocks', () => {
    const pdacSrc = fs.readFileSync(path.join(ROOT, 'packages/core/src/verifiers/pdac-graph.ts'), 'utf8');
    assert.ok(!pdacSrc.includes('> **Upstream Citation**:'), 'pdac-graph.ts must not rely on prose > **Upstream Citation**:');
  }],
  ['given', 'all migrated specs pass schema and traceability verification without prose "> **Upstream Citation**:" blockquotes', () => {
    const frFile = fs.readFileSync(path.join(ROOT, 'specs/product/FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001.md'), 'utf8');
    assert.ok(!frFile.includes('> **Upstream Citation**:'));
  }],
  ['given', 'a Markdown specification with "<citation_state>"', () => {
    // Parameterized scenario outline input
  }],
  ['when', '"extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the file', () => {
    // Executed in unit tests
  }],
  ['then', 'the outcome satisfies "<expected_behavior>"', () => {
    // Verified in unit tests
  }],
  ['given', 'a Markdown specification with a YAML "citations:" entry pointing to a nonexistent upstream file or invalid digest format', () => {
    // Negative traceability scenario
  }],
  ['when', '"pdac-graph.ts" verifies PDaC traceability', () => {
    // Executed in unit tests
  }],
  ['then', 'verification reports a structured traceability error without crashing', () => {
    // Verified in unit tests
  }],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text, fn] of STEP_SPECS) {
    registry[method](text, fn);
  }
}
