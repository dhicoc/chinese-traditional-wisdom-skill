import type { ToolEnvelope } from './baseTypes';
import type { BaziBirth, BaziData, BaziInput } from './baziEngine';
import { calcBaziEnveloped } from './baziEngine';
import { validateBaziClaims, type BaziPresentationClaim } from './claimVerification/baziClaimVerifier';
import { validateDailyClaims, type DailyPresentationClaim } from './claimVerification/dailyClaimVerifier';
import { validateDivinationClaims, type DivinationPresentationClaim } from './claimVerification/divinationClaimVerifier';
import { validateZiweiClaims, type ZiweiPresentationClaim } from './claimVerification/ziweiClaimVerifier';
import { calcChenguzEnveloped, type ChenguzInput, type ChenguzResult } from './chenguzEngine';
import { CHENGUZ_VERSIONS, type ChenguzVersionId } from './chenguzVersions';
import {
  calcDaliurenEnveloped,
  DALIUREN_SCHOOLS,
  type DaliurenData,
  type DaliurenInput,
  type DaliurenSchool,
} from './daliurenEngine';
import { attachLocalProvenance } from './localProvenance';
import { canonicalStringify } from './provenance';
import type { ResultProvenance } from './provenance';
import {
  ACUM_YEAR_NAMES,
  calcTaiyiEnveloped,
  JI_STYLE_NAMES,
  type AcumYearMethod,
  type JiStyle,
  type TaiyiData,
  type TaiyiInput,
} from './taiyiEngine';
import {
  parseLocalToolInput,
  type BaziToolInput,
  type ChenguzToolInput,
  type DaliurenToolInput,
  type TaiyiToolInput,
  type TrueSolarTimeToolInput,
} from './toolContracts';
import { resolveTrueSolarTime, type TrueSolarTimeResolution } from './trueSolarTime';
import {
  calculateZiwei,
  calcZiweiEnveloped,
  getZiweiHoroscopeSummary,
  type ZiweiData,
  type ZiweiInput,
  type ZiweiTransitQuery,
} from './ziweiEngine';

export type StructuredPrimitive = string | number | boolean | null;
export type StructuredValue = StructuredPrimitive | StructuredValue[] | { [key: string]: StructuredValue };

export interface RuleCitation {
  id: string;
  title: string;
  source: string;
  note?: string;
}

export interface RuleVariantResult {
  id: string;
  label: string;
  config: Record<string, StructuredValue>;
  citations: RuleCitation[];
  facts: Record<string, StructuredValue>;
  factsVerified: boolean;
  provenance?: ResultProvenance;
}

export interface RuleComparisonFact {
  field: string;
  label: string;
  value: StructuredValue;
}

export interface RuleComparisonDifference {
  field: string;
  label: string;
  values: Array<{ variantId: string; label: string; value: StructuredValue }>;
}

export interface RuleComparisonResult {
  schemaVersion: '1.0.0';
  domain: RuleComparisonDomain | string;
  variants: RuleVariantResult[];
  commonFacts: RuleComparisonFact[];
  differences: RuleComparisonDifference[];
  limitations: string[];
}

export type RuleComparisonDomain =
  | 'bazi-shensha'
  | 'chenguz-version'
  | 'daliuren-school'
  | 'taiyi-config'
  | 'bazi-time-basis'
  | 'ziwei-dynamic-scope';

const FACT_LABELS: Record<string, string> = {
  yearPillar: '年柱', monthPillar: '月柱', dayPillar: '日柱', hourPillar: '时柱', dayMaster: '日主',
  strength: '日主强弱（传统术语）', elementWood: '木计数', elementFire: '火计数', elementEarth: '土计数',
  elementMetal: '金计数', elementWater: '水计数', shenShaTrineSource: '神煞三合查取基准', shenSha: '神煞列表',
  versionId: '版本标识', versionName: '版本名称', yearBranch: '年支', lunarMonth: '农历月', lunarDay: '农历日',
  hourBranch: '时支', yearBoneQian: '年骨重（钱）', monthBoneQian: '月骨重（钱）', dayBoneQian: '日骨重（钱）',
  hourBoneQian: '时骨重（钱）', totalQian: '总骨重（钱）', totalText: '总骨重', school: '六壬流派配置',
  jieqi: '节气', dayGanZhi: '日干支', hourGanZhi: '时干支', dayNight: '昼夜', yueJiang: '月将',
  yueJiangName: '月将名', tianPan: '天盘', tianJiang: '十二天将', siKe: '四课', sanChuan: '三传',
  jiStyle: '太乙计式', acumYear: '积年法', jiStyleName: '计式名称', acumYearName: '积年法名称',
  yearGz: '年干支', monthGz: '月干支', dayGz: '日干支', hourGz: '时干支', kook: '局式',
  taiyiPosition: '太乙落宫', wenchangPosition: '文昌落宫', shijiPosition: '始击落宫', dingmuPosition: '定目落宫',
  home: '主算结构', away: '客算结构', timeBasis: '时间基准', birthTime: '用于定盘的出生时间',
  trueSolarCorrectionMinutes: '真太阳时校正分钟', crossedDate: '是否跨日期', crossedShichen: '是否跨时辰',
  crossedZiChu: '是否跨子初换日边界', dynamicScope: '紫微动态层口径', dynamicAnchor: '动态层日期锚点',
  enabledDynamicLayers: '已启用动态层', disabledDynamicLayers: '未启用动态层', fiveElementsClass: '五行局',
  soul: '命主', body: '身主', bodyPalaceBranch: '身宫地支', originalPalaceBranch: '来因宫地支', mainStars: '本命主星', sihua: '本命四化',
  transitDecadal: '大限干支', transitYearly: '流年干支', transitMonthly: '流月干支', transitAge: '小限虚岁',
};

const NO_RANKING_LIMITATIONS = [
  '本页只显示结构化规则差异，不判断某一流派更准确。',
  '传统解释、吉凶、应期和现实事件不参与规则选择。',
];

function normalizeStructuredValue(value: StructuredValue): StructuredValue {
  if (Array.isArray(value)) {
    return value.map(normalizeStructuredValue).sort((left, right) => {
      const leftJson = canonicalStringify(left);
      const rightJson = canonicalStringify(right);
      return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
    });
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeStructuredValue(value[key])]));
  }
  return value;
}

/** Compare only explicitly supplied structured facts; arrays are treated as collection-like values. */
export function compareStructuredVariants(
  domain: string,
  variants: RuleVariantResult[],
  limitations: string[],
  fieldLabels: Record<string, string> = {},
): RuleComparisonResult {
  if (variants.length < 2) throw new RangeError('至少需要两个规则变体。');
  if (new Set(variants.map(({ id }) => id)).size !== variants.length) throw new RangeError('规则变体 id 不得重复。');
  if (variants.some(({ citations }) => citations.length === 0)) throw new RangeError('每个规则变体至少需要一个规则来源。');

  const normalizedVariants = variants.map((variant) => ({
    ...variant,
    config: normalizeStructuredValue(variant.config as StructuredValue) as Record<string, StructuredValue>,
    facts: Object.fromEntries(Object.entries(variant.facts).map(([field, value]) => [field, normalizeStructuredValue(value)])),
  }));
  const fields = [...new Set(normalizedVariants.flatMap((variant) => Object.keys(variant.facts)))].sort();
  const commonFacts: RuleComparisonFact[] = [];
  const differences: RuleComparisonDifference[] = [];

  for (const field of fields) {
    const values = normalizedVariants.map((variant) => variant.facts[field] ?? null);
    const label = fieldLabels[field] ?? FACT_LABELS[field] ?? field;
    if (values.every((value) => canonicalStringify(value) === canonicalStringify(values[0]))) {
      commonFacts.push({ field, label, value: values[0] });
    } else {
      differences.push({
        field,
        label,
        values: normalizedVariants.map((variant, index) => ({ variantId: variant.id, label: variant.label, value: values[index] })),
      });
    }
  }

  return { schemaVersion: '1.0.0', domain, variants: normalizedVariants, commonFacts, differences, limitations: [...new Set(limitations)] };
}

function baziPillar(data: BaziData, key: 'year' | 'month' | 'day' | 'hour'): string {
  return `${data.pillars[key].stem}${data.pillars[key].branch}`;
}

function baziFacts(data: BaziData): Record<string, StructuredValue> {
  return {
    yearPillar: baziPillar(data, 'year'), monthPillar: baziPillar(data, 'month'), dayPillar: baziPillar(data, 'day'),
    hourPillar: baziPillar(data, 'hour'), dayMaster: data.dayMaster, strength: data.advancedAnalysis.support.strength,
    elementWood: data.elements.木, elementFire: data.elements.火, elementEarth: data.elements.土,
    elementMetal: data.elements.金, elementWater: data.elements.水, shenShaTrineSource: data.shenShaTrineSource,
    shenSha: [...new Set(data.shenSha.map((item) => `${item.pillar}:${item.name}`))],
  };
}

function baziClaims(data: BaziData): BaziPresentationClaim[] {
  return [
    ...(['year', 'month', 'day', 'hour'] as const).map((key) => ({ tool: 'bazi_calculate' as const, kind: 'pillar' as const, pillar: key, value: baziPillar(data, key) })),
    { tool: 'bazi_calculate', kind: 'dayMaster', value: data.dayMaster },
    ...(['木', '火', '土', '金', '水'] as const).map((element) => ({ tool: 'bazi_calculate' as const, kind: 'elementCount' as const, element, value: data.elements[element] })),
    { tool: 'bazi_calculate', kind: 'strength', value: data.advancedAnalysis.support.strength },
    ...[...new Set(data.shenSha.map((item) => item.name))].map((value) => ({ tool: 'bazi_calculate' as const, kind: 'shenSha' as const, value })),
  ];
}

const BAZI_SHENSHA_CITATION: RuleCitation = {
  id: 'ctw-shensha-reference', title: '八字神煞依据文档：年支/日支三合查法', source: 'apps/visual/src/legacy/shensha.ts#year-day-trine-rules',
  note: '桃花、驿马、华盖、将星等三合类神煞允许按年支或日支显式对照。',
};

export interface BaziShenShaComparisonInput { birth: BaziBirth; solar?: BaziInput['solar'] }

export function compareBaziShenShaRules(input: BaziShenShaComparisonInput): RuleComparisonResult {
  const variants = (['year', 'day'] as const).map((source): RuleVariantResult => {
    const calculationInput = { birth: input.birth, shenShaTrineSource: source };
    const envelope = attachLocalProvenance('bazi_calculate', calculationInput, calcBaziEnveloped({ ...calculationInput, solar: input.solar }));
    return {
      id: source, label: source === 'year' ? '神煞三合按年支' : '神煞三合按日支', config: { shenShaTrineSource: source },
      citations: [BAZI_SHENSHA_CITATION], facts: baziFacts(envelope.data),
      factsVerified: validateBaziClaims(envelope.data, baziClaims(envelope.data)).valid, provenance: envelope.provenance,
    };
  });
  return compareStructuredVariants('bazi-shensha', variants, NO_RANKING_LIMITATIONS);
}

function boneQian(weight: { liang: number; qian: number }): number { return weight.liang * 10 + weight.qian; }

function chenguzFacts(data: ChenguzResult): Record<string, StructuredValue> {
  return {
    versionId: data.versionId, versionName: data.versionName, yearBranch: data.yearBone.branch,
    lunarMonth: data.monthBone.lunarMonth, lunarDay: data.dayBone.lunarDay, hourBranch: data.hourBone.branch,
    yearBoneQian: boneQian(data.yearBone.weight), monthBoneQian: boneQian(data.monthBone.weight),
    dayBoneQian: boneQian(data.dayBone.weight), hourBoneQian: boneQian(data.hourBone.weight),
    totalQian: boneQian(data.total), totalText: data.totalText,
  };
}

function chenguzClaims(data: ChenguzResult): DailyPresentationClaim[] {
  return [
    { tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'id', value: data.versionId },
    { tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'name', value: data.versionName },
    { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'yearBone', field: 'branch', value: data.yearBone.branch },
    { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'monthBone', field: 'lunarMonth', value: data.monthBone.lunarMonth },
    { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'dayBone', field: 'lunarDay', value: data.dayBone.lunarDay },
    { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'hourBone', field: 'branch', value: data.hourBone.branch },
    { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'liang', value: data.total.liang },
    { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'qian', value: data.total.qian },
    { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: data.totalText },
  ];
}

export interface ChenguzVersionComparisonInput {
  birth: ChenguzInput['birth']; versions?: ChenguzVersionId[]; solar?: ChenguzInput['solar'];
}

export function compareChenguzVersions(input: ChenguzVersionComparisonInput): RuleComparisonResult {
  const versions = input.versions ?? CHENGUZ_VERSIONS.map(({ id }) => id);
  const variants = versions.map((versionId): RuleVariantResult => {
    const version = CHENGUZ_VERSIONS.find(({ id }) => id === versionId);
    if (!version) throw new RangeError(`未知称骨版本：${versionId}`);
    const calculationInput = { birth: input.birth, version: versionId };
    const envelope = attachLocalProvenance('calc_chenguz', calculationInput, calcChenguzEnveloped({ ...calculationInput, solar: input.solar }));
    return {
      id: versionId, label: version.name, config: { version: versionId },
      citations: [{ id: `chenguz-${versionId}`, title: version.name, source: version.source, note: version.note }],
      facts: chenguzFacts(envelope.data), factsVerified: validateDailyClaims('calc_chenguz', envelope.data, chenguzClaims(envelope.data)).valid,
      provenance: envelope.provenance,
    };
  });
  return compareStructuredVariants('chenguz-version', variants, [
    ...NO_RANKING_LIMITATIONS,
    '称骨歌属于解释性文本，不进入字段差异或事实校验。',
  ]);
}

function daliurenFacts(data: DaliurenData): Record<string, StructuredValue> {
  return {
    school: data.school, jieqi: data.basicInfo.jieqi, dayGanZhi: data.basicInfo.dayGanZhi, hourGanZhi: data.basicInfo.hourGanZhi,
    dayNight: data.basicInfo.dayNight, yueJiang: data.basicInfo.yueJiang, yueJiangName: data.basicInfo.yueJiangName,
    tianPan: data.tianDiPan.diToTian, tianJiang: data.tianDiPan.diToJiang,
    siKe: Object.fromEntries(data.siKe.list.map((item) => [String(item.position), { shangShen: item.shangShen, xiaShen: item.xiaShen, tianJiang: item.tianJiang, relation: item.relation }])),
    sanChuan: {
      chuChuan: { diZhi: data.sanChuan.chuChuan.diZhi, tianJiang: data.sanChuan.chuChuan.tianJiang, liuQin: data.sanChuan.chuChuan.liuQin, xunKong: data.sanChuan.chuChuan.xunKong },
      zhongChuan: { diZhi: data.sanChuan.zhongChuan.diZhi, tianJiang: data.sanChuan.zhongChuan.tianJiang, liuQin: data.sanChuan.zhongChuan.liuQin, xunKong: data.sanChuan.zhongChuan.xunKong },
      moChuan: { diZhi: data.sanChuan.moChuan.diZhi, tianJiang: data.sanChuan.moChuan.tianJiang, liuQin: data.sanChuan.moChuan.liuQin, xunKong: data.sanChuan.moChuan.xunKong },
    },
  };
}

function daliurenClaims(data: DaliurenData): DivinationPresentationClaim[] {
  const basicFields = ['jieqi', 'dayGanZhi', 'hourGanZhi', 'dayNight', 'yueJiang', 'yueJiangName'] as const;
  const sikeFields = ['shangShen', 'xiaShen', 'tianJiang', 'relation'] as const;
  const stages = ['chuChuan', 'zhongChuan', 'moChuan'] as const;
  return [
    ...basicFields.map((field) => ({ tool: 'liuren_calculate' as const, kind: 'basic' as const, field, value: data.basicInfo[field] })),
    ...data.siKe.list.flatMap((item) => sikeFields.map((field) => ({ tool: 'liuren_calculate' as const, kind: 'sike' as const, position: item.position, field, value: item[field] }))),
    ...stages.flatMap((stage) => [
      ...(['diZhi', 'tianJiang', 'liuQin'] as const).map((field) => ({ tool: 'liuren_calculate' as const, kind: 'sanchuan' as const, stage, field, value: data.sanChuan[stage][field] })),
      { tool: 'liuren_calculate' as const, kind: 'sanchuan' as const, stage, field: 'xunKong' as const, value: data.sanChuan[stage].xunKong },
    ]),
  ];
}

export interface DaliurenSchoolComparisonInput {
  birth: DaliurenInput['birth']; schools?: DaliurenSchool[]; solar?: DaliurenInput['solar'];
}

export function compareDaliurenSchools(input: DaliurenSchoolComparisonInput): RuleComparisonResult {
  const schools = input.schools ?? (['classic', 'gufa', 'daxquan'] as const);
  const variants = schools.map((school): RuleVariantResult => {
    const metadata = DALIUREN_SCHOOLS[school];
    if (!metadata) throw new RangeError(`未知大六壬流派：${school}`);
    const calculationInput = { birth: input.birth, school };
    const envelope = attachLocalProvenance('liuren_calculate', calculationInput, calcDaliurenEnveloped({ ...calculationInput, solar: input.solar }));
    return {
      id: school, label: metadata.name, config: { school },
      citations: [{ id: `daliuren-${school}`, title: metadata.name, source: 'apps/visual/src/legacy/daliurenEngine.ts#DALIUREN_SCHOOLS', note: metadata.note }],
      facts: daliurenFacts(envelope.data), factsVerified: validateDivinationClaims('liuren_calculate', envelope.data, daliurenClaims(envelope.data)).valid,
      provenance: envelope.provenance,
    };
  });
  return compareStructuredVariants('daliuren-school', variants, NO_RANKING_LIMITATIONS);
}

export interface TaiyiRuleConfig { jiStyle: JiStyle; acumYear: AcumYearMethod }

function taiyiFacts(data: TaiyiData, config: TaiyiRuleConfig): Record<string, StructuredValue> {
  return {
    jiStyle: config.jiStyle, acumYear: config.acumYear, jiStyleName: data.basicInfo.jiStyleName, acumYearName: data.basicInfo.acumYearName,
    yearGz: data.basicInfo.yearGz, monthGz: data.basicInfo.monthGz, dayGz: data.basicInfo.dayGz, hourGz: data.basicInfo.hourGz,
    jieqi: data.basicInfo.jieqi, kook: data.kook, taiyiPosition: data.taiyi, wenchangPosition: { gong: data.wenchang.gong },
    shijiPosition: data.shiji, dingmuPosition: data.dingmu, home: { cal: data.home.cal, general: data.home.general, vgen: data.home.vgen },
    away: { cal: data.away.cal, general: data.away.general, vgen: data.away.vgen },
  };
}

function taiyiClaims(data: TaiyiData): DivinationPresentationClaim[] {
  return [
    ...(['yearGz', 'monthGz', 'dayGz', 'hourGz', 'jieqi', 'jiStyleName', 'acumYearName'] as const).map((field) => ({ tool: 'taiyi_calculate' as const, kind: 'basic' as const, field, value: data.basicInfo[field] })),
    ...(['wen', 'nian', 'dun'] as const).map((field) => ({ tool: 'taiyi_calculate' as const, kind: 'kook' as const, field, value: data.kook[field] })),
    { tool: 'taiyi_calculate', kind: 'kook', field: 'num', value: data.kook.num },
    { tool: 'taiyi_calculate', kind: 'position', subject: 'taiyi', field: 'gong', value: data.taiyi.gong },
    { tool: 'taiyi_calculate', kind: 'position', subject: 'taiyi', field: 'num', value: data.taiyi.num },
    ...(['wenchang', 'shiji', 'dingmu'] as const).map((subject) => ({ tool: 'taiyi_calculate' as const, kind: 'position' as const, subject, field: 'gong' as const, value: data[subject].gong })),
    ...(['home', 'away'] as const).flatMap((side) => (['cal', 'general', 'vgen'] as const).map((field) => ({ tool: 'taiyi_calculate' as const, kind: 'calculation' as const, side, field, value: data[side][field] }))),
  ];
}

const DEFAULT_TAIYI_CONFIGS: TaiyiRuleConfig[] = [
  { jiStyle: 0, acumYear: 0 }, { jiStyle: 0, acumYear: 1 }, { jiStyle: 2, acumYear: 0 }, { jiStyle: 3, acumYear: 3 },
];

export interface TaiyiRuleComparisonInput {
  birth: TaiyiInput['birth']; configs?: TaiyiRuleConfig[]; solar?: TaiyiInput['solar'];
}

export function compareTaiyiRules(input: TaiyiRuleComparisonInput): RuleComparisonResult {
  const configs = input.configs ?? DEFAULT_TAIYI_CONFIGS;
  if (configs.length < 2 || configs.length > 4) throw new RangeError('太乙规则比较必须显式选择 2-4 个配置。');
  const variants = configs.map((config): RuleVariantResult => {
    const label = `${JI_STYLE_NAMES[config.jiStyle]} · ${ACUM_YEAR_NAMES[config.acumYear]}`;
    const calculationInput = { birth: input.birth, ...config };
    const envelope = attachLocalProvenance('taiyi_calculate', calculationInput, calcTaiyiEnveloped({ ...calculationInput, solar: input.solar }));
    return {
      id: `ji${config.jiStyle}-ay${config.acumYear}`, label, config: { jiStyle: config.jiStyle, acumYear: config.acumYear },
      citations: [{ id: `taiyi-ji${config.jiStyle}-ay${config.acumYear}`, title: label, source: 'apps/visual/src/legacy/taiyiEngine.ts#JI_STYLE_NAMES', note: '项目太乙计式与积年法结构化规则表。' }],
      facts: taiyiFacts(envelope.data, config), factsVerified: validateDivinationClaims('taiyi_calculate', envelope.data, taiyiClaims(envelope.data)).valid,
      provenance: envelope.provenance,
    };
  });
  return compareStructuredVariants('taiyi-config', variants, NO_RANKING_LIMITATIONS);
}

function assertVerifiedTrueSolarResolution(value: TrueSolarTimeResolution): TrueSolarTimeResolution {
  if (value.status !== 'resolved' || value.source !== 'agent-verified' || !value.location?.utcOffsetEvidence?.trim() || !value.location.ianaTimeZone?.includes('/')) {
    throw new TypeError('时间基准比较需要完整、外部核验且可复算的真太阳时结果。');
  }
  const recomputed = resolveTrueSolarTime(value.civilBirth, value.location);
  const keys: Array<keyof TrueSolarTimeResolution> = [
    'trueSolarBirth', 'longitudeCorrectionMinutes', 'equationOfTimeMinutes', 'trueSolarCorrectionMinutes',
    'crossedDate', 'crossedShichen', 'crossedZiChu', 'evidence',
  ];
  if (!keys.every((key) => canonicalStringify(value[key]) === canonicalStringify(recomputed[key]))) {
    throw new TypeError('真太阳时结果与本地复算不一致，不能进行时间基准比较。');
  }
  return recomputed;
}

function birthTimeText(birth: BaziBirth): string {
  return `${String(birth.hour).padStart(2, '0')}:${String(birth.minute ?? 0).padStart(2, '0')}`;
}

export interface BaziTimeBasisComparisonInput { resolution: TrueSolarTimeResolution; solar?: BaziInput['solar'] }

export function compareBaziTimeBasis(input: BaziTimeBasisComparisonInput): RuleComparisonResult {
  const resolution = assertVerifiedTrueSolarResolution(input.resolution);
  const variants = ([
    { id: 'civil', label: '民用时间基准（对照）', birth: resolution.civilBirth, timeBasis: 'civil-unverified' as const },
    { id: 'true-solar', label: '已核验真太阳时', birth: resolution.trueSolarBirth, timeBasis: 'true-solar-verified' as const },
  ]).map((variant): RuleVariantResult => {
    const calculationInput = { birth: variant.birth, shenShaTrineSource: 'year' as const, timeBasis: variant.timeBasis };
    const envelope = attachLocalProvenance('bazi_calculate', calculationInput, calcBaziEnveloped({ birth: variant.birth, shenShaTrineSource: 'year', solar: input.solar }));
    const correctionFacts = variant.id === 'true-solar'
      ? { trueSolarCorrectionMinutes: resolution.trueSolarCorrectionMinutes, crossedDate: resolution.crossedDate, crossedShichen: resolution.crossedShichen, crossedZiChu: resolution.crossedZiChu }
      : { trueSolarCorrectionMinutes: null, crossedDate: false, crossedShichen: false, crossedZiChu: false };
    return {
      id: variant.id, label: variant.label, config: { timeBasis: variant.timeBasis },
      citations: [{
        id: `bazi-time-${variant.id}`, title: variant.label,
        source: 'RULES.md#7-真太阳时核验与民用降级',
        note: variant.id === 'true-solar' ? resolution.location.utcOffsetEvidence : '民用时间仅作为明确降级对照。',
      }],
      facts: { ...baziFacts(envelope.data), timeBasis: variant.timeBasis, birthTime: birthTimeText(variant.birth), ...correctionFacts },
      factsVerified: validateBaziClaims(envelope.data, baziClaims(envelope.data)).valid, provenance: envelope.provenance,
    };
  });
  return compareStructuredVariants('bazi-time-basis', variants, [
    ...NO_RANKING_LIMITATIONS,
    '只有外部核验的经度、IANA 时区、出生当日 UTC 偏移与夏令时证据齐全且本地复算一致时，才显示真太阳时对照。',
  ]);
}

function ziweiNatalFacts(data: ZiweiData): Record<string, StructuredValue> {
  return {
    fiveElementsClass: data.fiveElementsClass ?? null, soul: data.soul ?? null, body: data.body ?? null,
    bodyPalaceBranch: data.bodyPalaceBranch ?? null, originalPalaceBranch: data.originalPalaceBranch ?? null,
    mainStars: data.mainStars, sihua: data.sihua,
  };
}

function ziweiNatalClaims(data: ZiweiData): ZiweiPresentationClaim[] {
  const claims: ZiweiPresentationClaim[] = [
    ...data.mainStars.map((value) => ({ tool: 'ziwei_chart' as const, kind: 'mainStar' as const, value })),
    ...Object.entries(data.sihua).map(([star, value]) => ({ tool: 'ziwei_chart' as const, kind: 'sihua' as const, star, value })),
  ];
  for (const field of ['fiveElementsClass', 'soul', 'body', 'bodyPalaceBranch', 'originalPalaceBranch'] as const) {
    const value = data[field];
    if (value) claims.push({ tool: 'ziwei_chart', kind: 'metadata', field, value });
  }
  return claims;
}

export interface ZiweiDynamicScopeComparisonInput {
  birth: ZiweiInput['birth']; transit: ZiweiTransitQuery; mingGua?: ZiweiInput['mingGua'];
}

export function compareZiweiDynamicScope(input: ZiweiDynamicScopeComparisonInput): RuleComparisonResult {
  const natalInput = { birth: input.birth, mingGua: input.mingGua };
  const natalResult = calculateZiwei(natalInput);
  const natalBaseEnvelope: ToolEnvelope<ZiweiData> = {
    ok: natalResult.mode === 'local-exact',
    tool: natalResult.engineName,
    version: natalResult.version,
    input_normalized: natalInput as unknown as Record<string, unknown>,
    data: { ...natalResult, export_snapshot: { summary: '', tags: [], sections: [], sourceNotes: '仅本命结构化比较。' } },
    warnings: [natalResult.confidenceNote ?? ''],
  };
  const natalEnvelope = attachLocalProvenance('ziwei_chart', { ...natalInput, dynamicScope: 'natal-only' }, natalBaseEnvelope);
  const dynamicInput = { birth: input.birth, mingGua: input.mingGua, transit: input.transit };
  const dynamicEnvelope = attachLocalProvenance('ziwei_chart', dynamicInput, calcZiweiEnveloped(dynamicInput));
  const horoscope = getZiweiHoroscopeSummary(input.birth, input.transit.year, input.transit.month);
  const natalFacts = ziweiNatalFacts(natalEnvelope.data);
  const dynamicNatalFacts = ziweiNatalFacts(dynamicEnvelope.data);
  const natalVerified = validateZiweiClaims(natalEnvelope.data, ziweiNatalClaims(natalEnvelope.data)).valid;
  const dynamicNatalVerified = validateZiweiClaims(dynamicEnvelope.data, ziweiNatalClaims(dynamicEnvelope.data)).valid;
  const transitClaims: ZiweiPresentationClaim[] = horoscope.available ? [
    { tool: 'ziwei_chart', kind: 'transit', field: 'decadal', value: `${horoscope.decadal.stem}${horoscope.decadal.branch}` },
    { tool: 'ziwei_chart', kind: 'transit', field: 'yearly', value: `${horoscope.yearly.stem}${horoscope.yearly.branch}` },
    { tool: 'ziwei_chart', kind: 'transit', field: 'monthly', value: `${horoscope.monthly.stem}${horoscope.monthly.branch}` },
    { tool: 'ziwei_chart', kind: 'transit', field: 'age', value: horoscope.age.nominalAge },
  ] : [];
  const variants: RuleVariantResult[] = [
    {
      id: 'natal-only', label: '仅本命层', config: { dynamicScope: 'natal-only' },
      citations: [{ id: 'ziwei-natal', title: '紫微本命十二宫与四化口径', source: 'apps/visual/src/legacy/ziweiEngine.ts#dynamic-transit', note: 'SylarLong/iztro@2.5.8 本命盘。' }],
      facts: { ...natalFacts, dynamicScope: 'natal-only', dynamicAnchor: null, enabledDynamicLayers: [], disabledDynamicLayers: ['流日', '流时', '三方四正'] },
      factsVerified: natalVerified, provenance: natalEnvelope.provenance,
    },
    {
      id: 'month-dynamic', label: '本命 + 月度动态层',
      config: { dynamicScope: 'month', transit: { year: input.transit.year, month: input.transit.month, day: 15 } },
      citations: [{ id: 'ziwei-month-dynamic', title: '紫微大限/流年/流月/小限口径', source: 'apps/visual/src/legacy/ziweiEngine.ts#dynamic-transit', note: 'SylarLong/iztro@2.5.8 horoscope；日期固定为目标月 15 日。' }],
      facts: {
        ...dynamicNatalFacts, dynamicScope: 'month', dynamicAnchor: `${input.transit.year}-${String(input.transit.month).padStart(2, '0')}-15`,
        enabledDynamicLayers: ['大限', '流年', '流月', '小限'], disabledDynamicLayers: ['流日', '流时', '三方四正'],
        ...(horoscope.available ? {
          transitDecadal: `${horoscope.decadal.stem}${horoscope.decadal.branch}`,
          transitYearly: `${horoscope.yearly.stem}${horoscope.yearly.branch}`,
          transitMonthly: `${horoscope.monthly.stem}${horoscope.monthly.branch}`,
          transitAge: horoscope.age.nominalAge,
        } : {}),
      },
      factsVerified: dynamicNatalVerified && horoscope.available && validateZiweiClaims(dynamicEnvelope.data, transitClaims, horoscope).valid,
      provenance: dynamicEnvelope.provenance,
    },
  ];
  return compareStructuredVariants('ziwei-dynamic-scope', variants, [
    ...NO_RANKING_LIMITATIONS,
    '动态层只展示引擎已返回的大限、流年、流月与小限，不补算流日、流时或三方四正。',
  ]);
}

export interface BaziShenShaRuleComparisonRequest { domain: 'bazi-shensha'; baseInput: BaziToolInput }
export interface ChenguzVersionRuleComparisonRequest { domain: 'chenguz-version'; baseInput: ChenguzToolInput; variants: ChenguzVersionId[] }
export interface DaliurenSchoolRuleComparisonRequest { domain: 'daliuren-school'; baseInput: DaliurenToolInput; variants: DaliurenSchool[] }
export interface TaiyiRuleComparisonRequest { domain: 'taiyi-config'; baseInput: TaiyiToolInput; variants: TaiyiRuleConfig[] }
export interface BaziTimeBasisRuleComparisonRequest { domain: 'bazi-time-basis'; baseInput: TrueSolarTimeToolInput }
export interface ZiweiDynamicScopeRuleComparisonRequest { domain: 'ziwei-dynamic-scope'; baseInput: ZiweiInput & { transit: ZiweiTransitQuery } }
export type RuleComparisonRequest =
  | BaziShenShaRuleComparisonRequest | ChenguzVersionRuleComparisonRequest | DaliurenSchoolRuleComparisonRequest
  | TaiyiRuleComparisonRequest | BaziTimeBasisRuleComparisonRequest | ZiweiDynamicScopeRuleComparisonRequest;

function inputObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label}必须是 JSON 对象。`);
  return value as Record<string, unknown>;
}

function stringVariants<T extends string>(value: unknown, allowed: readonly T[], label: string, max = allowed.length): T[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > max) throw new TypeError(`${label}必须显式选择 2-${max} 个配置。`);
  if (new Set(value).size !== value.length || value.some((item) => typeof item !== 'string' || !allowed.includes(item as T))) {
    throw new TypeError(`${label}包含未知或重复配置。`);
  }
  return value as T[];
}

export function parseRuleComparisonRequest(value: unknown): RuleComparisonRequest {
  const input = inputObject(value, '规则比较输入');
  const baseInput = inputObject(input.baseInput, 'baseInput');
  switch (input.domain) {
    case 'bazi-shensha':
      return { domain: 'bazi-shensha', baseInput: parseLocalToolInput('bazi_calculate', baseInput) as BaziToolInput };
    case 'chenguz-version':
      return {
        domain: 'chenguz-version', baseInput: parseLocalToolInput('calc_chenguz', baseInput) as ChenguzToolInput,
        variants: stringVariants(input.variants, ['standard', 'folk', 'full'] as const, 'variants'),
      };
    case 'daliuren-school':
      return {
        domain: 'daliuren-school', baseInput: parseLocalToolInput('liuren_calculate', baseInput) as DaliurenToolInput,
        variants: stringVariants(input.variants, ['classic', 'gufa', 'daxquan'] as const, 'variants'),
      };
    case 'taiyi-config': {
      if (!Array.isArray(input.variants) || input.variants.length < 2 || input.variants.length > 4) throw new TypeError('variants 必须显式选择 2-4 个太乙配置。');
      const birth = parseLocalToolInput('taiyi_calculate', baseInput) as TaiyiToolInput;
      const variants = input.variants.map((raw) => {
        const config = inputObject(raw, 'variants[]');
        const parsed = parseLocalToolInput('taiyi_calculate', { birth: birth.birth, ...config }) as TaiyiToolInput;
        return { jiStyle: parsed.jiStyle ?? 0, acumYear: parsed.acumYear ?? 0 };
      });
      if (new Set(variants.map((item) => `${item.jiStyle}:${item.acumYear}`)).size !== variants.length) throw new TypeError('variants 包含重复太乙配置。');
      return { domain: 'taiyi-config', baseInput: birth, variants };
    }
    case 'bazi-time-basis':
      return { domain: 'bazi-time-basis', baseInput: parseLocalToolInput('resolve_true_solar_time', baseInput) as TrueSolarTimeToolInput };
    case 'ziwei-dynamic-scope': {
      const parsed = parseLocalToolInput('ziwei_chart', baseInput) as ZiweiInput;
      if (!parsed.transit) throw new TypeError('紫微动态口径比较必须显式提供 transit.year/month。');
      return { domain: 'ziwei-dynamic-scope', baseInput: parsed as ZiweiInput & { transit: ZiweiTransitQuery } };
    }
    default:
      throw new TypeError('domain 必须是 bazi-shensha、chenguz-version、daliuren-school、taiyi-config、bazi-time-basis 或 ziwei-dynamic-scope。');
  }
}

export type RuleComparisonSolar = NonNullable<BaziInput['solar']> & NonNullable<ChenguzInput['solar']> & NonNullable<DaliurenInput['solar']> & NonNullable<TaiyiInput['solar']>;

export function runRuleComparison(request: RuleComparisonRequest, solar?: RuleComparisonSolar): RuleComparisonResult {
  switch (request.domain) {
    case 'bazi-shensha': return compareBaziShenShaRules({ birth: request.baseInput.birth, solar });
    case 'chenguz-version': return compareChenguzVersions({ birth: request.baseInput.birth, versions: request.variants, solar });
    case 'daliuren-school': return compareDaliurenSchools({ birth: request.baseInput.birth, schools: request.variants, solar });
    case 'taiyi-config': return compareTaiyiRules({ birth: request.baseInput.birth, configs: request.variants, solar });
    case 'bazi-time-basis': {
      const birth = { ...request.baseInput.birth, minute: request.baseInput.birth.minute ?? 0, gender: request.baseInput.birth.gender === '女' ? '女' as const : '男' as const, useExactCalendar: true };
      return compareBaziTimeBasis({ resolution: resolveTrueSolarTime(birth, request.baseInput.location), solar });
    }
    case 'ziwei-dynamic-scope': return compareZiweiDynamicScope(request.baseInput);
  }
}
