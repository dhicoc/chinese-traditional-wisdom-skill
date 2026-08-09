import { Solar } from 'lunar-typescript';
import type { ToolEnvelope } from './baseTypes';
import { resolveTrueSolarTime, type TrueSolarTimeResolution } from './trueSolarTime';
import { calcBaziEnveloped } from './baziEngine';
import { calcZiweiEnveloped } from './ziweiEngine';
import { calcLiuyaoEnveloped } from './liuyaoEngine';
import { calcQimenEnveloped } from './qimenEngine';
import { calcDaliurenEnveloped } from './daliurenEngine';
import { calcXingXiuEnveloped } from './xingxiuEngine';
import { calcTaiyiEnveloped } from './taiyiEngine';
import { calcHuangjiEnveloped } from './huangjiEngine';
import { calcMeihuaEnveloped } from './meihuaEngine';
import { calcYunqiEnveloped } from './yunqiEngine';
import { calcAnnualFortuneCombo, calcDailyWellnessCombo, calcDecisionCombo, calcMonthlyFortuneCombo, calcSanshiClassicCombo, calcSanshiCombo, calcSpaceTimeCombo, calcZeriCombo } from './comboEngine';
import { calcMarriageCombo } from './marriageCombo';
import { calcCeziEnveloped } from './ceziEngine';
import { calcChenguzEnveloped } from './chenguzEngine';
import { getAlmanacEnveloped } from './almanacData';
import { calcFeixingEnveloped } from './feixingEngine';
import { calcBazhaiEnveloped } from './bazhaiEngine';
import { getDailyRhythmEnveloped } from './rhythmEngine';
import { assessConstitutionEnveloped, listConstitutionQuestionnaire } from './constitutionAssessEngine';
import { calcNameRatingEnveloped, calcXiYongEnveloped, getConstitutionTendencyEnveloped } from './envelopeAdapters';
import { searchDreamEnveloped } from './envelopeSample';

type Input = Record<string, any>;
type DirectResult = ToolEnvelope<any> | TrueSolarTimeResolution;

function record(input: unknown): Input {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('工具输入必须是 JSON 对象。');
  return input as Input;
}

function timeSource(birth: Input, context: Input) {
  if (context.timeBasis === 'civil-unverified') {
    if (context.civilFallbackConfirmed !== true) throw new Error('timeBasis=civil-unverified 必须显式传 civilFallbackConfirmed=true。');
    return { timeBasis: 'civil-unverified', verification: null, notice: '未完成真太阳时复核' };
  }
  if (context.timeBasis === 'true-solar-verified') {
    const resolution = context.trueSolarResolution as TrueSolarTimeResolution | undefined;
    const trueSolarBirth = (resolution?.trueSolarBirth ?? context.trueSolarBirth) as Input | undefined;
    if (!trueSolarBirth) throw new Error('timeBasis=true-solar-verified 必须提供 trueSolarResolution 或 trueSolarBirth。');
    for (const key of ['year', 'month', 'day', 'hour', 'minute', 'gender']) {
      if ((birth[key] ?? 0) !== (trueSolarBirth[key] ?? 0)) throw new Error(`trueSolarBirth 与 birth.${key} 不一致。`);
    }
    return { timeBasis: 'true-solar-verified', verification: resolution ?? { trueSolarBirth } };
  }
  throw new Error('涉及八字的工具必须声明 timeBasis。');
}

function withTimeSource(envelope: ToolEnvelope<any>, source: ReturnType<typeof timeSource>): ToolEnvelope<any> {
  const snapshot = envelope.data?.export_snapshot;
  const civil = source.timeBasis === 'civil-unverified';
  return {
    ...envelope,
    data: {
      ...envelope.data,
      timeSource: source,
      export_snapshot: snapshot ? {
        ...snapshot,
        summary: civil ? `未完成真太阳时复核；${snapshot.summary}` : snapshot.summary,
        sections: [...snapshot.sections, { heading: '八字时间来源', body: civil ? '未完成真太阳时复核：按用户确认的民用出生记录计算。' : '已核验真太阳时：使用直接提供的真太阳时出生记录计算。' }],
      } : snapshot,
    },
    result_meta: envelope.result_meta ? { ...envelope.result_meta, calculationConfig: { ...envelope.result_meta.calculationConfig, timeBasis: source.timeBasis } } : undefined,
  };
}

/** 直接调用 legacy enveloped 引擎，使用一次性输入和结果对象。 */
export async function runLocalTool(tool: string, rawInput: unknown): Promise<DirectResult> {
  const input = record(rawInput);
  switch (tool) {
    case 'resolve_true_solar_time': return resolveTrueSolarTime({ ...input.birth, minute: input.birth.minute ?? 0, useExactCalendar: true }, input.location);
    case 'bazi_calculate': return withTimeSource(calcBaziEnveloped({ birth: input.birth, solar: Solar, shenShaTrineSource: input.shenShaTrineSource }), timeSource(input.birth, input));
    case 'ziwei_chart': return calcZiweiEnveloped(input as any);
    case 'cast_liuyao': return calcLiuyaoEnveloped({ ...input, solar: Solar });
    case 'arrange_qimen': return calcQimenEnveloped(input as any);
    case 'liuren_calculate': return calcDaliurenEnveloped({ birth: input.birth, solar: Solar });
    case 'xingxiu_daily': return calcXingXiuEnveloped({ birth: input.birth, queryDate: input.queryDate, solar: Solar });
    case 'taiyi_calculate': return calcTaiyiEnveloped({ birth: input.birth, jiStyle: input.jiStyle ?? '0', acumYear: input.acumYear ?? '0', solar: Solar });
    case 'huangji_calculate': return calcHuangjiEnveloped({ birth: input.birth, solar: Solar });
    case 'cast_meihua': return calcMeihuaEnveloped({ ...input, solar: Solar } as any);
    case 'calc_yunqi': return calcYunqiEnveloped({ ...input, solar: Solar } as any);
    case 'analyze_name': { const source = input.birth ? timeSource(input.birth, input.baziTimeContext ?? {}) : null; const result = await calcNameRatingEnveloped(input.surname, input.givenName, input.birthYear, input.birth, Solar); return source ? withTimeSource(result, source) : result; }
    case 'calc_xiyong': return calcXiYongEnveloped(input.dayMasterWuxing, input.elements);
    case 'get_constitution_tendency': return getConstitutionTendencyEnveloped(input);
    case 'dream_interpret': return searchDreamEnveloped(input.keyword, input.useFull ?? false);
    case 'combo_annual_fortune': return withTimeSource(calcAnnualFortuneCombo({ birth: input.birth, targetYear: input.targetYear, currentMonth: input.currentMonth, solar: Solar }), timeSource(input.birth, input.baziTimeContext ?? {}));
    case 'combo_decision': return calcDecisionCombo({ birth: input.birth, question: input.question, seed: input.seed, solar: Solar });
    case 'combo_space_time': return calcSpaceTimeCombo({ birth: input.birth, targetYear: input.targetYear, facing: input.facing, solar: Solar });
    case 'combo_sanshi': return calcSanshiCombo({ birth: input.birth, question: input.question, solar: Solar });
    case 'combo_sanshi_classic': return calcSanshiClassicCombo({ birth: input.birth, question: input.question, solar: Solar });
    case 'combo_daily_wellness': return calcDailyWellnessCombo({ birth: input.birth, constitution: input.constitution, now: input.now, targetYear: input.targetYear, solar: Solar });
    case 'combo_zeri': return calcZeriCombo({ birth: input.birth, purpose: input.purpose, startDate: input.startDate, endDate: input.endDate, targetYear: input.targetYear, topN: input.topN, solar: Solar });
    case 'combo_monthly_fortune': return calcMonthlyFortuneCombo({ birth: input.birth, targetYear: input.targetYear, targetMonth: input.targetMonth, constitution: input.constitution, solar: Solar });
    case 'combo_marriage': { const a = timeSource(input.personA.birth, input.personA.baziTimeContext ?? {}); const b = timeSource(input.personB.birth, input.personB.baziTimeContext ?? {}); const result = await calcMarriageCombo({ ...input, personA: { ...input.personA, solar: Solar }, personB: { ...input.personB, solar: Solar } }); return { ...withTimeSource(withTimeSource(result, a), b), data: { ...result.data, timeSource: { personA: a, personB: b } } }; }
    case 'cast_cezi': { const source = input.birth ? timeSource(input.birth, input.baziTimeContext ?? {}) : null; const result = await calcCeziEnveloped({ char: input.char, aspect: input.aspect, birth: input.birth, solar: Solar }); return source ? withTimeSource(result, source) : result; }
    case 'calc_chenguz': return calcChenguzEnveloped({ birth: input.birth, version: input.version, solar: Solar });
    case 'get_almanac': return getAlmanacEnveloped({ date: input.date, solar: Solar });
    case 'calc_feixing': return calcFeixingEnveloped(input);
    case 'calc_bazhai': return calcBazhaiEnveloped(input as any);
    case 'get_daily_rhythm': return getDailyRhythmEnveloped({ ...input, solar: Solar });
    case 'assess_constitution': return assessConstitutionEnveloped({ answers: input.answers });
    case 'list_constitution_questionnaire': { const groups = listConstitutionQuestionnaire(); return { ok: true, tool, version: '1.0.0', input_normalized: {}, data: { groups }, summary: [`九种体质问卷共 ${groups.length} 组、${groups.reduce((total, group) => total + group.questions.length, 0)} 题`] }; }
    default: throw new Error(`未知本地工具：${tool}`);
  }
}
