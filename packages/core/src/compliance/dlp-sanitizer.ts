/**
 * DlpSanitizer Port & Adapter (CMP-051)
 * Masks URI credentials, Bearer tokens, PEM keys, and developer emails/PII.
 */

export class DlpSanitizer {
  private uriCredsRegex = /:\/\/[^:/@\s]+:[^/@\s]+@/g;
  private bearerTokenRegex = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g;
  private pemKeyRegex = /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----/g;
  private emailRegex = /\b[A-Za-z0-9._%+-]+@(?!example\.com|localhost|test\.local)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    let res = text.replace(this.pemKeyRegex, '[REDACTED_SECRET_KEY]');
    res = res.replace(this.uriCredsRegex, '://[REDACTED_SECRET]@');
    res = res.replace(this.bearerTokenRegex, 'Bearer [REDACTED_SECRET]');
    res = res.replace(this.emailRegex, '[REDACTED_PII]');
    return res;
  }

  sanitizeDiagnostics(diagnostics: string[]): string[] {
    if (!Array.isArray(diagnostics)) return [];
    return diagnostics.map((d) => this.sanitizeText(d));
  }

  sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this.sanitizeText(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        result[key] = this.sanitizeObject(val);
      }
      return result as unknown as T;
    }
    return obj;
  }
}
