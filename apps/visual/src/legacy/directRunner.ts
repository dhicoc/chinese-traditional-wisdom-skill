import { Solar } from 'lunar-typescript';
import type { ToolEnvelope } from './baseTypes';
import type { SolarBirth } from './birthBridge';
import { resolveTrueSolarTime, type TrueSolarTimeResolution } from '@/engine-api/trueSolarTime';
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
import { asLocalToolError, LocalToolError } from './localToolErrors';
import { parseLocalToolCall } from './toolContracts';
import type { LocalToolName } from './localToolRegistry';
import { attachLocalProvenance } from './localProvenance';

type Input = Record<string, unknown>;
type DirectResult = ToolEnvelope<unknown> | TrueSolarTimeResolution;
type ParsedBirth = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: string;
};
type TimeSourceContext = {
  timeBasis?: unknown;
  civilFallbackConfirmed?: unknown;
  trueSolarBirth?: ParsedBirth;
  trueSolarResolution?: { trueSolarBirth?: ParsedBirth };
};
const TIME_SOURCE_BIRTH_KEYS = ['year', 'month', 'day', 'hour', 'minute', 'gender'] as const;

function record(input: unknown): Input {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('工具输入必须是 JSON 对象。');
  return input as Input;
}


function trueSolarBirth(birth: ParsedBirth): SolarBirth {
  const gender: SolarBirth['gender'] = birth.gender === '女' ? '女' : '男';
  return { ...birth, gender, minute: birth.minute ?? 0, useExactCalendar: true };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function verifiedTrueSolarResolution(value: unknown): TrueSolarTimeResolution {
  const resolution = value as TrueSolarTimeResolution | undefined;
  if (!resolution?.civilBirth || !resolution.trueSolarBirth || !resolution.location) {
    throw new Error('timeBasis=true-solar-verified 必须提供完整 trueSolarResolution。');
  }
  const recomputed = resolveTrueSolarTime(resolution.civilBirth, resolution.location);
  const keys: Array<keyof TrueSolarTimeResolution> = [
    'trueSolarBirth',
    'longitudeCorrectionMinutes',
    'equationOfTimeMinutes',
    'trueSolarCorrectionMinutes',
    'crossedDate',
    'crossedShichen',
    'crossedZiChu',
    'evidence',
  ];
  if (!keys.every((key) => sameValue(resolution[key], recomputed[key]))) {
    throw new Error('trueSolarResolution 与本地真太阳时复算结果不一致。');
  }
  return recomputed;
}

function timeSource(birth: ParsedBirth, context: TimeSourceContext) {
  if (context.timeBasis === 'civil-unverified') {
    if (context.civilFallbackConfirmed !== true) throw new Error('timeBasis=civil-unverified 必须显式传 civilFallbackConfirmed=true。');
    return { timeBasis: 'civil-unverified', verification: null, notice: '未完成真太阳时复核' };
  }
  if (context.timeBasis === 'true-solar-verified') {
    const resolution = verifiedTrueSolarResolution(context.trueSolarResolution);
    for (const key of TIME_SOURCE_BIRTH_KEYS) {
      if ((birth[key] ?? 0) !== (resolution.trueSolarBirth[key] ?? 0)) throw new Error(`trueSolarBirth 与 birth.${key} 不一致。`);
    }
    return { timeBasis: 'true-solar-verified', verification: resolution };
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

type LocalToolRunner = (input: any) => DirectResult | Promise<DirectResult>;

export const LOCAL_TOOL_RUNNERS = {
  resolve_true_solar_time: (input) => resolveTrueSolarTime(trueSolarBirth(input.birth), input.location),
  bazi_calculate: (input) => withTimeSource(calcBaziEnveloped({ birth: input.birth, solar: Solar, shenShaTrineSource: input.shenShaTrineSource, transitDate: input.transitDate }), timeSource(input.birth, input)),
  ziwei_chart: (input) => calcZiweiEnveloped({ birth: input.birth, mingGua: input.mingGua, transit: input.transit }),
  cast_liuyao: (input) => calcLiuyaoEnveloped({ birth: input.birth, method: input.method, yaoValues: input.yaoValues, question: input.question, seed: input.seed, solar: Solar }),
  arrange_qimen: (input) => calcQimenEnveloped({ birth: input.birth, question: input.question }),
  liuren_calculate: (input) => calcDaliurenEnveloped({ birth: input.birth, school: input.school, solar: Solar }),
  xingxiu_daily: (input) => calcXingXiuEnveloped({ birth: input.birth, method: input.method, queryDate: input.queryDate, solar: Solar }),
  taiyi_calculate: (input) => calcTaiyiEnveloped({ birth: input.birth, jiStyle: input.jiStyle ?? 0, acumYear: input.acumYear ?? 0, solar: Solar }),
  huangji_calculate: (input) => calcHuangjiEnveloped({ birth: input.birth, solar: Solar }),
  cast_meihua: (input) => calcMeihuaEnveloped({ birth: input.birth, method: input.method, numberA: input.numberA, numberB: input.numberB }, Solar),
  calc_yunqi: (input) => calcYunqiEnveloped({ year: input.year, birthMonth: input.birthMonth, birthDay: input.birthDay, currentMonth: input.currentMonth, solar: Solar }),
  analyze_name: async (input) => { const source = input.birth ? timeSource(input.birth, input.baziTimeContext ?? {}) : null; const result = await calcNameRatingEnveloped(input.surname, input.givenName, input.birthYear, input.birth, Solar); return source ? withTimeSource(result, source) : result; },
  calc_xiyong: (input) => calcXiYongEnveloped(input.dayMasterWuxing, input.elements),
  get_constitution_tendency: (input) => getConstitutionTendencyEnveloped(input),
  dream_interpret: (input) => searchDreamEnveloped(input.keyword, input.useFull ?? false),
  combo_annual_fortune: (input) => withTimeSource(calcAnnualFortuneCombo({ birth: input.birth, targetYear: input.targetYear, currentMonth: input.currentMonth, solar: Solar }), timeSource(input.birth, input.baziTimeContext)),
  combo_decision: (input) => calcDecisionCombo({ birth: input.birth, question: input.question, seed: input.seed, solar: Solar }),
  combo_space_time: (input) => calcSpaceTimeCombo({ birth: input.birth, targetYear: input.targetYear, solar: Solar }),
  combo_sanshi: (input) => calcSanshiCombo({ birth: input.birth, question: input.question, liurenSchool: input.liurenSchool, solar: Solar }),
  combo_sanshi_classic: (input) => calcSanshiClassicCombo({ birth: input.birth, question: input.question, liurenSchool: input.liurenSchool, taiyiJiStyle: input.taiyiJiStyle, taiyiAcumYear: input.taiyiAcumYear, solar: Solar }),
  combo_daily_wellness: (input) => withTimeSource(calcDailyWellnessCombo({ birth: input.birth, constitution: input.constitution, now: input.now, targetYear: input.targetYear, solar: Solar }), timeSource(input.birth, input.baziTimeContext)),
  combo_zeri: (input) => calcZeriCombo({ birth: input.birth, purpose: input.purpose, startDate: input.startDate, endDate: input.endDate, targetYear: input.targetYear, topN: input.topN, solar: Solar }),
  combo_monthly_fortune: (input) => withTimeSource(calcMonthlyFortuneCombo({ birth: input.birth, targetYear: input.targetYear, targetMonth: input.targetMonth, constitution: input.constitution, solar: Solar }), timeSource(input.birth, input.baziTimeContext)),
  combo_marriage: async (input) => { const a = timeSource(input.personA.birth, input.personA.baziTimeContext ?? {}); const b = timeSource(input.personB.birth, input.personB.baziTimeContext ?? {}); const result = await calcMarriageCombo({ personA: { birth: input.personA.birth, surname: input.personA.surname, givenName: input.personA.givenName, label: input.personA.label, solar: Solar }, personB: { birth: input.personB.birth, surname: input.personB.surname, givenName: input.personB.givenName, label: input.personB.label, solar: Solar }, scene: input.scene, targetYear: input.targetYear, purpose: input.purpose }); return { ...withTimeSource(withTimeSource(result, a), b), data: { ...result.data, timeSource: { personA: a, personB: b } } }; },
  cast_cezi: async (input) => { const source = input.birth ? timeSource(input.birth, input.baziTimeContext ?? {}) : null; const result = await calcCeziEnveloped({ char: input.char, aspect: input.aspect, birth: input.birth, solar: Solar }); return source ? withTimeSource(result, source) : result; },
  calc_chenguz: (input) => withTimeSource(calcChenguzEnveloped({ birth: input.birth, version: input.version, solar: Solar }), timeSource(input.birth, input.baziTimeContext)),
  get_almanac: (input) => getAlmanacEnveloped({ date: input.date, solar: Solar }),
  calc_feixing: (input) => calcFeixingEnveloped({ year: input.year, gender: input.gender, birthYear: input.birthYear }),
  calc_bazhai: (input) => calcBazhaiEnveloped({ birthYear: input.birthYear, gender: input.gender, door: input.door, bedroom: input.bedroom, kitchen: input.kitchen, year: input.year }),
  get_daily_rhythm: (input) => getDailyRhythmEnveloped({ date: input.date, hour: input.hour, constitution: input.constitution, solar: Solar }),
  assess_constitution: (input) => assessConstitutionEnveloped({ answers: input.answers }),
  list_constitution_questionnaire: () => { const groups = listConstitutionQuestionnaire(); return { ok: true, tool: 'list_constitution_questionnaire', version: '1.0.0', input_normalized: {}, data: { groups }, summary: [`九种体质问卷共 ${groups.length} 组、${groups.reduce((total, group) => total + group.questions.length, 0)} 题`] }; },
} satisfies Record<LocalToolName, LocalToolRunner>;

/** 直接调用本地 enveloped 引擎，使用一次性输入和结果对象。 */
export async function runLocalTool(tool: string, rawInput: unknown): Promise<DirectResult> {
  try {
    const { tool: parsedTool, input } = parseLocalToolCall(tool, record(rawInput));
    const result = await LOCAL_TOOL_RUNNERS[parsedTool](input as never);
    return attachLocalProvenance(parsedTool, input, result);
  } catch (error) {
    if (error instanceof LocalToolError) throw error;
    throw asLocalToolError('ENGINE_FAILURE', error, tool);
  }
}
