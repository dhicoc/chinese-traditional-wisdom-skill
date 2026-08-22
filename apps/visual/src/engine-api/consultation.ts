import type { BaziBirth, BaziInput } from '@/legacy/baziEngine';
import { calcBaziEnveloped } from '@/legacy/baziEngine';
import { validateBaziClaims, type BaziPresentationClaim } from '@/legacy/claimVerification/baziClaimVerifier';
import { attachLocalProvenance } from '@/legacy/localProvenance';
import type { ResultProvenance } from '@/legacy/provenance';
import type { StructuredFact, TypedSemanticPresentation } from '@/legacy/reportLayers';
import type { LocalToolName } from '@/legacy/localToolRegistry';
import { calcFeixingEnveloped } from '@/legacy/feixingEngine';
import { calcBazhaiEnveloped } from '@/legacy/bazhaiEngine';
import { getAlmanacEnveloped, type AlmanacInput } from '@/legacy/almanacData';
import { validateFeixingClaims, type FeixingPresentationClaim } from '@/legacy/claimVerification/feixingClaimVerifier';
import { validateBazhaiClaims, type BazhaiPresentationClaim } from '@/legacy/claimVerification/bazhaiClaimVerifier';
import { validateCalendarClaims, type CalendarPresentationClaim } from '@/legacy/claimVerification/calendarClaimVerifier';
import { validateDailyClaims, type DailyPresentationClaim } from '@/legacy/claimVerification/dailyClaimVerifier';
import { calcNameRatingEnveloped } from '@/legacy/envelopeAdapters';
import { searchDreamEnveloped } from '@/legacy/envelopeSample';
import { calcCeziEnveloped } from '@/legacy/ceziEngine';
import { getDailyRhythmEnveloped, type RhythmInput } from '@/legacy/rhythmEngine';

export interface BaziConsultationInput {
  birth: BaziBirth;
  timeBasis: 'civil-unverified';
  civilFallbackConfirmed: true;
  solar?: BaziInput['solar'];
}

export interface WizardExecutionResult {
  state: 'success';
  tool: LocalToolName;
  mode: string;
  factsVerified: true;
  verifiedFacts: StructuredFact[];
  presentation: TypedSemanticPresentation;
  provenance?: ResultProvenance;
}
export interface BaziConsultationResult extends WizardExecutionResult {
  tool: 'bazi_calculate';
  mode: 'local-exact' | 'local-approx';
}

function resultPresentation(tool: LocalToolName, mode: string, summary: string, facts: StructuredFact[], limitations: string[], provenance?: ResultProvenance): WizardExecutionResult {
  return {
    state: 'success', tool, mode, factsVerified: true, verifiedFacts: facts, provenance,
    presentation: {
      summary, overallTone: '中', highlights: facts.slice(0, 6).map((fact) => ({ label: fact.label, value: fact.value, tone: '中', strength: null })),
      details: [], actions: [], limitations: [...limitations, '结构化事实校验不验证传统解释、建议、预测或现实效果。'],
      disclaimers: ['本结果仅作传统文化学习与参考，不构成现实结果保证。'], tags: ['统一咨询向导', tool, mode],
    },
  };
}

function pillar(data: ReturnType<typeof calcBaziEnveloped>['data'], key: 'year' | 'month' | 'day' | 'hour'): string {
  return `${data.pillars[key].stem}${data.pillars[key].branch}`;
}

export function executeBaziConsultation(input: BaziConsultationInput): BaziConsultationResult {
  const { year, month, day, hour, minute = 0, gender } = input.birth;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new TypeError('请输入有效的公历出生日期。');
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59 || (gender !== '男' && gender !== '女')) {
    throw new TypeError('出生小时、分钟或性别字段无效。');
  }
  if (input.timeBasis !== 'civil-unverified' || input.civilFallbackConfirmed !== true) {
    throw new TypeError('咨询向导第一阶段只在用户明确确认后使用民用时间。');
  }
  const safeInput = {
    birth: input.birth,
    timeBasis: input.timeBasis,
    civilFallbackConfirmed: true,
    shenShaTrineSource: 'year' as const,
  };
  const envelope = attachLocalProvenance(
    'bazi_calculate',
    safeInput,
    calcBaziEnveloped({ birth: input.birth, solar: input.solar, shenShaTrineSource: 'year' }),
  );
  const data = envelope.data;
  const claims: BaziPresentationClaim[] = [
    ...(['year', 'month', 'day', 'hour'] as const).map((key) => ({ tool: 'bazi_calculate' as const, kind: 'pillar' as const, pillar: key, value: pillar(data, key) })),
    { tool: 'bazi_calculate', kind: 'dayMaster', value: data.dayMaster },
    ...(['木', '火', '土', '金', '水'] as const).map((element) => ({ tool: 'bazi_calculate' as const, kind: 'elementCount' as const, element, value: data.elements[element] })),
    { tool: 'bazi_calculate', kind: 'strength', value: data.advancedAnalysis.support.strength },
  ];
  const verification = validateBaziClaims(data, claims);
  if (!verification.valid) throw new Error('本次八字结构化事实未通过本地校验。');
  const labels = ['年柱', '月柱', '日柱', '时柱', '日主', '木', '火', '土', '金', '水', '日主强弱'];
  const verifiedFacts: StructuredFact[] = claims.map((claim, index) => ({
    label: labels[index],
    value: String(claim.value),
    tool: 'bazi_calculate',
  }));
  const summary = `四柱 ${pillar(data, 'year')} ${pillar(data, 'month')} ${pillar(data, 'day')} ${pillar(data, 'hour')}；日主 ${data.dayMaster}。`;
  return resultPresentation('bazi_calculate', data.mode, summary, verifiedFacts, ['未完成真太阳时复核：本次按用户明确确认的民用出生记录计算。'], envelope.provenance) as BaziConsultationResult;
}

export function executeFeixingConsultation(input: { year: number; birthYear?: number; gender?: '男' | '女' }): WizardExecutionResult {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) throw new TypeError('请输入 1900-2100 的明确飞星年份。');
  const envelope = attachLocalProvenance('calc_feixing', input, calcFeixingEnveloped(input));
  if (!envelope.ok) throw new Error(envelope.error?.message ?? '流年飞星计算失败。');
  const data = envelope.data;
  const claims: FeixingPresentationClaim[] = [
    { tool: 'calc_feixing', kind: 'year', value: data.year },
    { tool: 'calc_feixing', kind: 'yuanYun', field: 'name', value: data.yuanYun.name },
    { tool: 'calc_feixing', kind: 'center', field: 'centerStar', value: data.center.centerStar },
    { tool: 'calc_feixing', kind: 'center', field: 'starName', value: data.center.starName },
    { tool: 'calc_feixing', kind: 'center', field: 'wuxing', value: data.center.wuxing },
    { tool: 'calc_feixing', kind: 'center', field: 'luck', value: data.center.luck },
  ];
  if (!validateFeixingClaims(data, claims).valid) throw new Error('本次飞星结构化事实未通过本地校验。');
  const labels = ['年份', '元运', '中宫星数', '中宫星名', '中宫五行', '中宫传统标签'];
  const facts = claims.map((claim, index) => ({ label: labels[index], value: String(claim.value), tool: 'calc_feixing' }));
  return resultPresentation('calc_feixing', data.mode, `${data.year} 年${data.yuanYun.name}，中宫 ${data.center.centerStar} 白${data.center.starName}。`, facts, ['飞星标签只作传统规则参考，不作为装修或现实决策保证。'], envelope.provenance);
}

export function executeBazhaiConsultation(input: { birthYear: number; gender: '男' | '女'; year: number }): WizardExecutionResult {
  if (!Number.isInteger(input.birthYear) || input.birthYear < 1900 || input.birthYear > 2100 || !Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) throw new TypeError('请输入 1900-2100 的出生年和查询年份。');
  const envelope = attachLocalProvenance('calc_bazhai', input, calcBazhaiEnveloped(input));
  if (!envelope.ok) throw new Error(envelope.error?.message ?? '八宅计算失败。');
  const data = envelope.data;
  const claims: BazhaiPresentationClaim[] = [
    { tool: 'calc_bazhai', kind: 'mingGua', field: 'trigram', value: data.mingGua.trigram },
    { tool: 'calc_bazhai', kind: 'mingGua', field: 'group', value: data.mingGua.group },
    { tool: 'calc_bazhai', kind: 'mingGua', field: 'num', value: data.mingGua.num ?? 0 },
    { tool: 'calc_bazhai', kind: 'annual', field: 'taisuiDirection', value: data.taisui.taisui.direction },
    { tool: 'calc_bazhai', kind: 'annual', field: 'sanShaDirection', value: data.taisui.sanSha.direction },
    { tool: 'calc_bazhai', kind: 'annual', field: 'fiveYellowDirection', value: data.taisui.fiveYellow.direction },
  ];
  if (!validateBazhaiClaims(data, claims).valid) throw new Error('本次八宅结构化事实未通过本地校验。');
  const labels = ['命卦', '东/西四组', '命卦数', '太岁方', '三煞方', '五黄方'];
  const facts = claims.map((claim, index) => ({ label: labels[index], value: String(claim.value), tool: 'calc_bazhai' }));
  return resultPresentation('calc_bazhai', data.mode, `命卦 ${data.mingGua.trigram}（${data.mingGua.group}）；${input.year} 年太岁方 ${data.taisui.taisui.direction}。`, facts, ['八宅方位属于传统文化规则，不替代建筑、消防或结构评估。'], envelope.provenance);
}

export function executeAlmanacConsultation(input: { date: string; solar?: AlmanacInput['solar'] }): WizardExecutionResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new TypeError('黄历日期必须使用 YYYY-MM-DD。');
  const [year, month, day] = input.date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) throw new TypeError('请输入有效的公历日期。');
  const safeInput = { date: input.date };
  const envelope = attachLocalProvenance('get_almanac', safeInput, getAlmanacEnveloped({ date: input.date, solar: input.solar }));
  if (!envelope.ok) throw new Error(envelope.error?.message ?? '黄历计算失败。');
  const data = envelope.data;
  const fields = ['solarDate', 'lunarDate', 'yearGanZhi', 'monthGanZhi', 'dayGanZhi', 'zodiac', 'dayXiu', 'chong', 'sha'] as const;
  const claims: CalendarPresentationClaim[] = fields.map((field) => ({ tool: 'get_almanac' as const, kind: 'almanac' as const, field, value: data[field] }));
  if (!validateCalendarClaims('almanac', data, claims).valid) throw new Error('本次黄历结构化事实未通过本地校验。');
  const labels = ['公历', '农历', '年柱', '月柱', '日柱', '生肖', '值日星宿', '冲', '煞'];
  const facts = claims.map((claim, index) => ({ label: labels[index], value: String(claim.value), tool: 'get_almanac' }));
  return resultPresentation('get_almanac', envelope.version, `${data.solarDate}（${data.lunarDate}），${data.dayGanZhi}日，值宿${data.dayXiu}。`, facts, ['黄历宜忌属于传统民俗参考，不替代现实安排与专业意见。'], envelope.provenance);
}

export async function executeNameConsultation(input: { surname: string; givenName: string; birthYear?: number }): Promise<WizardExecutionResult> {
  const surname = input.surname.trim(); const givenName = input.givenName.trim();
  if (!/^[\u3400-\u9fff]{1,2}$/.test(surname) || !/^[\u3400-\u9fff]{1,3}$/.test(givenName)) throw new TypeError('请输入 1-2 个汉字姓氏和 1-3 个汉字名字。');
  if (input.birthYear !== undefined && (!Number.isInteger(input.birthYear) || input.birthYear < 1900 || input.birthYear > 2100)) throw new TypeError('出生年份必须为 1900-2100。');
  const safeInput = { surname, givenName, ...(input.birthYear ? { birthYear: input.birthYear } : {}) };
  const envelope = attachLocalProvenance('analyze_name', safeInput, await calcNameRatingEnveloped(surname, givenName, input.birthYear));
  const data = envelope.data;
  const claims: DailyPresentationClaim[] = [
    { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: data.totalScore },
    { tool: 'analyze_name', kind: 'nameRating', field: 'grade', value: data.grade },
    ...data.dimensions.slice(0, 5).map((dimension) => ({ tool: 'analyze_name' as const, kind: 'nameDimension' as const, name: dimension.name, field: 'score' as const, value: dimension.score })),
  ];
  if (!validateDailyClaims('analyze_name', data, claims).valid) throw new Error('本次姓名结构化事实未通过本地校验。');
  const facts = claims.map((claim, index) => ({ label: index === 0 ? '综合分' : index === 1 ? '等级' : data.dimensions[index - 2].name, value: String(claim.value), tool: 'analyze_name' }));
  return resultPresentation('analyze_name', envelope.version, `姓名五维评分完成：综合 ${data.totalScore} 分，等级 ${data.grade}。`, facts, ['姓名评分属于传统姓名学与本地规则参考，不决定个人能力或现实结果。'], envelope.provenance);
}

export function executeDreamConsultation(input: { keyword: string }): WizardExecutionResult {
  const keyword = input.keyword.trim();
  if (!keyword || keyword.length > 20) throw new TypeError('请输入 1-20 个字符的明确梦象关键词。');
  const safeInput = { keyword, useFull: false };
  const envelope = attachLocalProvenance('dream_interpret', safeInput, searchDreamEnveloped(keyword, false));
  const data = envelope.data;
  const claims: DailyPresentationClaim[] = [{ tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: data.hit }];
  data.entries.slice(0, 3).forEach((entry, index) => {
    claims.push({ tool: 'dream_interpret', kind: 'dreamEntry', index, field: 'title', value: entry.title });
    claims.push({ tool: 'dream_interpret', kind: 'dreamEntry', index, field: 'biglx', value: entry.biglx });
    claims.push({ tool: 'dream_interpret', kind: 'dreamEntry', index, field: 'luck', value: entry.luck });
  });
  if (!validateDailyClaims('dream_interpret', data, claims).valid) throw new Error('本次解梦结构化事实未通过本地校验。');
  const facts = [{ label: '是否命中', value: data.hit ? '是' : '否', tool: 'dream_interpret' }, ...data.entries.slice(0, 3).flatMap((entry) => [
    { label: '梦象条目', value: entry.title, tool: 'dream_interpret' }, { label: '分类', value: entry.biglx, tool: 'dream_interpret' }, { label: '传统标签', value: entry.luck, tool: 'dream_interpret' },
  ])];
  return resultPresentation('dream_interpret', envelope.version, `本地梦象库${data.hit ? `命中 ${data.entries.length} 条结构化条目` : '未命中明确条目'}。`, facts, ['梦象内容属于民俗和文化象征，不是现实预测或心理诊断。'], envelope.provenance);
}

export async function executeCeziConsultation(input: { char: string; aspect?: '事业' | '感情' | '财利' | '健康' | '综合' }): Promise<WizardExecutionResult> {
  const char = input.char.trim();
  if (!/^[\u3400-\u9fff]$/.test(char)) throw new TypeError('请输入一个明确的汉字。');
  const safeInput = { char, aspect: input.aspect ?? '综合' };
  const envelope = attachLocalProvenance('cast_cezi', safeInput, await calcCeziEnveloped(safeInput));
  const data = envelope.data;
  const claims: DailyPresentationClaim[] = [
    { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: data.char }, { tool: 'cast_cezi', kind: 'cezi', field: 'strokes', value: data.strokes },
    { tool: 'cast_cezi', kind: 'cezi', field: 'strokesEstimated', value: data.strokesEstimated }, { tool: 'cast_cezi', kind: 'cezi', field: 'charWuxing', value: data.charWuxing },
    { tool: 'cast_cezi', kind: 'ceziShuli', field: 'number', value: data.shuli.number }, { tool: 'cast_cezi', kind: 'ceziShuli', field: 'lucky', value: data.shuli.lucky },
    { tool: 'cast_cezi', kind: 'ceziStructure', field: 'structure', value: data.structure.structure }, { tool: 'cast_cezi', kind: 'ceziStructure', field: 'radical', value: data.structure.radical },
  ];
  if (!validateDailyClaims('cast_cezi', data, claims).valid) throw new Error('本次测字结构化事实未通过本地校验。');
  const labels = ['汉字', '笔画', '笔画是否估算', '字义五行', '数理', '传统标签', '字形结构', '偏旁'];
  const facts = claims.map((claim, index) => ({ label: labels[index], value: String(claim.value), tool: 'cast_cezi' }));
  return resultPresentation('cast_cezi', data.mode, `汉字“${data.char}”共 ${data.strokes} 画，字义五行 ${data.charWuxing}。`, facts, ['测字属于传统文字民俗参考，不作为现实事件预测。'], envelope.provenance);
}

export function executeRhythmConsultation(input: { date: string; hour: number; solar?: RhythmInput['solar'] }): WizardExecutionResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) throw new TypeError('请输入明确的 YYYY-MM-DD 日期和 0-23 小时。');
  const [year, month, day] = input.date.split('-').map(Number); const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) throw new TypeError('请输入有效的公历日期。');
  const safeInput = { date: input.date, hour: input.hour };
  const envelope = attachLocalProvenance('get_daily_rhythm', safeInput, getDailyRhythmEnveloped({ ...safeInput, solar: input.solar }));
  if (!envelope.ok) throw new Error(envelope.error?.message ?? '每日节律计算失败。');
  const data = envelope.data;
  const claims: DailyPresentationClaim[] = [
    { tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: data.date }, { tool: 'get_daily_rhythm', kind: 'rhythm', field: 'jieqi', value: data.jieqi },
  ];
  if (data.meridian) for (const field of ['time', 'hours', 'meridian', 'organ'] as const) claims.push({ tool: 'get_daily_rhythm', kind: 'rhythmMeridian', field, value: data.meridian[field] });
  if (!validateDailyClaims('get_daily_rhythm', data, claims).valid) throw new Error('本次节律结构化事实未通过本地校验。');
  const labels = ['日期', '节气', '时辰', '时段', '经络', '对应脏腑'];
  const facts = claims.map((claim, index) => ({ label: labels[index], value: String(claim.value ?? '无'), tool: 'get_daily_rhythm' }));
  return resultPresentation('get_daily_rhythm', data.mode, `${data.date} 为${data.jieqi}参考；${data.meridian ? `${data.meridian.name}对应${data.meridian.meridian}` : '未匹配时辰经络'}。`, facts, ['节律与经络内容仅作传统养生文化参考，不是医疗诊断。'], envelope.provenance);
}
