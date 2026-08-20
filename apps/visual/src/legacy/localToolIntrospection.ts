import { LOCAL_TOOL_NAMES, type LocalToolName } from './localToolRegistry';

export type LocalToolCategory = 'time-calibration' | 'chart' | 'fengshui' | 'divination' | 'daily' | 'interpretation' | 'name' | 'constitution' | 'combo';
export type LocalToolResultKind = 'ToolEnvelope' | 'TrueSolarTimeResolution';
export type LocalToolRiskDomain = 'general' | 'health' | 'finance' | 'relationship' | 'housing';
export type LocalClaimVerifierKind = 'bazi' | 'ziwei' | 'feixing' | 'bazhai' | 'calendar' | 'divination' | 'daily' | 'combo' | 'none';

export interface LocalToolDescriptor {
  name: LocalToolName;
  category: LocalToolCategory;
  resultKind: LocalToolResultKind;
  successFixture: string;
  claimVerifier: LocalClaimVerifierKind;
  claimKinds: string[];
  riskDomain: LocalToolRiskDomain;
  limitations: string[];
  inputSchemaVersion: string;
  inputSchema: Record<string, unknown>;
}

const BIRTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['year', 'month', 'day', 'hour', 'gender'],
  properties: {
    year: { type: 'integer', minimum: 1900, maximum: 2100 },
    month: { type: 'integer', minimum: 1, maximum: 12 },
    day: { type: 'integer', minimum: 1, maximum: 31 },
    hour: { type: 'integer', minimum: 0, maximum: 23 },
    minute: { type: 'integer', minimum: 0, maximum: 59, default: 0 },
    gender: { type: 'string', enum: ['男', '女'] },
    isLunar: { type: 'boolean', default: false },
  },
} as const;

const BAZI_INPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['birth', 'timeBasis'],
  properties: {
    birth: BIRTH_SCHEMA,
    timeBasis: { type: 'string', enum: ['true-solar-verified', 'civil-unverified'] },
    civilFallbackConfirmed: { type: 'boolean' },
    trueSolarResolution: { type: 'object', description: 'timeBasis=true-solar-verified 时必须提供完整、可重新计算的 TrueSolarTimeResolution。' },
    shenShaTrineSource: { type: 'string', enum: ['year', 'day'], default: 'year' },
    transitDate: { type: 'string', format: 'date' },
  },
  allOf: [
    {
      if: { properties: { timeBasis: { const: 'civil-unverified' } }, required: ['timeBasis'] },
      then: { properties: { civilFallbackConfirmed: { const: true } }, required: ['civilFallbackConfirmed'] },
    },
    {
      if: { properties: { timeBasis: { const: 'true-solar-verified' } }, required: ['timeBasis'] },
      then: { required: ['trueSolarResolution'] },
    },
  ],
} as const;

const EXPLICIT_TIME_SCHEMAS: Partial<Record<LocalToolName, Record<string, unknown>>> = {
  calc_feixing: {
    $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
    required: ['year'],
    properties: { year: { type: 'integer', minimum: 1, maximum: 9999 }, birthYear: { type: 'integer', minimum: 1, maximum: 9999 }, gender: { enum: ['男', '女'] } },
  },
  calc_bazhai: {
    $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
    required: ['birthYear', 'gender', 'year'],
    properties: { birthYear: { type: 'integer', minimum: 1, maximum: 9999 }, gender: { enum: ['男', '女'] }, year: { type: 'integer', minimum: 1, maximum: 9999 }, door: { type: 'string' }, bedroom: { type: 'string' }, kitchen: { type: 'string' } },
  },
  combo_annual_fortune: {
    $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
    required: ['birth', 'baziTimeContext', 'targetYear', 'currentMonth'],
    properties: { birth: BIRTH_SCHEMA, baziTimeContext: { type: 'object' }, targetYear: { type: 'integer', minimum: 1, maximum: 9999 }, currentMonth: { type: 'integer', minimum: 1, maximum: 12 } },
  },
  combo_space_time: {
    $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
    required: ['birth', 'targetYear'],
    properties: { birth: BIRTH_SCHEMA, targetYear: { type: 'integer', minimum: 1, maximum: 9999 } },
  },
};
const CATEGORY: Record<LocalToolName, LocalToolCategory> = {
  resolve_true_solar_time: 'time-calibration',
  bazi_calculate: 'chart',
  ziwei_chart: 'chart',
  calc_feixing: 'fengshui',
  calc_bazhai: 'fengshui',
  cast_liuyao: 'divination',
  arrange_qimen: 'divination',
  liuren_calculate: 'divination',
  taiyi_calculate: 'divination',
  cast_meihua: 'divination',
  xingxiu_daily: 'daily',
  calc_yunqi: 'daily',
  calc_chenguz: 'daily',
  get_almanac: 'daily',
  get_daily_rhythm: 'daily',
  calc_xiyong: 'interpretation',
  dream_interpret: 'interpretation',
  analyze_name: 'name',
  cast_cezi: 'interpretation',
  huangji_calculate: 'chart',
  get_constitution_tendency: 'constitution',
  assess_constitution: 'constitution',
  list_constitution_questionnaire: 'constitution',
  combo_annual_fortune: 'combo',
  combo_monthly_fortune: 'combo',
  combo_daily_wellness: 'combo',
  combo_decision: 'combo',
  combo_space_time: 'combo',
  combo_sanshi: 'combo',
  combo_sanshi_classic: 'combo',
  combo_zeri: 'combo',
  combo_marriage: 'combo',
};

const VERIFIER: Record<LocalToolName, LocalClaimVerifierKind> = {
  resolve_true_solar_time: 'none',
  bazi_calculate: 'bazi',
  ziwei_chart: 'ziwei',
  calc_feixing: 'feixing',
  calc_bazhai: 'bazhai',
  cast_liuyao: 'divination',
  arrange_qimen: 'divination',
  liuren_calculate: 'divination',
  taiyi_calculate: 'divination',
  cast_meihua: 'divination',
  xingxiu_daily: 'calendar',
  calc_yunqi: 'calendar',
  calc_chenguz: 'daily',
  get_almanac: 'calendar',
  get_daily_rhythm: 'daily',
  calc_xiyong: 'daily',
  dream_interpret: 'daily',
  analyze_name: 'daily',
  cast_cezi: 'daily',
  huangji_calculate: 'divination',
  get_constitution_tendency: 'daily',
  assess_constitution: 'daily',
  list_constitution_questionnaire: 'none',
  combo_annual_fortune: 'combo',
  combo_monthly_fortune: 'combo',
  combo_daily_wellness: 'combo',
  combo_decision: 'none',
  combo_space_time: 'none',
  combo_sanshi: 'none',
  combo_sanshi_classic: 'none',
  combo_zeri: 'combo',
  combo_marriage: 'combo',
};

const CLAIM_KINDS: Partial<Record<LocalClaimVerifierKind, string[]>> = {
  bazi: ['pillar', 'dayMaster', 'elementCount', 'strength', 'luck', 'shenSha', 'transitTargetDate', 'transitNominalAge', 'transitDecadal', 'transitMinor', 'transitPillar', 'transitRelation'],
  ziwei: ['metadata', 'palace', 'star', 'transitMetadata', 'transitPalace', 'transitStar'],
  feixing: ['year', 'center', 'palace'],
  bazhai: ['mingGua', 'direction', 'taisui'],
  calendar: ['yunqiYear', 'yunqiWuyun', 'yunqiLiuqi', 'yunqiStep', 'xingxiu', 'almanac', 'almanacHour'],
  divination: ['hexagram', 'yao', 'trigram', 'basic', 'zhiFu', 'zhiShi', 'palace', 'sike', 'sanchuan', 'kook', 'position', 'calculation', 'ganZhi', 'lunarMonth', 'cycle', 'gua', 'movingLine'],
  daily: ['nameRating', 'nameDimension', 'xiyong', 'xiyongElements', 'constitutionTendencySource', 'constitutionTendency', 'dreamSearch', 'dreamEntry', 'cezi', 'ceziShuli', 'ceziStructure', 'ceziBaziComplement', 'chenguzBone', 'chenguzTotal', 'chenguzVersion', 'rhythm', 'rhythmMeridian', 'constitution', 'constitutionScore'],
  combo: ['annualContext', 'zeriPurpose', 'zeriRange', 'zeriRankedDay', 'zeriAnnualSha', 'zeriPersonalDirection', 'monthlyContext', 'monthlyMode', 'dailyContext', 'dailyConstitution', 'dailyMeridian', 'marriageContext', 'marriagePerson', 'marriageChongHe'],
  none: [],
};

const RISK_DOMAIN: Partial<Record<LocalToolName, LocalToolRiskDomain>> = {
  calc_yunqi: 'health',
  get_daily_rhythm: 'health',
  get_constitution_tendency: 'health',
  assess_constitution: 'health',
  list_constitution_questionnaire: 'health',
  combo_daily_wellness: 'health',
  calc_feixing: 'housing',
  calc_bazhai: 'housing',
  combo_space_time: 'housing',
  combo_zeri: 'housing',
  combo_marriage: 'relationship',
};

const GENERIC_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  description: '完整字段约束由本地 parseLocalToolInput() 执行；运行 success fixture 可查看标准输入。',
} as const;

export const LOCAL_TOOL_DESCRIPTORS = Object.fromEntries(LOCAL_TOOL_NAMES.map((name) => {
  const verifier = VERIFIER[name];
  const descriptor: LocalToolDescriptor = {
    name,
    category: CATEGORY[name],
    resultKind: name === 'resolve_true_solar_time' ? 'TrueSolarTimeResolution' : 'ToolEnvelope',
    successFixture: `src/__fixtures__/local-tools/${name}.success.json`,
    claimVerifier: verifier,
    claimKinds: [...(CLAIM_KINDS[verifier] ?? [])],
    riskDomain: RISK_DOMAIN[name] ?? 'general',
    limitations: [
      '结构化 claims 通过只表示与本次本地结果一致，不验证传统解释、建议、预测或现实效果。',
      ...(name === 'bazi_calculate' ? ['真太阳时必须提供完整、可重新计算的核验结果；否则明确使用民用时间降级。'] : []),
    ],
    inputSchemaVersion: '1.0.0',
    inputSchema: name === 'bazi_calculate' ? BAZI_INPUT_SCHEMA : EXPLICIT_TIME_SCHEMAS[name] ?? GENERIC_SCHEMA,
  };
  return [name, descriptor];
})) as Record<LocalToolName, LocalToolDescriptor>;

export function listLocalToolDescriptors(): LocalToolDescriptor[] {
  return LOCAL_TOOL_NAMES.map((name) => LOCAL_TOOL_DESCRIPTORS[name]);
}

export function describeLocalTool(name: LocalToolName): LocalToolDescriptor {
  return LOCAL_TOOL_DESCRIPTORS[name];
}
