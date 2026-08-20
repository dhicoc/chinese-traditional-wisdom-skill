export type LocalToolCategory = 'time-calibration' | 'chart' | 'fengshui' | 'divination' | 'daily' | 'interpretation' | 'name' | 'constitution' | 'combo';
export type LocalToolResultKind = 'ToolEnvelope' | 'TrueSolarTimeResolution';
export type LocalToolRiskDomain = 'general' | 'health' | 'finance' | 'relationship' | 'housing';
export type LocalClaimVerifierKind = 'bazi' | 'ziwei' | 'feixing' | 'bazhai' | 'calendar' | 'divination' | 'daily' | 'combo' | 'none';

export interface LocalToolDefinition {
  category: LocalToolCategory;
  resultKind: LocalToolResultKind;
  resultToolId: string;
  claimVerifier: LocalClaimVerifierKind;
  riskDomain: LocalToolRiskDomain;
  presenter: 'bazi' | 'none';
  requiredInputKeys: readonly string[];
}

export const LOCAL_TOOL_REGISTRY = {
  resolve_true_solar_time: { requiredInputKeys: ['birth', 'location'], category: 'time-calibration', resultKind: 'TrueSolarTimeResolution', resultToolId: 'TrueSolarTimeResolution', claimVerifier: 'none', riskDomain: 'general', presenter: 'none' },
  bazi_calculate: { requiredInputKeys: ['birth', 'timeBasis'], category: 'chart', resultKind: 'ToolEnvelope', resultToolId: 'BaziLunarAdapter', claimVerifier: 'bazi', riskDomain: 'general', presenter: 'bazi' },
  ziwei_chart: { requiredInputKeys: ['birth'], category: 'chart', resultKind: 'ToolEnvelope', resultToolId: 'ZiweiIztroAdapter', claimVerifier: 'ziwei', riskDomain: 'general', presenter: 'none' },
  calc_feixing: { requiredInputKeys: ['year'], category: 'fengshui', resultKind: 'ToolEnvelope', resultToolId: 'calc_feixing', claimVerifier: 'feixing', riskDomain: 'housing', presenter: 'none' },
  calc_bazhai: { requiredInputKeys: ['birthYear', 'gender', 'year'], category: 'fengshui', resultKind: 'ToolEnvelope', resultToolId: 'calc_bazhai', claimVerifier: 'bazhai', riskDomain: 'housing', presenter: 'none' },
  cast_liuyao: { requiredInputKeys: ['birth'], category: 'divination', resultKind: 'ToolEnvelope', resultToolId: 'LocalLiuyaoNajiaAdapter', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  arrange_qimen: { requiredInputKeys: ['birth'], category: 'divination', resultKind: 'ToolEnvelope', resultToolId: 'Qimen3metaAdapter', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  liuren_calculate: { requiredInputKeys: ['birth'], category: 'divination', resultKind: 'ToolEnvelope', resultToolId: 'DaliurenEngine', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  taiyi_calculate: { requiredInputKeys: ['birth'], category: 'divination', resultKind: 'ToolEnvelope', resultToolId: 'TaiyiEngine', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  cast_meihua: { requiredInputKeys: ['birth'], category: 'divination', resultKind: 'ToolEnvelope', resultToolId: 'LocalMeihuaTimeAdapter', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  xingxiu_daily: { requiredInputKeys: ['birth', 'queryDate'], category: 'daily', resultKind: 'ToolEnvelope', resultToolId: 'XingXiuEngine', claimVerifier: 'calendar', riskDomain: 'general', presenter: 'none' },
  calc_yunqi: { requiredInputKeys: ['year', 'currentMonth'], category: 'daily', resultKind: 'ToolEnvelope', resultToolId: 'YunqiEngine', claimVerifier: 'calendar', riskDomain: 'health', presenter: 'none' },
  calc_chenguz: { requiredInputKeys: ['birth', 'baziTimeContext'], category: 'daily', resultKind: 'ToolEnvelope', resultToolId: 'calc_chenguz', claimVerifier: 'daily', riskDomain: 'general', presenter: 'none' },
  get_almanac: { requiredInputKeys: ['date'], category: 'daily', resultKind: 'ToolEnvelope', resultToolId: 'get_almanac', claimVerifier: 'calendar', riskDomain: 'general', presenter: 'none' },
  get_daily_rhythm: { requiredInputKeys: ['date', 'hour'], category: 'daily', resultKind: 'ToolEnvelope', resultToolId: 'get_daily_rhythm', claimVerifier: 'daily', riskDomain: 'health', presenter: 'none' },
  calc_xiyong: { requiredInputKeys: ['dayMasterWuxing', 'elements'], category: 'interpretation', resultKind: 'ToolEnvelope', resultToolId: 'XiYongAdapter', claimVerifier: 'daily', riskDomain: 'general', presenter: 'none' },
  dream_interpret: { requiredInputKeys: ['keyword'], category: 'interpretation', resultKind: 'ToolEnvelope', resultToolId: 'DreamDictionaryAdapter', claimVerifier: 'daily', riskDomain: 'general', presenter: 'none' },
  analyze_name: { requiredInputKeys: ['surname', 'givenName'], category: 'name', resultKind: 'ToolEnvelope', resultToolId: 'NameRatingAdapter', claimVerifier: 'daily', riskDomain: 'general', presenter: 'none' },
  cast_cezi: { requiredInputKeys: ['char'], category: 'interpretation', resultKind: 'ToolEnvelope', resultToolId: 'cast_cezi', claimVerifier: 'daily', riskDomain: 'general', presenter: 'none' },
  huangji_calculate: { requiredInputKeys: ['birth'], category: 'chart', resultKind: 'ToolEnvelope', resultToolId: 'HuangjiEngine', claimVerifier: 'divination', riskDomain: 'general', presenter: 'none' },
  get_constitution_tendency: { requiredInputKeys: [], category: 'constitution', resultKind: 'ToolEnvelope', resultToolId: 'ConstitutionTendencyAdapter', claimVerifier: 'daily', riskDomain: 'health', presenter: 'none' },
  assess_constitution: { requiredInputKeys: ['answers'], category: 'constitution', resultKind: 'ToolEnvelope', resultToolId: 'assess_constitution', claimVerifier: 'daily', riskDomain: 'health', presenter: 'none' },
  list_constitution_questionnaire: { requiredInputKeys: [], category: 'constitution', resultKind: 'ToolEnvelope', resultToolId: 'list_constitution_questionnaire', claimVerifier: 'none', riskDomain: 'health', presenter: 'none' },
  combo_annual_fortune: { requiredInputKeys: ['birth', 'baziTimeContext', 'targetYear', 'currentMonth'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'AnnualFortuneComboEngine', claimVerifier: 'combo', riskDomain: 'general', presenter: 'none' },
  combo_monthly_fortune: { requiredInputKeys: ['birth', 'baziTimeContext', 'targetYear', 'targetMonth'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'MonthlyFortuneComboEngine', claimVerifier: 'combo', riskDomain: 'general', presenter: 'none' },
  combo_daily_wellness: { requiredInputKeys: ['birth', 'baziTimeContext', 'now'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'DailyWellnessComboEngine', claimVerifier: 'combo', riskDomain: 'health', presenter: 'none' },
  combo_decision: { requiredInputKeys: ['birth', 'question'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'DecisionComboEngine', claimVerifier: 'none', riskDomain: 'general', presenter: 'none' },
  combo_space_time: { requiredInputKeys: ['birth', 'targetYear'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'SpaceTimeComboEngine', claimVerifier: 'none', riskDomain: 'housing', presenter: 'none' },
  combo_sanshi: { requiredInputKeys: ['birth', 'question'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'SanshiComboEngine', claimVerifier: 'none', riskDomain: 'general', presenter: 'none' },
  combo_sanshi_classic: { requiredInputKeys: ['birth', 'question'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'SanshiClassicComboEngine', claimVerifier: 'none', riskDomain: 'general', presenter: 'none' },
  combo_zeri: { requiredInputKeys: ['birth', 'purpose', 'startDate', 'endDate'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'ZeriComboEngine', claimVerifier: 'combo', riskDomain: 'housing', presenter: 'none' },
  combo_marriage: { requiredInputKeys: ['personA', 'personB'], category: 'combo', resultKind: 'ToolEnvelope', resultToolId: 'combo_marriage', claimVerifier: 'combo', riskDomain: 'relationship', presenter: 'none' },
} as const satisfies Record<string, LocalToolDefinition>;

export type LocalToolName = keyof typeof LOCAL_TOOL_REGISTRY;
export const LOCAL_TOOL_NAMES = Object.keys(LOCAL_TOOL_REGISTRY) as LocalToolName[];

export function isLocalToolName(tool: string): tool is LocalToolName {
  return Object.prototype.hasOwnProperty.call(LOCAL_TOOL_REGISTRY, tool);
}

export function getLocalToolDefinition(tool: LocalToolName): LocalToolDefinition {
  return LOCAL_TOOL_REGISTRY[tool];
}
