/**
 * PolicyRatchetEnforcer: Preservation of Stricter Local Quality and Security Thresholds
 * Cites: SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001, CMP-053-MIGRATE-ENGINE
 */

export interface RatchetOptions {
  allowPolicyDowngrade?: boolean;
}

interface CoveragePolicy {
  min?: number;
}

interface ComplexityPolicy {
  maxCyclomatic?: number;
}

interface QualitySection {
  coverage?: CoveragePolicy;
  complexity?: ComplexityPolicy;
}

interface LicenseSection {
  blocked?: string[];
}

interface DlpRule {
  id: string;
  pattern: string;
}

interface PolicyPayload {
  quality?: QualitySection;
  licenses?: LicenseSection;
  rules?: DlpRule[];
  [key: string]: unknown;
}

function mergeCoverage(localCov: CoveragePolicy | undefined, upstreamCov: CoveragePolicy | undefined, allowDowngrade?: boolean): CoveragePolicy | undefined {
  if (!localCov && !upstreamCov) return undefined;
  const result: CoveragePolicy = { ...upstreamCov };
  const localMin = localCov?.min;
  const upstreamMin = upstreamCov?.min;

  if (localMin !== undefined && upstreamMin !== undefined) {
    if (upstreamMin < localMin && allowDowngrade === false) {
      throw new Error('ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED: Attempting to downgrade coverage threshold');
    }
    result.min = Math.max(localMin, upstreamMin);
  } else if (localMin !== undefined) {
    result.min = localMin;
  }
  return result;
}

function mergeComplexity(localComp: ComplexityPolicy | undefined, upstreamComp: ComplexityPolicy | undefined): ComplexityPolicy | undefined {
  if (!localComp && !upstreamComp) return undefined;
  const result: ComplexityPolicy = { ...upstreamComp };
  const localCyclo = localComp?.maxCyclomatic;
  const upstreamCyclo = upstreamComp?.maxCyclomatic;

  if (localCyclo !== undefined && upstreamCyclo !== undefined) {
    result.maxCyclomatic = Math.min(localCyclo, upstreamCyclo);
  } else if (localCyclo !== undefined) {
    result.maxCyclomatic = localCyclo;
  }
  return result;
}

function mergeLicenses(localLicenses: LicenseSection | undefined, upstreamLicenses: LicenseSection | undefined): LicenseSection | undefined {
  if (!localLicenses?.blocked && !upstreamLicenses?.blocked) return upstreamLicenses;
  const upstreamBlocked = (upstreamLicenses?.blocked || []).map((l: string) => l.toUpperCase());
  const localBlocked = (localLicenses?.blocked || []).map((l: string) => l.toUpperCase());
  return {
    ...upstreamLicenses,
    blocked: Array.from(new Set([...upstreamBlocked, ...localBlocked])),
  };
}

function mergeDlpRules(localRules: DlpRule[] | undefined, upstreamRules: DlpRule[] | undefined): DlpRule[] | undefined {
  if (!localRules) return upstreamRules;
  const mergedRules = [...(upstreamRules || [])];
  const existingIds = new Set(mergedRules.map(r => r.id));
  for (const rule of localRules) {
    if (!existingIds.has(rule.id)) {
      mergedRules.push(rule);
      existingIds.add(rule.id);
    }
  }
  return mergedRules;
}

function validateNumericField(val: unknown, fieldName: string): void {
  if (val !== undefined && (typeof val !== 'number' || Number.isNaN(val))) {
    throw new Error(`ERR_INVALID_POLICY_FORMAT: ${fieldName} must be a valid number`);
  }
}

export class PolicyRatchetEnforcer {
  public enforceRatchet(localPolicy: PolicyPayload, upstreamPolicy: PolicyPayload, options: RatchetOptions = {}): PolicyPayload {
    this.validatePolicyStructure(localPolicy);
    this.validatePolicyStructure(upstreamPolicy);

    if (options.allowPolicyDowngrade) {
      return JSON.parse(JSON.stringify(upstreamPolicy)) as PolicyPayload;
    }

    const merged = JSON.parse(JSON.stringify(upstreamPolicy)) as PolicyPayload;

    if (localPolicy.quality) {
      if (!merged.quality) merged.quality = {};
      merged.quality.coverage = mergeCoverage(localPolicy.quality.coverage, merged.quality.coverage, options.allowPolicyDowngrade);
      merged.quality.complexity = mergeComplexity(localPolicy.quality.complexity, merged.quality.complexity);
    }

    if (localPolicy.licenses) {
      merged.licenses = mergeLicenses(localPolicy.licenses, merged.licenses);
    }

    if (localPolicy.rules) {
      merged.rules = mergeDlpRules(localPolicy.rules, merged.rules);
    }

    return merged;
  }

  private validatePolicyStructure(policy: PolicyPayload): void {
    if (!policy || typeof policy !== 'object') return;
    const q = policy.quality;
    if (q) {
      validateNumericField(q.coverage?.min, 'coverage.min');
      validateNumericField(q.complexity?.maxCyclomatic, 'complexity.maxCyclomatic');
    }
  }
}
