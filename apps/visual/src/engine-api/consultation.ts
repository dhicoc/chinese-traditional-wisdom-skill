import type { BaziBirth, BaziInput } from '@/legacy/baziEngine';
import { calcBaziEnveloped } from '@/legacy/baziEngine';
import { validateBaziClaims, type BaziPresentationClaim } from '@/legacy/claimVerification/baziClaimVerifier';
import { attachLocalProvenance } from '@/legacy/localProvenance';
import type { ResultProvenance } from '@/legacy/provenance';
import type { StructuredFact, TypedSemanticPresentation } from '@/legacy/reportLayers';

export interface BaziConsultationInput {
  birth: BaziBirth;
  timeBasis: 'civil-unverified';
  civilFallbackConfirmed: true;
  solar?: BaziInput['solar'];
}

export interface BaziConsultationResult {
  state: 'success';
  tool: 'bazi_calculate';
  mode: 'local-exact' | 'local-approx';
  factsVerified: true;
  verifiedFacts: StructuredFact[];
  presentation: TypedSemanticPresentation;
  provenance?: ResultProvenance;
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
  return {
    state: 'success',
    tool: 'bazi_calculate',
    mode: data.mode,
    factsVerified: true,
    verifiedFacts,
    provenance: envelope.provenance,
    presentation: {
      summary,
      overallTone: '中',
      highlights: verifiedFacts.slice(0, 5).map((fact) => ({ label: fact.label, value: fact.value, tone: '中' as const, strength: null })),
      details: [],
      actions: [],
      limitations: [
        '未完成真太阳时复核：本次按用户明确确认的民用出生记录计算。',
        '结构化事实校验不验证传统解释、建议、预测或现实效果。',
      ],
      disclaimers: ['本结果仅作传统文化学习与参考，不构成现实结果保证。'],
      tags: ['统一咨询向导', '八字', data.mode],
    },
  };
}
