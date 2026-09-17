/**
 * AI-SDLC: CycloneDX 1.5 JSON SBOM & Third-Party Notices Generator
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { CycloneDxBom, CycloneDxComponent, ScannedDependency } from '../../types/index.js';

export interface SbomGenerateOptions {
  rootDir?: string;
  projectName?: string;
  projectVersion?: string;
}

export function buildCycloneDxComponent(dep: ScannedDependency): CycloneDxComponent {
  const comp: CycloneDxComponent = {
    type: 'library',
    name: dep.name,
    version: dep.version,
    purl: dep.purl || `pkg:npm/${dep.name}@${dep.version}`,
    author: dep.author,
  };

  if (dep.spdxLicense && dep.spdxLicense !== 'UNKNOWN') {
    comp.licenses = [
      {
        license: {
          id: dep.spdxLicense,
        },
      },
    ];
  } else {
    comp.licenses = [
      {
        license: {
          name: 'NOASSERTION',
        },
      },
    ];
  }

  return comp;
}

export function generateCycloneDxSbom(
  dependencies: ScannedDependency[],
  options: SbomGenerateOptions = {}
): CycloneDxBom {
  let name = options.projectName || 'ai-sdlc-project';
  let version = options.projectVersion || '1.0.0';

  if (options.rootDir) {
    const pkgPath = path.join(options.rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) name = pkg.name;
        if (pkg.version) version = pkg.version;
      } catch {
        // Ignore read error
      }
    }
  }

  const components = dependencies.map(buildCycloneDxComponent);

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'AI-SDLC',
          name: '@ai-sdlc/core',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name,
        version,
      },
    },
    components,
  };
}

function safeWriteFileSync(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let attempts = 5;
  while (attempts > 0) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return;
    } catch (err) {
      attempts--;
      if (attempts === 0) throw err;
      const start = Date.now();
      while (Date.now() - start < 100) {
        // wait
      }
    }
  }
}

export function writeCycloneDxSbom(sbom: CycloneDxBom, outputPath: string): void {
  safeWriteFileSync(outputPath, JSON.stringify(sbom, null, 2));
}

export function generateThirdPartyNotices(
  dependencies: ScannedDependency[],
  projectName = 'AI-SDLC'
): string {
  const lines = [
    `# 📜 Third-Party Software Notices and Information`,
    ``,
    `> **Proyecto:** ${projectName}`,
    `> **Fecha:** ${new Date().toISOString().split('T')[0]}`,
    `> **Total Componentes:** ${dependencies.length}`,
    ``,
    `Este documento contiene los avisos de copyright y términos de licencia aplicables a los componentes de terceros utilizados en este proyecto.`,
    ``,
    `---`,
    ``,
    `## Resumen de Licencias de Terceros`,
    ``,
    `| Paquete | Versión | Licencia SPDX |`,
    `| :--- | :--- | :---: |`,
  ];

  for (const dep of dependencies) {
    lines.push(`| **\`${dep.name}\`** | \`${dep.version}\` | \`${dep.spdxLicense}\` |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Textos de Licencia y Atribuciones');
  lines.push('');

  for (const dep of dependencies) {
    lines.push(`### ${dep.name}@${dep.version}`);
    lines.push(`- **Licencia:** \`${dep.spdxLicense}\``);
    if (dep.author) lines.push(`- **Autor:** ${dep.author}`);
    if (dep.repository) lines.push(`- **Repositorio:** ${dep.repository}`);

    if (dep.licenseFile && fs.existsSync(dep.licenseFile)) {
      try {
        const text = fs.readFileSync(dep.licenseFile, 'utf-8').trim();
        lines.push('');
        lines.push('```');
        lines.push(text.slice(0, 1000) + (text.length > 1000 ? '\n... (texto truncado)' : ''));
        lines.push('```');
      } catch {
        // Ignore read error
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function writeThirdPartyNotices(content: string, outputPath: string): void {
  safeWriteFileSync(outputPath, content);
}
