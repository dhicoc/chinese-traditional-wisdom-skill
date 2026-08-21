import { routeQuery, type AgentRoute, type AgentRouteKind } from '../lib/agentRouter';
import type { ModuleId } from '../lib/modules';
import { describeLocalTool } from './localToolIntrospection';
import { LOCAL_TOOL_NAMES, type LocalToolName } from './localToolRegistry';

export type SuggestedPlanDepth = 'light' | 'standard' | 'deep';
export type PlannerRouteKind = AgentRouteKind | 'unrecognized';
export type PlannerExecutionPolicy = 'plan-only' | 'refer-first' | 'knowledge-only' | 'no-traditional-calculation';

export interface AgentParameterPlanInput {
  query: string;
  /** Privacy-safe presence hints only; values never enter the plan. */
  providedFields?: string[];
}

export interface PlannedMissingInput {
  field: string;
  reason: string;
}

export interface PlannedToolCandidate {
  tool: LocalToolName;
  source: 'primary' | 'supplementary' | 'alternative';
  reason: string;
  category: ReturnType<typeof describeLocalTool>['category'];
  resultKind: ReturnType<typeof describeLocalTool>['resultKind'];
  riskDomain: ReturnType<typeof describeLocalTool>['riskDomain'];
  claimVerifier: ReturnType<typeof describeLocalTool>['claimVerifier'];
  requiredInputKeys: string[];
  missingInputs: PlannedMissingInput[];
  inputReady: boolean;
  executionAllowed: boolean;
  successFixture: string;
}

export interface AgentParameterPlan {
  schemaVersion: '1.0.0';
  routeKind: PlannerRouteKind;
  routeTarget: { module: ModuleId | null; reason: string };
  executionPolicy: PlannerExecutionPolicy;
  suggestedDepth: SuggestedPlanDepth;
  candidates: PlannedToolCandidate[];
  recognizedInputs: string[];
  missingInputs: PlannedMissingInput[];
  riskNotices: string[];
  limitations: string[];
}

const MODULE_TOOL_MAP: Partial<Record<ModuleId, LocalToolName[]>> = {
  bazi: ['bazi_calculate'],
  ziwei: ['ziwei_chart'],
  liuyao: ['cast_liuyao'],
  meihua: ['cast_meihua'],
  qimen: ['arrange_qimen'],
  liuren: ['liuren_calculate'],
  xingxiu: ['xingxiu_daily'],
  taiyi: ['taiyi_calculate'],
  huangji: ['huangji_calculate'],
  feixing: ['calc_feixing'],
  bazhai: ['calc_bazhai'],
  yunqi: ['calc_yunqi'],
  almanac: ['get_almanac'],
  namewuxing: ['analyze_name'],
  dream: ['dream_interpret'],
  rhythm: ['get_daily_rhythm'],
  cezi: ['cast_cezi'],
  chenguz: ['calc_chenguz'],
};

const COMBO_TOOL_RULES: Array<{ pattern: RegExp; tool: LocalToolName; reason: string }> = [
  { pattern: /(合婚|两人|双方|伴侣|婚恋)/, tool: 'combo_marriage', reason: '双方关系场景需要联合输入。' },
  { pattern: /(择日|选日|开业|搬家|动土|嫁娶|签约|安葬|祈福)/, tool: 'combo_zeri', reason: '日期区间与用途适合择日联合分析。' },
  { pattern: /(三式|奇门.*六壬|六壬.*太乙)/, tool: 'combo_sanshi_classic', reason: '明确三式请求可规划传统三式联合分析。' },
  { pattern: /(空间|住宅|方位|风水)/, tool: 'combo_space_time', reason: '空间时间场景需要出生年与目标年份。' },
  { pattern: /(每日|今天|今日).*(调养|节律|养生)/, tool: 'combo_daily_wellness', reason: '日常调养场景需要显式当前日期时间。' },
  { pattern: /(月度|本月|流月)/, tool: 'combo_monthly_fortune', reason: '月度请求需要目标年与目标月。' },
  { pattern: /(年度|今年|明年|流年|事业|财运)/, tool: 'combo_annual_fortune', reason: '年度主题可使用年度联合分析。' },
  { pattern: /(决定|决策|要不要|该不该|选择)/, tool: 'combo_decision', reason: '明确决策问题可使用联合决策参考。' },
];

const EXPLICIT_TRADITIONAL_PATTERN = /(八字|四柱|紫微|六爻|梅花|奇门|六壬|太乙|皇极|黄历|择日|风水|八宅|飞星|五运六气|体质|气虚|阳虚|阴虚|痰湿|湿热|古籍|庄子|道德经|论语|孟子|佛经|称骨|测字|解梦|姓名学|传统文化)/;
const GENERAL_REAL_WORLD_PATTERN = /(看病|诊断|用药|停药|剂量|发烧|咳嗽|胃疼|头痛|律师|起诉|合同纠纷|报税|资产配置|投资组合|股票推荐|心理治疗|抑郁怎么办|焦虑症怎么办)/;
const TRUE_SOLAR_PATTERN = /(真太阳时|太阳时|校时|经度.*时区)/;
const BIRTH_INPUT_MODULES = new Set<ModuleId>(['bazi', 'ziwei', 'liuyao', 'meihua', 'qimen', 'liuren', 'xingxiu', 'taiyi', 'huangji', 'bazhai', 'combo', 'chenguz']);
const EXPLICIT_DATE = /\b(?:19|20)\d{2}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])\b/g;
const EXPLICIT_TARGET_YEAR = /(?:目标|查询|流年|年度|看|查)?\s*((?:19|20)\d{2})年(?!\s*出生)/;
const EXPLICIT_MONTH = /(?:目标|查询|流月|月份|月度|第)?\s*(1[0-2]|[1-9])月/;
const TIME_BASIS_PATTERN = /(民用时间已确认|civil-unverified|真太阳时已核验|true-solar-verified)/;

const REQUIRED_FIELD_REASONS: Record<string, string> = {
  birth: '需要完整出生年、月、日、小时与性别；缺失时不得猜填或默认子时。',
  timeBasis: '必须明确选择已确认民用时间或提供完整可复算的已核验真太阳时结果。',
  location: '需要已核验经度、IANA 时区、出生当日 UTC 偏移、夏令时与证据。',
  baziTimeContext: '必须明确八字时间基准；民用降级需用户确认，真太阳时需完整核验结果。',
  year: '必须提供明确公历年份；“今年/明年”不能由 CLI 隐式换算。',
  targetYear: '必须提供明确目标年份；不能隐式读取系统年份。',
  currentMonth: '必须提供明确当前月份（1-12）；不能由 CLI 隐式读取。',
  targetMonth: '必须提供明确目标月份（1-12）。',
  date: '必须提供 YYYY-MM-DD 日期；“今天/明天”需先解析为明确日期。',
  queryDate: '必须提供 YYYY-MM-DD 查询日期。',
  now: '必须提供明确的年、月、日、小时。',
  hour: '必须提供 0-23 的明确小时。',
  question: '需要一个清晰、单一且不包含敏感原文持久化的咨询问题。',
  keyword: '需要明确检索关键词。',
  surname: '需要姓氏；不应从昵称或账号猜测。',
  givenName: '需要名字；不应从昵称或账号猜测。',
  char: '需要一个明确的待测汉字。',
  answers: '需要用户主动完成的问卷回答；不得代填。',
  personA: '需要甲方已授权且完整的必要输入。',
  personB: '需要乙方已授权且完整的必要输入。',
  purpose: '需要明确用途。',
  startDate: '需要 YYYY-MM-DD 起始日期。',
  endDate: '需要 YYYY-MM-DD 结束日期。',
  birthYear: '需要明确出生年份。',
  gender: '需要用户明确提供性别字段。',
};

const ALLOWED_PROVIDED_FIELDS = new Set<string>([
  ...LOCAL_TOOL_NAMES.flatMap((name) => describeLocalTool(name).requiredInputKeys),
  'birth', 'birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.minute', 'birth.gender',
  'birthYear', 'gender', 'timeBasis', 'baziTimeContext', 'date', 'queryDate', 'year', 'targetYear',
  'currentMonth', 'targetMonth', 'now', 'hour', 'question', 'keyword', 'surname', 'givenName', 'char',
  'answers', 'personA', 'personB', 'purpose', 'startDate', 'endDate', 'location',
]);

function inputObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('planner 输入必须是 JSON 对象。');
  return value as Record<string, unknown>;
}

export function parseAgentParameterPlanInput(value: unknown): AgentParameterPlanInput {
  const input = inputObject(value);
  if (typeof input.query !== 'string' || !input.query.trim()) throw new TypeError('query 必须是非空字符串。');
  if (input.query.length > 500) throw new TypeError('query 最长 500 个字符。');
  if (input.providedFields !== undefined && !Array.isArray(input.providedFields)) throw new TypeError('providedFields 必须是字符串数组。');
  const providedFields = (input.providedFields ?? []) as unknown[];
  if (providedFields.length > 64 || providedFields.some((field) => typeof field !== 'string' || !ALLOWED_PROVIDED_FIELDS.has(field))) {
    throw new TypeError('providedFields 包含未知字段或超过 64 项。');
  }
  return { query: input.query.trim(), providedFields: [...new Set(providedFields as string[])].sort() };
}

function hasCompleteBirth(fields: Set<string>): boolean {
  return fields.has('birth') || ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'].every((field) => fields.has(field));
}

function recognizeInputs(query: string, route: AgentRoute | null, supplied: string[]): Set<string> {
  const fields = new Set(supplied);
  const birth = route?.birthPatch;
  if (birth && (BIRTH_INPUT_MODULES.has(route?.module ?? 'home') || TRUE_SOLAR_PATTERN.test(query))) {
    if (birth.year !== undefined) { fields.add('birth.year'); fields.add('birthYear'); }
    if (birth.month !== undefined) fields.add('birth.month');
    if (birth.day !== undefined) fields.add('birth.day');
    if (birth.hour !== undefined) fields.add('birth.hour');
    if (birth.minute !== undefined) fields.add('birth.minute');
    if (birth.gender !== undefined) { fields.add('birth.gender'); fields.add('gender'); }
  }
  if (hasCompleteBirth(fields)) fields.add('birth');
  if (route?.question?.trim()) fields.add('question');

  const dates = query.match(EXPLICIT_DATE) ?? [];
  if (dates.length > 0) { fields.add('date'); fields.add('queryDate'); }
  if (dates.length >= 2) { fields.add('startDate'); fields.add('endDate'); }
  if (EXPLICIT_TARGET_YEAR.test(query)) { fields.add('year'); fields.add('targetYear'); }
  if (EXPLICIT_MONTH.test(query)) { fields.add('currentMonth'); fields.add('targetMonth'); }
  if (TIME_BASIS_PATTERN.test(query)) { fields.add('timeBasis'); fields.add('baziTimeContext'); }
  if (route?.module === 'dream' && /(梦见|梦到|解梦)\s*\S+/.test(query)) fields.add('keyword');
  if (route?.module === 'cezi' && /(?:测字|拆字)\s*[“"']?([\u3400-\u9fff])/.test(query)) fields.add('char');
  if (route?.module === 'almanac' && dates.length > 0) fields.add('date');
  if (route?.module === 'rhythm' && /(?:[01]?\d|2[0-3])(?:点|时|:)/.test(query)) fields.add('hour');
  if (/(开业|结婚|嫁娶|搬家|动土|出行|签约|安葬|祈福)/.test(query)) fields.add('purpose');
  return fields;
}

function missingForTool(tool: LocalToolName, fields: Set<string>): PlannedMissingInput[] {
  const descriptor = describeLocalTool(tool);
  const missing: PlannedMissingInput[] = [];
  for (const key of descriptor.requiredInputKeys) {
    if (key === 'birth' && hasCompleteBirth(fields)) continue;
    if (fields.has(key)) continue;
    missing.push({ field: key, reason: REQUIRED_FIELD_REASONS[key] ?? `需要显式提供 ${key}。` });
  }
  return missing;
}

function toolsForModule(module: ModuleId, query: string, fields: Set<string>): Array<{ tool: LocalToolName; source: PlannedToolCandidate['source']; reason: string }> {
  if (module === 'combo') {
    const matches = COMBO_TOOL_RULES.filter(({ pattern }) => pattern.test(query));
    const selected = matches.length ? matches : [{ tool: 'combo_annual_fortune' as const, reason: '综合请求需先明确目标周期与输入。' }];
    return selected.slice(0, 3).map(({ tool, reason }, index) => ({ tool, source: index === 0 ? 'primary' : 'supplementary', reason }));
  }
  if (module === 'tizhi') {
    return fields.has('answers')
      ? [{ tool: 'assess_constitution', source: 'primary', reason: '已有问卷回答，可规划本地评分。' }]
      : [
        { tool: 'list_constitution_questionnaire', source: 'primary', reason: '先读取本地问卷，不代填回答。' },
        { tool: 'assess_constitution', source: 'supplementary', reason: '用户完成问卷后再规划评分。' },
      ];
  }
  const mapped = MODULE_TOOL_MAP[module] ?? [];
  return mapped.map((tool) => ({ tool, source: 'primary', reason: `模块“${module}”对应的本地工具。` }));
}

function planCandidate(
  item: { tool: LocalToolName; source: PlannedToolCandidate['source']; reason: string },
  fields: Set<string>,
  routeKind: PlannerRouteKind,
): PlannedToolCandidate {
  const descriptor = describeLocalTool(item.tool);
  const missingInputs = missingForTool(item.tool, fields);
  return {
    tool: item.tool,
    source: item.source,
    reason: item.reason,
    category: descriptor.category,
    resultKind: descriptor.resultKind,
    riskDomain: descriptor.riskDomain,
    claimVerifier: descriptor.claimVerifier,
    requiredInputKeys: [...descriptor.requiredInputKeys],
    missingInputs,
    inputReady: missingInputs.length === 0,
    executionAllowed: routeKind !== 'high-risk',
    successFixture: descriptor.successFixture,
  };
}

function uniqueMissing(candidates: PlannedToolCandidate[], route: AgentRoute | null): PlannedMissingInput[] {
  const byField = new Map<string, PlannedMissingInput>();
  const candidateNeedsBirth = candidates.some((candidate) => candidate.missingInputs.some((item) => item.field === 'birth'));
  for (const item of route?.missingInputs ?? []) {
    if (item.field === 'birth.confirmation' && candidateNeedsBirth) continue;
    byField.set(item.field, item);
  }
  for (const candidate of candidates) for (const item of candidate.missingInputs) if (!byField.has(item.field)) byField.set(item.field, item);
  return [...byField.values()].sort((left, right) => left.field.localeCompare(right.field));
}

function noTraditionalCalculationPlan(query: string): AgentParameterPlan | null {
  if (!GENERAL_REAL_WORLD_PATTERN.test(query) || EXPLICIT_TRADITIONAL_PATTERN.test(query)) return null;
  return {
    schemaVersion: '1.0.0',
    routeKind: 'unrecognized',
    routeTarget: { module: null, reason: '普通现实专业问题不自动转为传统文化计算。' },
    executionPolicy: 'no-traditional-calculation',
    suggestedDepth: 'light',
    candidates: [],
    recognizedInputs: [],
    missingInputs: [],
    riskNotices: ['请优先依据现实信息并咨询相应的医疗、法律、财务或心理专业人士；如需传统文化背景，请另行明确提出。'],
    limitations: ['参数规划器只做路由与缺失字段检查，不执行计算，也不生成现实建议。'],
  };
}

export function planAgentParameters(rawInput: AgentParameterPlanInput): AgentParameterPlan {
  const input = parseAgentParameterPlanInput(rawInput);
  const professionalBoundary = noTraditionalCalculationPlan(input.query);
  if (professionalBoundary) return professionalBoundary;

  const route = routeQuery(input.query);
  if (!route) {
    return {
      schemaVersion: '1.0.0', routeKind: 'unrecognized', routeTarget: { module: null, reason: '未识别到明确的传统文化知识或计算意图。' },
      executionPolicy: 'no-traditional-calculation', suggestedDepth: 'light', candidates: [],
      recognizedInputs: [...(input.providedFields ?? [])],
      missingInputs: [{ field: 'query.scope', reason: '请明确要查询的传统文化主题或本地计算类型。' }],
      riskNotices: [], limitations: ['参数规划器只做路由与缺失字段检查，不执行任何排盘、映射或数值计算。'],
    };
  }

  const trueSolarRequested = TRUE_SOLAR_PATTERN.test(input.query);
  const targetModule: ModuleId = trueSolarRequested ? 'bazi' : route.module;
  const fields = recognizeInputs(input.query, { ...route, module: targetModule }, input.providedFields ?? []);
  const routeKind = route.routeKind;
  const rawCandidates = toolsForModule(targetModule, input.query, fields);
  if (trueSolarRequested) {
    rawCandidates.unshift({ tool: 'resolve_true_solar_time', source: 'primary', reason: '真太阳时必须先完成外部证据核验和本地复算。' });
    for (let index = 1; index < rawCandidates.length; index++) rawCandidates[index].source = 'supplementary';
  }
  for (const alternative of trueSolarRequested ? [] : route.alternatives ?? []) {
    const tool = MODULE_TOOL_MAP[alternative.module]?.[0];
    if (tool) rawCandidates.push({ tool, source: 'alternative', reason: alternative.reason });
  }
  const deduped = [...new Map(rawCandidates.map((item) => [item.tool, item])).values()].slice(0, 4);
  const candidates = deduped.map((item) => planCandidate(item, fields, routeKind));
  const knowledgeOnly = routeKind === 'knowledge' && candidates.length === 0;
  const suggestedDepth: SuggestedPlanDepth = routeKind === 'high-risk' || knowledgeOnly
    ? 'light'
    : candidates.length > 1 || targetModule === 'combo'
      ? 'deep'
      : 'standard';
  const executionPolicy: PlannerExecutionPolicy = routeKind === 'high-risk' ? 'refer-first' : knowledgeOnly ? 'knowledge-only' : 'plan-only';

  return {
    schemaVersion: '1.0.0', routeKind, routeTarget: { module: targetModule, reason: trueSolarRequested ? '真太阳时核验 → 先校时，再选择八字时间基准' : route.reason }, executionPolicy, suggestedDepth,
    candidates, recognizedInputs: [...fields].sort(), missingInputs: uniqueMissing(candidates, route), riskNotices: [...route.riskNotices],
    limitations: [
      '参数规划器只做路由与缺失字段检查，不调用计算引擎，不生成盘面、干支、映射或数值事实。',
      'ready 仅表示必填字段名称齐全；实际值仍必须通过对应 parseLocalToolInput() 契约。',
      '日期、年份、随机种子、流派和降级规则不得由模型或 CLI 静默补全。',
    ],
  };
}
