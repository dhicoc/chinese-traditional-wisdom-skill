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
