import { describe, expect, it } from 'vitest';
import { calcBazhaiEnveloped } from '../../visual/src/legacy/bazhaiEngine';
import { validateBazhaiClaims, type BazhaiPresentationClaim } from './bazhaiClaimVerifier';

const envelope = calcBazhaiEnveloped({ birthYear: 1990, gender: '男', year: 2026 });

describe('八宅呈现断言校验', () => {
  it('接受本次命卦与八方游年星断言', () => {
    const data = envelope.data;
    const direction = data.directions[0]!;
    const claims: BazhaiPresentationClaim[] = [
      { kind: 'mingGua', field: 'trigram', value: data.mingGua.trigram },
      { kind: 'mingGua', field: 'group', value: data.mingGua.group },
      { kind: 'mingGua', field: 'num', value: data.mingGua.num! },
      { kind: 'direction', direction: direction.direction, field: 'star', value: direction.star },
      { kind: 'direction', direction: direction.direction, field: 'quality', value: direction.quality },
    ];

    expect(validateBazhaiClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('接受本次年度太岁、岁破、三煞与五黄断言', () => {
    const data = envelope.data;
    const claims: BazhaiPresentationClaim[] = [
      { kind: 'annual', field: 'yearZhi', value: data.taisui.yearZhi },
      { kind: 'annual', field: 'taisuiDirection', value: data.taisui.taisui.direction },
      { kind: 'annual', field: 'suiPoBagua', value: data.taisui.suiPo.bagua },
      { kind: 'annual', field: 'sanShaZhiList', value: data.taisui.sanSha.zhiList.join('、') },
      { kind: 'annual', field: 'fiveYellowDirection', value: data.taisui.fiveYellow.direction },
    ];

    expect(validateBazhaiClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造的命卦、方位游年星与年度方位', () => {
    const result = validateBazhaiClaims(envelope.data, [
      { kind: 'mingGua', field: 'trigram', value: '乾' },
      { kind: 'direction', direction: '北', field: 'star', value: '不存在游年星' },
      { kind: 'annual', field: 'fiveYellowDirection', value: '不存在方位' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'mingGua' }),
      expect.objectContaining({ kind: 'direction' }),
      expect.objectContaining({ kind: 'annual' }),
    ]));
  });
});
