/**
 * AI-SDLC: Deterministic Time & Reproducibility Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as crypto from 'crypto';

const UUID_V5_NAMESPACE_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';

/**
 * Resolves a deterministic Date instance respecting SOURCE_DATE_EPOCH
 * or Git HEAD commit timestamp fallback, enabling bit-for-bit reproducible artifacts.
 */
export function resolveDeterministicDate(rootDir?: string): Date {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch) {
    const parsed = parseInt(epoch, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return new Date(parsed * 1000);
    }
  }

  const targetDir = rootDir || process.cwd();
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    try {
      const gitOut = execFileSync('git', ['log', '-1', '--format=%ct'], {
        cwd: targetDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      const parsed = parseInt(gitOut, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return new Date(parsed * 1000);
      }
    } catch {
      // Fallback if git is not available or shallow repository
    }
  }

  return new Date();
}

/**
 * Generates an RFC 4122 compliant UUIDv5 from a namespace and name string
 * without external dependencies.
 */
export function generateDeterministicUuidV5(name: string, namespace = UUID_V5_NAMESPACE_OID): string {
  const nsHex = namespace.replace(/-/g, '');
  const nsBytes = Buffer.from(nsHex, 'hex');
  const nameBytes = Buffer.from(name, 'utf-8');

  const hash = crypto.createHash('sha1').update(nsBytes).update(nameBytes).digest();

  // Set version 5 (0101) in byte 6
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant 1 (10xx) in byte 8
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex').substring(0, 32);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}
