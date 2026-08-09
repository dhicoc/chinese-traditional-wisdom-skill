import { describe, expect, it } from 'vitest';
import { calcDaliurenEnveloped } from '../../visual/src/legacy/daliurenEngine';
import { calcHuangjiEnveloped } from '../../visual/src/legacy/huangjiEngine';
import { calcLiuyaoEnveloped } from '../../visual/src/legacy/liuyaoEngine';
import { calcMeihuaEnveloped } from '../../visual/src/legacy/meihuaEngine';
import { calcQimenEnveloped } from '../../visual/src/legacy/qimenEngine';
import { calcTaiyiEnveloped } from '../../visual/src/legacy/taiyiEngine';
import { Solar } from 'lunar-typescript';
import { validateDivinationClaims, type DivinationPresentationClaim } from './divinationClaimVerifier';

const birth = { year: 2024, month: 3, day: 15, hour: 9, minute: 0, gender: '男' };

describe('占测／卦象呈现断言校验', () => {
  it('接受六爻、梅花与奇门的基础盘面断言', () => {
    const liuyao = calcLiuyaoEnveloped({ birth, method: 'manual', yaoValues: '777777', solar: Solar }).data;
    const meihua = calcMeihuaEnveloped({ birth, method: 'number', numberA: 3, numberB: 5 }, Solar).data;
    const qimen = calcQimenEnveloped({ birth }).data;
    const palace = qimen.palaces[0]!;

    const liuyaoClaims: DivinationPresentationClaim[] = [
      { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: liuyao.hexagramName },
      { tool: 'cast_liuyao', kind: 'yao', field: 'shiYao', value: liuyao.shiYao },
    ];
    const meihuaClaims: DivinationPresentationClaim[] = [
      { tool: 'cast_meihua', kind: 'hexagram', field: 'name', value: meihua.hexagramName },
      { tool: 'cast_meihua', kind: 'trigram', position: 'upper', field: 'element', value: meihua.upperTrigram.element },
    ];
    const qimenClaims: DivinationPresentationClaim[] = [
      { tool: 'arrange_qimen', kind: 'basic', field: 'ju', value: qimen.ju },
      { tool: 'arrange_qimen', kind: 'palace', position: palace.position, field: 'gate', value: palace.gate },
    ];

    expect(validateDivinationClaims('cast_liuyao', liuyao, liuyaoClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('cast_meihua', meihua, meihuaClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('arrange_qimen', qimen, qimenClaims)).toEqual({ valid: true, violations: [] });
  });

  it('接受大六壬、太乙与皇极的基础盘面断言', () => {
    const liuren = calcDaliurenEnveloped({ birth, solar: Solar }).data;
    const taiyi = calcTaiyiEnveloped({ birth, jiStyle: 0, acumYear: 0, solar: Solar }).data;
    const huangji = calcHuangjiEnveloped({ birth, solar: Solar }).data;

    const liurenClaims: DivinationPresentationClaim[] = [
      { tool: 'liuren_calculate', kind: 'basic', field: 'dayGanZhi', value: liuren.basicInfo.dayGanZhi },
      { tool: 'liuren_calculate', kind: 'sanchuan', stage: 'chuChuan', field: 'diZhi', value: liuren.sanChuan.chuChuan.diZhi },
    ];
    const taiyiClaims: DivinationPresentationClaim[] = [
      { tool: 'taiyi_calculate', kind: 'kook', field: 'num', value: taiyi.kook.num },
      { tool: 'taiyi_calculate', kind: 'position', subject: 'taiyi', field: 'gong', value: taiyi.taiyi.gong },
    ];
    const huangjiClaims: DivinationPresentationClaim[] = [
      { tool: 'huangji_calculate', kind: 'cycle', field: 'acumYear', value: huangji.cycles.acumYear },
      { tool: 'huangji_calculate', kind: 'gua', layer: 'zheng', value: huangji.gua.zheng },
    ];

    expect(validateDivinationClaims('liuren_calculate', liuren, liurenClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('taiyi_calculate', taiyi, taiyiClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('huangji_calculate', huangji, huangjiClaims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝跨工具 token 与伪造盘面字段', () => {
    const liuyao = calcLiuyaoEnveloped({ birth, method: 'manual', yaoValues: '777777', solar: Solar }).data;
    const result = validateDivinationClaims('cast_liuyao', liuyao, [
      { tool: 'cast_meihua', kind: 'yao', field: 'changingLine', value: 1 },
      { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '不存在卦象' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'cast_meihua' }),
      expect.objectContaining({ tool: 'cast_liuyao' }),
    ]));
  });
});
