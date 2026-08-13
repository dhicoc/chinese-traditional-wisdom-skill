import { describe, expect, it } from 'vitest';
import { calcCeziEnveloped, calcChenguzEnveloped } from '@/engine-api/folklore';
import {
  calcAnnualFortuneCombo,
  calcDailyWellnessCombo,
  calcMonthlyFortuneCombo,
  calcSpaceTimeCombo,
  calcDecisionCombo,
  calcSanshiCombo,
  calcSanshiClassicCombo,
  calcZeriCombo,
} from '@/engine-api/combo';
import { calcMarriageCombo } from '@/engine-api/marriage';
import { createCeziFactChecks } from '@/features/cezi/CeziWorkspace';
import { createChenguzFactChecks } from '@/features/chenguz/ChenguzWorkspace';
import { createComboFactChecks } from '@/features/combo/ComboWorkspace';
import { toUserPresentation, type ReadingLike, type StructuredFactCheck } from '@/legacy/reportLayers';

const BIRTH = { year: 2024, month: 3, day: 15, hour: 9, minute: 0, gender: '男' };
const SOLAR = null;
const DISCLAIMERS = ['本报告仅作传统文化参考，不构成保证或专业建议。'];

function expectPresentationMatchesSnapshot(
  envelope: { ok: boolean; data: { export_snapshot: ReadingLike } },
  factChecks: StructuredFactCheck[],
) {
  const presentation = toUserPresentation(envelope, { factChecks, disclaimers: DISCLAIMERS });
  expect(presentation.exportReport).toEqual({
    summary: envelope.data.export_snapshot.summary,
    sections: envelope.data.export_snapshot.sections,
  });
  expect(presentation.semanticReport?.facts).toEqual(
    factChecks.filter(({ validation }) => validation.valid).map(({ fact }) => fact),
  );
  expect(factChecks.every(({ validation }) => validation.valid)).toBe(true);
}

describe('Dashboard 同源 presentation 的核验事实', () => {
  it('测字和称骨只产生白名单 facts，并与成功 envelope 的导出快照同源', async () => {
    const cezi = await calcCeziEnveloped({ char: '明', birth: BIRTH, solar: SOLAR });
    const chenguz = calcChenguzEnveloped({ birth: BIRTH, solar: SOLAR });

    expect(cezi.ok).toBe(true);
    expect(chenguz.ok).toBe(true);
    if (!cezi.ok || !chenguz.ok) throw new Error('expected successful envelopes');

    const ceziFacts = createCeziFactChecks(cezi.data);
    const chenguzFacts = createChenguzFactChecks(chenguz.data);
    expect(ceziFacts.map(({ fact }) => fact.label)).toEqual(['所测字', '康熙笔画', '数理', '字形结构']);
    expect(chenguzFacts.map(({ fact }) => fact.label)).toEqual(['总骨重', '版本', '年支', '农历月']);
    expectPresentationMatchesSnapshot(cezi, ceziFacts);
    expectPresentationMatchesSnapshot(chenguz, chenguzFacts);
  });

  it('五种已支持联合模式的成功 envelope 仅接纳各自有效 facts', async () => {
    const annual = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2025, currentMonth: 3, solar: SOLAR });
    const monthly = calcMonthlyFortuneCombo({ birth: BIRTH, targetYear: 2025, targetMonth: 3, solar: SOLAR });
    const wellness = calcDailyWellnessCombo({ birth: BIRTH, now: { year: 2025, month: 3, day: 15, hour: 9 }, targetYear: 2025, solar: SOLAR });
    const zeri = calcZeriCombo({ birth: BIRTH, purpose: '开业', startDate: '2025-03-16', endDate: '2025-03-22', topN: 5, solar: SOLAR });
    const marriage = await calcMarriageCombo({
      personA: { birth: BIRTH, label: '男方', solar: SOLAR },
      personB: { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '女' }, label: '女方' },
      scene: '婚恋',
      targetYear: 2025,
    });

    const cases = [
      ['annual', annual],
      ['monthly', monthly],
      ['wellness', wellness],
      ['zeri', zeri],
      ['marriage', marriage],
    ] as const;
    for (const [comboType, envelope] of cases) {
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) throw new Error(`expected ${comboType} envelope`);
      expectPresentationMatchesSnapshot(envelope, createComboFactChecks(comboType, envelope.data));
    }
  });

  it('未支持的联合模式绝不产生 facts', () => {
    const decision = calcDecisionCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR });
    const space = calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2025, solar: SOLAR });
    const sanshi = calcSanshiCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR, liurenSchool: 'classic' });
    const sanshiClassic = calcSanshiClassicCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR, liurenSchool: 'classic' });

    for (const [comboType, envelope] of [
      ['decision', decision],
      ['space', space],
      ['sanshi', sanshi],
      ['sanshi-classic', sanshiClassic],
    ] as const) {
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) throw new Error(`expected ${comboType} envelope`);
      expect(createComboFactChecks(comboType, envelope.data)).toEqual([]);
    }
  });

  it('不将篡改后的失败核验事实带入 presentation', async () => {
    const cezi = await calcCeziEnveloped({ char: '明', birth: BIRTH, solar: SOLAR });
    expect(cezi.ok).toBe(true);
    if (!cezi.ok) throw new Error('expected successful envelope');

    const verified = createCeziFactChecks(cezi.data)[0];
    const tampered: StructuredFactCheck = {
      fact: { ...verified.fact, value: `${verified.fact.value}错` },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(cezi, { factChecks: [verified, tampered], disclaimers: DISCLAIMERS });

    expect(presentation.semanticReport?.facts).toEqual([verified.fact]);
    expect(presentation.semanticReport?.facts).not.toContainEqual(tampered.fact);
  });
});
