/** Strict canonical JSON serialization for deterministic local fingerprints. */
const OMIT = Symbol('omit');

function canonicalize(value: unknown, seen: WeakSet<object>, inArray = false): unknown | typeof OMIT {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON does not support NaN or Infinity.');
    return Object.is(value, -0) ? 0 : value;
  }
  if (value === undefined) return inArray ? null : OMIT;
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError(`Canonical JSON does not support ${typeof value}.`);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value)) throw new TypeError('Canonical JSON does not support circular references.');
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const normalized = canonicalize(item, seen, true);
        return normalized === OMIT ? null : normalized;
      });
    }
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const normalized = canonicalize(record[key], seen, false);
      if (normalized !== OMIT) out[key] = normalized;
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

export function canonicalStringify(value: unknown): string {
  const normalized = canonicalize(value, new WeakSet<object>());
  return JSON.stringify(normalized === OMIT ? null : normalized);
}

/** Backward-compatible name; now uses canonical key ordering and strict validation. */
export function stableStringify(value: unknown): string {
  return canonicalStringify(value);
}

/** FNV-1a 32-bit non-cryptographic integrity fingerprint. */
export function hashStableValue(value: unknown): string {
  const str = canonicalStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const SENSITIVE_KEY = /(?:birth|location|displayname|name|surname|givenname|question|evidence|answers|constitution|keyword|yaovalues)/i;
const FULL_DATE = /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g;

export function redactFingerprintInput(value: unknown, key = ''): unknown {
  if (key && SENSITIVE_KEY.test(key)) return '[redacted]';
  if (typeof value === 'string') return value.replace(FULL_DATE, '****-**-**');
  if (Array.isArray(value)) return value.map((item) => redactFingerprintInput(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, redactFingerprintInput(childValue, childKey)]));
  }
  return value;
}

export function createInputFingerprint(input: unknown): string {
  return `fnv1a32:${hashStableValue(redactFingerprintInput(input))}`;
}

export interface ResultProvenance {
  schemaVersion: '1.0.0';
  tool: string;
  resultToolId: string;
  toolVersion: string;
  rulesetVersion: string;
  dependencyVersions: Record<string, string>;
  calculationConfig: Record<string, unknown>;
  inputFingerprint: string;
  citationIds: string[];
  limitations: string[];
}
