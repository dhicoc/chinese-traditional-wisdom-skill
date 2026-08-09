import { describe, expect, it } from 'vitest';
import { calcZiweiEnveloped, getZiweiHoroscopeSummary } from '../../visual/src/legacy/ziweiEngine';
import { validateZiweiClaims, type ZiweiPresentationClaim } from './ziweiClaimVerifier';

const input = {
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' as const },
  transit: { year: 2025, month: 7 },
};
const envelope = calcZiweiEnveloped(input);
const transit = getZiweiHoroscopeSummary(input.birth, input.transit.year, input.transit.month);

describe('紫微呈现断言校验', () => {
  it('接受本次命宫、星曜、四化与元资料断言', () => {
    const data = envelope.data;
    const ming = data.palaces.命宫!;
    const star = ming.stars[0]!;
    const [sihuaStar, mutagen] = Object.entries(data.sihua)[0]!;
    const claims: ZiweiPresentationClaim[] = [
      { kind: 'palace', palace: '命宫', field: 'position', value: ming.position },
      { kind: 'palaceStar', palace: '命宫', value: star },
      { kind: 'sihua', star: sihuaStar, value: mutagen },
      { kind: 'metadata', field: 'soul', value: data.soul! },
      { kind: 'mainStar', value: data.mainStars[0]! },
    ];

    expect(validateZiweiClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('接受本次目标年月动态层并拒绝篡改', () => {
    const yearly = `${transit.yearly.stem}${transit.yearly.branch}`;
    const valid = validateZiweiClaims(envelope.data, [
      { kind: 'transit', field: 'yearly', value: yearly },
      { kind: 'transit', field: 'age', value: transit.age.nominalAge },
    ], transit);
    const invalid = validateZiweiClaims(envelope.data, [
      { kind: 'transit', field: 'yearly', value: '甲子' },
    ], transit);

    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toEqual({
      valid: false,
      violations: [expect.objectContaining({ kind: 'transit', expected: yearly, actual: '甲子' })],
    });
  });

  it('拒绝伪造的宫位星曜、四化与元资料', () => {
    const result = validateZiweiClaims(envelope.data, [
      { kind: 'palaceStar', palace: '命宫', value: '不存在星曜' },
      { kind: 'sihua', star: '不存在星曜', value: '忌' },
      { kind: 'metadata', field: 'soul', value: '不存在命主' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'palaceStar' }),
      expect.objectContaining({ kind: 'sihua' }),
      expect.objectContaining({ kind: 'metadata' }),
    ]));
  });
});
