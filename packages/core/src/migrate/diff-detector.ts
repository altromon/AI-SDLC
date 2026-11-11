/**
 * DiffDetector: Deterministic Byte-by-Byte SHA-256 with Unix LF Normalization
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001
 */

import * as crypto from 'crypto';

export class DiffDetector {
  /**
   * Normalizes content by converting Windows CRLF (\r\n) to Unix LF (\n)
   * and computes a lowercase hex SHA-256 digest.
   */
  public computeDigest(content: string): string {
    const normalized = content.replace(/\r\n/g, '\n');
    return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
  }

  /**
   * Compares two content strings for deterministic equality under LF normalization.
   */
  public isEqual(contentA: string, contentB: string): boolean {
    return this.computeDigest(contentA) === this.computeDigest(contentB);
  }
}
