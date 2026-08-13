import { describe, expect, it } from 'vitest';
import { calcDaliurenEnveloped, calcTaiyiEnveloped } from '@/engine-api/divination';
import { calcHuangjiEnveloped, calcXingXiuEnveloped } from '@/engine-api/folklore';
import { createHuangjiFactChecks } from '@/features/huangji/HuangjiWorkspace';
import { createLiurenFactChecks } from '@/features/liuren/LiurenWorkspace';
import { createTaiyiFactChecks } from '@/features/taiyi/TaiyiWorkspace';
import { createXingxiuFactChecks } from '@/features/xingxiu/XingXiuWorkspace';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';

const BIRTH = { year: 2024, month: 3, day: 15, hour: 9, minute: 0 };

describe('Dashboard 同源 presentation 的核验事实', () => {
  it('星宿和皇极仅生成白名单标签', () => {
    const xingxiu = calcXingXiuEnveloped({ birth: BIRTH });
    const huangji = calcHuangjiEnveloped({ birth: BIRTH, solar: null });

    expect(xingxiu.ok).toBe(true);
    expect(huangji.ok).toBe(true);
    if (!xingxiu.ok || !huangji.ok) throw new Error('expected successful envelopes');

    expect(createXingxiuFactChecks(xingxiu.data).map(({ fact }) => fact.label)).toEqual([
      '当日值宿', '值宿全称', '所属四象', '五行',
    ]);
    expect(createHuangjiFactChecks(huangji.data).map(({ fact }) => fact.label)).toEqual([
      '积年', '会', '世卦', '世爻',
    ]);
  });

  it('太乙和大六壬的候选事实均通过对应 verifier', () => {
    const taiyi = calcTaiyiEnveloped({ birth: BIRTH, solar: null });
    const liuren = calcDaliurenEnveloped({ birth: BIRTH, solar: null, school: 'classic' });

    expect(taiyi.ok).toBe(true);
    expect(liuren.ok).toBe(true);
    if (!taiyi.ok || !liuren.ok) throw new Error('expected successful envelopes');

    expect(createTaiyiFactChecks(taiyi.data).every(({ validation }) => validation.valid)).toBe(true);
    expect(createLiurenFactChecks(liuren.data).every(({ validation }) => validation.valid)).toBe(true);
  });

  it('不将篡改后的失败核验事实带入 presentation', () => {
    const xingxiu = calcXingXiuEnveloped({ birth: BIRTH });
    expect(xingxiu.ok).toBe(true);
    if (!xingxiu.ok) throw new Error('expected successful envelope');

    const verified = createXingxiuFactChecks(xingxiu.data)[0];
    const tampered: StructuredFactCheck = {
      fact: { ...verified.fact, value: `${verified.fact.value}错` },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(xingxiu, {
      factChecks: [verified, tampered],
      disclaimers: ['本报告仅作传统文化参考，不构成保证或专业建议。'],
    });

    expect(presentation.semanticReport?.facts).toEqual([verified.fact]);
  });
});
