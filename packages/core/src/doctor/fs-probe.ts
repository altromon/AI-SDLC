/**
 * AI-SDLC: File System Probe and Native Adapter
 */

import * as fs from 'node:fs';
import { IFileSystemProbe } from '../types/doctor.js';

export class NativeFileSystemProbeAdapter implements IFileSystemProbe {
  public async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }

  public async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  public async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  public async isExecutable(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  public isSymbolicLink(filePath: string): boolean {
    try {
      const stats = fs.lstatSync(filePath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }
}
