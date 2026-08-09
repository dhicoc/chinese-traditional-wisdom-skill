import { describe, expect, it } from 'vitest';
import { calcFeixingEnveloped } from '../../visual/src/legacy/feixingEngine';
import { validateFeixingClaims, type FeixingPresentationClaim } from './feixingClaimVerifier';

const envelope = calcFeixingEnveloped({ year: 2026 });

describe('流年飞星呈现断言校验', () => {
  it('接受本次年度、元运、中宫与九宫盘面断言', () => {
    const data = envelope.data;
    const palace = data.grid.flat()[0]!;
    const claims: FeixingPresentationClaim[] = [
      { kind: 'year', value: data.year },
      { kind: 'yuanYun', field: 'name', value: data.yuanYun.name },
      { kind: 'yuanYun', field: 'wangStar', value: data.yuanYun.wangStar },
      { kind: 'center', field: 'centerStar', value: data.center.centerStar },
      { kind: 'center', field: 'luck', value: data.center.luck },
      { kind: 'palace', palace: palace.palace, field: 'starNum', value: palace.starNum },
      { kind: 'palace', palace: palace.palace, field: 'starName', value: palace.starName },
    ];

    expect(validateFeixingClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造的年度、元运、中宫与九宫盘面断言', () => {
    const result = validateFeixingClaims(envelope.data, [
      { kind: 'year', value: 1999 },
      { kind: 'yuanYun', field: 'wangStar', value: envelope.data.yuanYun.wangStar + 1 },
      { kind: 'center', field: 'centerStar', value: envelope.data.center.centerStar + 1 },
      { kind: 'palace', palace: '不存在宫位', field: 'starName', value: '不存在飞星' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'year' }),
      expect.objectContaining({ kind: 'yuanYun' }),
      expect.objectContaining({ kind: 'center' }),
      expect.objectContaining({ kind: 'palace' }),
    ]));
  });
});
