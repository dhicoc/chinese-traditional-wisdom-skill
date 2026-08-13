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
  it('星宿 presentation 的导出内容与成功 envelope 同源，facts 仅含有效白名单', () => {
    const xingxiu = calcXingXiuEnveloped({ birth: BIRTH });

    expect(xingxiu.ok).toBe(true);
    if (!xingxiu.ok) throw new Error('expected successful envelope');

    const factChecks = createXingxiuFactChecks(xingxiu.data);
    const presentation = toUserPresentation(xingxiu, {
      factChecks,
      disclaimers: ['本报告仅作传统文化参考，不构成保证或专业建议。'],
    });

    expect(presentation.exportReport).not.toBeNull();
    expect(presentation.exportReport?.summary).toBe(xingxiu.data.export_snapshot.summary);
    expect(presentation.exportReport?.sections).toEqual(xingxiu.data.export_snapshot.sections);
    expect(presentation.semanticReport?.facts).toEqual(factChecks.map(({ fact }) => fact));
    expect(factChecks.every(({ validation }) => validation.valid)).toBe(true);
    expect(presentation.semanticReport?.traditionalInterpretations).toEqual(
      expect.arrayContaining(xingxiu.data.export_snapshot.sections),
    );
  });

  it('不将篡改后的失败核验事实带入 presentation，传统解释仍留在导出 sections', () => {
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
    expect(presentation.semanticReport?.facts).not.toContainEqual(tampered.fact);
    expect(presentation.exportReport?.sections).toEqual(xingxiu.data.export_snapshot.sections);
    expect(presentation.semanticReport?.traditionalInterpretations).toEqual(
      expect.arrayContaining(xingxiu.data.export_snapshot.sections),
    );
  });

  it('太乙、大六壬和皇极的成功 envelope 只将各自有效核验事实带入 semanticReport', () => {
    const taiyi = calcTaiyiEnveloped({ birth: BIRTH, solar: null });
    const liuren = calcDaliurenEnveloped({ birth: BIRTH, solar: null, school: 'classic' });
    const huangji = calcHuangjiEnveloped({ birth: BIRTH, solar: null });

    expect(taiyi.ok).toBe(true);
    expect(liuren.ok).toBe(true);
    expect(huangji.ok).toBe(true);
    if (!taiyi.ok || !liuren.ok || !huangji.ok) throw new Error('expected successful envelopes');

    const taiyiFacts = createTaiyiFactChecks(taiyi.data);
    const taiyiPresentation = toUserPresentation(taiyi, { factChecks: taiyiFacts });
    expect(taiyiPresentation.exportReport).not.toBeNull();
    expect(taiyiPresentation.exportReport?.summary).toBe(taiyi.data.export_snapshot.summary);
    expect(taiyiPresentation.exportReport?.sections).toEqual(taiyi.data.export_snapshot.sections);
    expect(taiyiPresentation.semanticReport?.facts).toEqual(taiyiFacts.filter(({ validation }) => validation.valid).map(({ fact }) => fact));

    const liurenFacts = createLiurenFactChecks(liuren.data);
    const liurenPresentation = toUserPresentation(liuren, { factChecks: liurenFacts });
    expect(liurenPresentation.exportReport).not.toBeNull();
    expect(liurenPresentation.exportReport?.summary).toBe(liuren.data.export_snapshot.summary);
    expect(liurenPresentation.exportReport?.sections).toEqual(liuren.data.export_snapshot.sections);
    expect(liurenPresentation.semanticReport?.facts).toEqual(liurenFacts.filter(({ validation }) => validation.valid).map(({ fact }) => fact));

    const huangjiFacts = createHuangjiFactChecks(huangji.data);
    const huangjiPresentation = toUserPresentation(huangji, { factChecks: huangjiFacts });
    expect(huangjiPresentation.exportReport).not.toBeNull();
    expect(huangjiPresentation.exportReport?.summary).toBe(huangji.data.export_snapshot.summary);
    expect(huangjiPresentation.exportReport?.sections).toEqual(huangji.data.export_snapshot.sections);
    expect(huangjiPresentation.semanticReport?.facts).toEqual(huangjiFacts.filter(({ validation }) => validation.valid).map(({ fact }) => fact));
  });

  it('失败 envelope 映射为错误 presentation，不提供语义报告或导出报告', () => {
    const message = '请补充出生时辰。';
    const presentation = toUserPresentation({
      ok: false,
      error: { code: 'validation_error', message },
    });

    expect(presentation.state).toBe('error');
    expect(presentation.semanticReport).toBeNull();
    expect(presentation.exportReport).toBeNull();
    expect(presentation.error?.message).toBe(message);
  });
});
