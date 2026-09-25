import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

function extractFrontmatter(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`Frontmatter missing in ${filePath}`);
  }
  return yaml.load(match[1]) as Record<string, unknown>;
}

describe('Manuals Schemas & Templates Compliance Suite', () => {
  const userSchemaPath = path.join(repoRoot, 'schemas/manuals/user-manual.schema.json');
  const prodSchemaPath = path.join(repoRoot, 'schemas/manuals/production-manual.schema.json');

  it('should load and validate user-manual JSON Schema definition', () => {
    expect(fs.existsSync(userSchemaPath)).toBe(true);
    const raw = fs.readFileSync(userSchemaPath, 'utf-8');
    const schema = JSON.parse(raw);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('allowed-roles');
    expect(schema.required).toContain('target-audience');
    expect(schema.required).toContain('applies-to-version');
  });

  it('should load and validate production-manual JSON Schema definition', () => {
    expect(fs.existsSync(prodSchemaPath)).toBe(true);
    const raw = fs.readFileSync(prodSchemaPath, 'utf-8');
    const schema = JSON.parse(raw);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('applies-to-version');
    expect(schema.required).toContain('target-audience');
  });

  it('should validate user-manual template frontmatter and structure', () => {
    const templatePath = path.join(repoRoot, 'templates/manuals/user-manual.template.md');
    expect(fs.existsSync(templatePath)).toBe(true);

    const fm = extractFrontmatter(templatePath);
    expect(fm.type).toBe('user-manual');
    expect(String(fm.id)).toMatch(/^MAN-USER-[A-Z0-9]+(-[A-Z0-9]+)*$/);
    expect(Array.isArray(fm['allowed-roles'])).toBe(true);
    expect((fm['allowed-roles'] as string[]).length).toBeGreaterThan(0);
    expect(Array.isArray(fm['target-audience'])).toBe(true);
    expect(Array.isArray(fm['journeys-covered'])).toBe(true);
    expect(Array.isArray(fm['use-cases-covered'])).toBe(true);

    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content.includes('User Role') || content.includes('Roles de Usuario')).toBe(true);
    expect(content.includes('Permissions Matrix') || content.includes('Matriz de Permisos')).toBe(true);
    expect(content.includes('Version and User Platform Compatibility') || content.includes('Matriz de Compatibilidad de Versiones y Plataformas de Usuario')).toBe(true);
    expect(content.includes('Client-Server Compatibility') || content.includes('Compatibilidad Cliente-Servidor')).toBe(true);
    expect(content.includes('Authorized Role') || content.includes('Roles Autorizados')).toBe(true);
    expect(content.includes('Installation, Access, and Configuration') || content.includes('Instalación, Acceso y Configuración')).toBe(true);
    expect(content.includes('System Messages') || content.includes('Catálogo de Mensajes')).toBe(true);
  });

  it('should validate production-manual template frontmatter and structure', () => {
    const templatePath = path.join(repoRoot, 'templates/manuals/production-manual.template.md');
    expect(fs.existsSync(templatePath)).toBe(true);

    const fm = extractFrontmatter(templatePath);
    expect(fm.type).toBe('production-manual');
    expect(String(fm.id)).toMatch(/^MAN-PROD-[A-Z0-9]+(-[A-Z0-9]+)*$/);
    expect(Array.isArray(fm['target-audience'])).toBe(true);
    expect(Array.isArray(fm['components-covered'])).toBe(true);
    expect(Array.isArray(fm['enclaves-involved'])).toBe(true);

    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content.includes('Deterministic Release Regeneration') || content.includes('Regeneración Determinista de Releases')).toBe(true);
    expect(content.includes('Version, Infrastructure, and Migration Compatibility') || content.includes('Matriz de Compatibilidad de Versiones, Infraestructura y Migración')).toBe(true);
    expect(content.includes('N-1') || content.includes('$N-1$')).toBe(true);
    expect(content.includes('Upgrade & Rollback') || content.includes('Rutas de Actualización y Marcha Atrás')).toBe(true);
    expect(content.includes('Build Tool') || content.includes('Herramientas de Compilación')).toBe(true);
    expect(content.includes('Libraries, Dependencies, and Vertex Graph') || content.includes('Librerías, Dependencias y Grafo de Vértices')).toBe(true);
    expect(content.includes('CI/CD Architecture and Pipelines') || content.includes('Arquitectura y Pipelines de CI/CD')).toBe(true);
    expect(content.includes('Deployment Strategy and Procedure') || content.includes('Estrategia y Procedimiento de Despliegue')).toBe(true);
    expect(content.includes('Troubleshooting') || content.includes('Resolución de Errores Probables y Troubleshooting')).toBe(true);
  });

  it('should validate SentinelCore User Manual instance', () => {
    const examplePath = path.join(repoRoot, 'examples/sentinel-core/manuals/MAN-USER-SENTINELCORE.md');
    expect(fs.existsSync(examplePath)).toBe(true);

    const fm = extractFrontmatter(examplePath);
    expect(fm.id).toBe('MAN-USER-SENTINELCORE');
    expect(fm.type).toBe('user-manual');
    expect(fm.status).toBe('active');
    expect(fm['allowed-roles']).toContain('ACT-DRONE-OPERATOR');
    expect(fm['allowed-roles']).toContain('ACT-AUTONOMOUS-UAV');
    expect(fm['journeys-covered']).toContain('JRN-UAV-SURVEILLANCE');
    expect(fm['use-cases-covered']).toContain('UC-STREAM-TELEMETRY');

    const content = fs.readFileSync(examplePath, 'utf-8');
    expect(content).toContain('ACT-DRONE-OPERATOR');
    expect(content).toContain('ACT-AUTONOMOUS-UAV');
    expect(content).toContain('Matriz de Compatibilidad de Versiones y Plataformas de Usuario');
    expect(content).toContain('Compatibilidad de Firmware UAV');
    expect(content).toContain('JRN-UAV-SURVEILLANCE');
    expect(content).toContain('UC-STREAM-TELEMETRY');
    expect(content).toContain('BR-TELEMETRY-VALIDITY');
    expect(content).toContain('MSG-TEL-100');
    expect(content).toContain('MSG-AUTH-401');
  });

  it('should validate SentinelCore Production Manual instance', () => {
    const examplePath = path.join(repoRoot, 'examples/sentinel-core/manuals/MAN-PROD-SENTINELCORE.md');
    expect(fs.existsSync(examplePath)).toBe(true);

    const fm = extractFrontmatter(examplePath);
    expect(fm.id).toBe('MAN-PROD-SENTINELCORE');
    expect(fm.type).toBe('production-manual');
    expect(fm.status).toBe('active');
    expect(fm['components-covered']).toContain('CMP-TELEMETRY-INGEST');
    expect(fm['enclaves-involved']).toContain('SEC-ENC-DMZ-INGEST');

    const content = fs.readFileSync(examplePath, 'utf-8');
    expect(content).toContain('CMP-TELEMETRY-INGEST');
    expect(content).toContain('SEC-ENC-DMZ-INGEST');
    expect(content).toContain('Matriz de Compatibilidad de Versiones, Infraestructura y Migración');
    expect(content).toContain('TEL-SCHEMA-v1.0');
    expect(content).toContain('Reproducible Builds');
    expect(content).toContain('pnpm-lock.yaml');
    expect(content).toContain('CycloneDX');
    expect(content).toContain('Canary Deployment');
    expect(content).toContain('Handshake mTLS');
    expect(content).toContain('Rollback');
  });

  it('should validate safety-requirement JSON Schema definition', () => {
    const safetySchemaPath = path.join(repoRoot, 'schemas/safety/safety-req.schema.json');
    expect(fs.existsSync(safetySchemaPath)).toBe(true);
    const raw = fs.readFileSync(safetySchemaPath, 'utf-8');
    const schema = JSON.parse(raw);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('safety-domain');
    expect(schema.required).toContain('safety-integrity-level');
    expect(schema.required).toContain('mitigates-hazard');
    expect(schema.required).toContain('fail-safe-action');
  });

  it('should validate safety-requirement template frontmatter and structure', () => {
    const templatePath = path.join(repoRoot, 'templates/safety/safety-req.template.md');
    expect(fs.existsSync(templatePath)).toBe(true);

    const fm = extractFrontmatter(templatePath);
    expect(fm.type).toBe('safety-requirement');
    expect(String(fm.id)).toMatch(/^SAF-REQ-[A-Z0-9]+(-[A-Z0-9]+)*$/);
    expect(fm['safety-domain']).toBe('flight-control');
    expect(fm['safety-integrity-level']).toBe('DAL-B');
    expect(Array.isArray(fm['mitigates-hazard'])).toBe(true);
    expect(fm['fail-safe-action']).toBe('SAFE_STATE_ACTION');
    expect(fm['fault-tolerance-time-ms']).toBe(100);

    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content.includes('Safety Statement') || content.includes('Enunciado Normativo de Seguridad Operacional')).toBe(true);
    expect(content.includes('Hazard Mitigation') || content.includes('Matriz de Mitigación de Peligros')).toBe(true);
    expect(content).toContain('@safety @failsafe');
  });
});
