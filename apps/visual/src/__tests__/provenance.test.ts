import { describe, expect, it } from 'vitest';
import { canonicalStringify, createInputFingerprint, hashStableValue, redactFingerprintInput } from '@/legacy/provenance';
import { createSafeResultBundle, serializeSafeResultBundle, verifySafeResultBundle } from '@/legacy/resultBundle';
import { runLocalTool } from '@/legacy/directRunner';

const BAZI_INPUT = {
  birth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' as const },
  timeBasis: 'civil-unverified' as const,
  civilFallbackConfirmed: true,
  shenShaTrineSource: 'year' as const,
};

describe('canonical provenance and privacy-safe result bundles', () => {
  it('canonicalizes object keys while preserving array order', () => {
    expect(canonicalStringify({ b: 2, a: { d: 4, c: 3 }, list: [2, 1] }))
      .toBe('{"a":{"c":3,"d":4},"b":2,"list":[2,1]}');
    expect(hashStableValue({ b: 2, a: 1 })).toBe(hashStableValue({ a: 1, b: 2 }));
    expect(hashStableValue([1, 2])).not.toBe(hashStableValue([2, 1]));
  });

  it('rejects non-finite numbers and circular structures', () => {
    expect(() => canonicalStringify({ value: Number.NaN })).toThrow('NaN or Infinity');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalStringify(circular)).toThrow('circular');
  });

  it('redacts birth, location, names, questions, answers, and full dates before fingerprinting', () => {
    const input = {
      birth: BAZI_INPUT.birth,
      location: { displayName: '北京市', longitude: 116.4 },
      surname: '张', givenName: '三', question: '我的问题', answers: [1, 2],
      targetDate: '2026-08-20', targetYear: 2026,
    };
    const redacted = JSON.stringify(redactFingerprintInput(input));
    expect(redacted).not.toContain('1990');
    expect(redacted).not.toContain('北京市');
    expect(redacted).not.toContain('张');
    expect(redacted).not.toContain('我的问题');
    expect(redacted).not.toContain('2026-08-20');
    expect(redacted).toContain('targetYear');
    expect(createInputFingerprint(input)).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
  });

  it('creates a deterministic bundle without raw input and detects tampering', async () => {
    const envelope = await runLocalTool('bazi_calculate', { ...BAZI_INPUT, transitDate: '2025-07-15' }) as any;
    const claims = [
      { tool: 'bazi_calculate', kind: 'dayMaster', value: envelope.data.dayMaster },
      { tool: 'bazi_calculate', kind: 'transitTargetDate', value: '2025-07-15' },
    ];
    const bundle = await createSafeResultBundle('bazi_calculate', { ...BAZI_INPUT, transitDate: '2025-07-15' }, claims);
    const serialized = serializeSafeResultBundle(bundle);
    expect(bundle.inputIncluded).toBe(false);
    expect(bundle.replayable).toBe(false);
    expect(bundle.verifiedFacts).toHaveLength(2);
    expect(JSON.stringify(bundle.verifiedFacts)).toContain('****-**-**');
    expect(serialized).not.toContain('1990');
    expect(verifySafeResultBundle(bundle).valid).toBe(true);
    expect(verifySafeResultBundle({ ...bundle, resultVersion: 'tampered' }).valid).toBe(false);
  });

  it('refuses to bundle tampered claims', async () => {
    await expect(createSafeResultBundle('bazi_calculate', BAZI_INPUT, [
      { tool: 'bazi_calculate', kind: 'dayMaster', value: '错' },
    ])).rejects.toThrow('不能生成结果包');
  });
});
