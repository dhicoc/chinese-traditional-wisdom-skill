import { LOCAL_TOOL_NAMES, LOCAL_TOOL_REGISTRY, type LocalClaimVerifierKind, type LocalToolDefinition, type LocalToolName } from './localToolRegistry';

export interface LocalToolDescriptor extends LocalToolDefinition {
  name: LocalToolName;
  successFixture: string;
  claimKinds: string[];
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

const GENERIC_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  description: '完整字段约束由本地 parseLocalToolInput() 执行；运行 success fixture 可查看标准输入。',
} as const;

export const LOCAL_TOOL_DESCRIPTORS = Object.fromEntries(LOCAL_TOOL_NAMES.map((name) => {
  const definition = LOCAL_TOOL_REGISTRY[name];
  const descriptor: LocalToolDescriptor = {
    name,
    ...definition,
    successFixture: `src/__fixtures__/local-tools/${name}.success.json`,
    claimKinds: [...(CLAIM_KINDS[definition.claimVerifier] ?? [])],
    limitations: [
      '结构化 claims 通过只表示与本次本地结果一致，不验证传统解释、建议、预测或现实效果。',
      ...(name === 'bazi_calculate' ? ['真太阳时必须提供完整、可重新计算的核验结果；否则明确使用民用时间降级。'] : []),
    ],
    inputSchemaVersion: '1.0.0',
    inputSchema: name === 'bazi_calculate' ? BAZI_INPUT_SCHEMA : EXPLICIT_TIME_SCHEMAS[name] ?? { ...GENERIC_SCHEMA, required: [...definition.requiredInputKeys] },
  };
  return [name, descriptor];
})) as Record<LocalToolName, LocalToolDescriptor>;

export function listLocalToolDescriptors(): LocalToolDescriptor[] {
  return LOCAL_TOOL_NAMES.map((name) => LOCAL_TOOL_DESCRIPTORS[name]);
}

export function describeLocalTool(name: LocalToolName): LocalToolDescriptor {
  return LOCAL_TOOL_DESCRIPTORS[name];
}
