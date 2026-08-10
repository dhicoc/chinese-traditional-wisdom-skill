export interface NumericAssertionClaim {
  tool?: string;
  path: string;
  value: number;
}

export interface NumericAssertionViolation {
  index: number;
  path: string;
  message: string;
  expected?: number;
  actual: number;
}

export interface NumericAssertionValidation {
  valid: boolean;
  violations: NumericAssertionViolation[];
}

export function validateNumericAssertionClaims(
  tool: string,
  result: Record<string, unknown>,
  claims: NumericAssertionClaim[],
): NumericAssertionValidation {
  const violations: NumericAssertionViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = claim.tool === undefined || claim.tool === tool ? getNumericValue(result, claim.path) : undefined;
    if (claim.value !== expected) {
      violations.push({
        index,
        path: claim.path,
        message: claim.tool !== undefined && claim.tool !== tool
          ? `该凭证属于 ${claim.tool}，不能校验 ${tool} 的数值断言。`
          : `路径 ${claim.path} 的数值与本次 ${tool} 结果不一致，或该路径不是有限数值。`,
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getNumericValue(result: Record<string, unknown>, path: string): number | undefined {
  if (!path.startsWith('data.')) return undefined;

  const value = path.slice('data.'.length).split('.').reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) && index >= 0 ? current[index] : undefined;
    }
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[segment];
    return undefined;
  }, result.data);

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
