import { canonicalStringify, hashStableValue } from './provenance';

export function resultBundleIntegrity(value: unknown): string {
  return `fnv1a32:${hashStableValue(value)}`;
}

export function verifyPortableResultBundle(value: unknown): { valid: boolean; expected: string; actual?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, expected: '' };
  const { integrity, ...base } = value as Record<string, unknown>;
  const expected = resultBundleIntegrity(base);
  return { valid: integrity === expected, expected, actual: typeof integrity === 'string' ? integrity : undefined };
}

export function cloneCanonicalBundle<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}
