import { z } from 'zod';

export interface ToolContract {
  title: string;
  annotations: {
    readOnlyHint: true;
    destructiveHint: false;
    idempotentHint: boolean;
    openWorldHint: false;
  };
}

const deterministicTools = new Set([
  'resolve_true_solar_time',
  'bazi_calculate',
  'ziwei_chart',
  'arrange_qimen',
  'liuren_calculate',
  'xingxiu_daily',
  'taiyi_calculate',
  'huangji_calculate',
  'cast_meihua',
  'calc_yunqi',
  'analyze_name',
  'calc_xiyong',
  'get_constitution_tendency',
  'dream_interpret',
  'combo_annual_fortune',
  'combo_space_time',
  'combo_sanshi',
  'combo_sanshi_classic',
  'combo_daily_wellness',
  'combo_zeri',
  'combo_monthly_fortune',
  'combo_marriage',
  'cast_cezi',
  'calc_chenguz',
  'get_almanac',
  'calc_feixing',
  'calc_bazhai',
  'get_daily_rhythm',
  'assess_constitution',
  'list_constitution_questionnaire',
  'validate_bazi_presentation',
  'validate_ziwei_presentation',
  'validate_bazhai_presentation',
  'validate_feixing_presentation',
  'validate_calendar_presentation',
  'validate_divination_presentation',
  'validate_numeric_assertions',
]);

const toolTitles: Record<string, string> = {
  resolve_true_solar_time: '真太阳时校准',
  bazi_calculate: '八字排盘',
  ziwei_chart: '紫微斗数排盘',
  cast_liuyao: '六爻起卦',
  arrange_qimen: '奇门遁甲排盘',
  liuren_calculate: '大六壬排盘',
  xingxiu_daily: '二十八星宿日值',
  taiyi_calculate: '太乙神数排盘',
  huangji_calculate: '皇极经世排盘',
  cast_meihua: '梅花易数起卦',
  calc_yunqi: '五运六气推算',
  analyze_name: '姓名五维分析',
  calc_xiyong: '喜用神推算',
  get_constitution_tendency: '五运六气体质倾向',
  dream_interpret: '周公解梦查询',
  combo_annual_fortune: '年度综合运势',
  combo_decision: '事件决策联合分析',
  combo_space_time: '时空方位联合分析',
  combo_sanshi: '三式互参分析',
  combo_sanshi_classic: '传统三式合一分析',
  combo_daily_wellness: '今日养生建议',
  combo_zeri: '综合择日',
  combo_monthly_fortune: '月度运势切片',
  combo_marriage: '合婚与配对分析',
  cast_cezi: '测字字占',
  calc_chenguz: '袁天罡称骨',
  get_almanac: '每日黄历',
  calc_feixing: '流年飞星',
  calc_bazhai: '八宅大游年',
  get_daily_rhythm: '每日节律',
  assess_constitution: '中医体质自评',
  list_constitution_questionnaire: '体质问卷题目',
  validate_bazi_presentation: '八字呈现依据校验',
  validate_ziwei_presentation: '紫微呈现依据校验',
  validate_bazhai_presentation: '八宅呈现依据校验',
  validate_feixing_presentation: '流年飞星呈现依据校验',
  validate_calendar_presentation: '历法与年度盘面呈现依据校验',
  validate_divination_presentation: '占测／卦象呈现依据校验',
  validate_numeric_assertions: '数值断言依据校验',
  agent_guidance: '工具参数引导',
  wisdom_dispatch: '自然语言意图路由',
};

export function getToolContract(name: string): ToolContract {
  const title = toolTitles[name];
  if (!title) throw new Error(`工具 ${name} 缺少 MCP 契约元信息。`);
  return {
    title,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: deterministicTools.has(name),
      openWorldHint: false,
    },
  };
}

export const toolEnvelopeOutputSchema = z.object({
  ok: z.boolean(),
  tool: z.string(),
  version: z.string(),
  input_normalized: z.record(z.unknown()),
  data: z.unknown(),
  summary: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  evidence: z.unknown().optional(),
  result_meta: z.unknown().optional(),
}).passthrough();

export const trueSolarOutputSchema = z.object({
  status: z.string(),
  source: z.string(),
  trueSolarBirth: z.record(z.unknown()),
  calibrationToken: z.string().uuid(),
}).passthrough();

export const openObjectOutputSchema = z.object({}).passthrough();
