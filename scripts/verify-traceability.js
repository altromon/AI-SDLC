#!/usr/bin/env node
/**
 * AI-SDLC: Verificador de Trazabilidad 360° (Node Entrypoint)
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsScript = path.join(__dirname, 'verify-traceability.ts');

const result = spawnSync('npx', ['tsx', tsScript], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 0);
