/**
 * guidance.ts — 参数引导 + 意图路由（借鉴 horosa agent_guidance + dispatch）
 *
 * 两个能力：
 * 1. getToolGuidance(toolName) — 返回某工具的必要参数清单 + 缺参时的追问文本（prompt_to_user）。
 *    供 AI 在调计算工具前先确认参数，避免瞎猜。
 * 2. dispatchIntent(text) — 自然语言意图路由：从用户文本提取关键词，匹配对应工具 + 自动填充参数。
 *
 * 设计原则（与 horosa 的差异）：
 * - horosa 是硬闸门（未带 agent_confirmed_settings 直接拒绝计算）。
 * - 本项目先用**软引导**：缺参时返回 prompt_to_user 让 AI 追问用户，而非拒绝。
 *   计算工具仍可直接调用（保持灵活），但 AI 被引导先确认参数。
 *   这更友好，且不破坏现有 tools/call 行为。硬闸门可后续在 tools.ts handler 包一层加。
 *
 * 借鉴 horosa 字段设计思想（AGPL 仅思想不复制代码）。
 */

export interface ParamRequirement {
  /** 参数名（对应工具 inputSchema 的字段） */
  name: string;
  /** 是否必填 */
  required: boolean;
  /** 人话描述 */
  description: string;
  /** 缺失时的追问文本（直接转发给用户） */
  promptToUser: string;
}

export interface ToolGuidance {
  tool: string;
  /** 工具用途（人话） */
  purpose: string;
  /** 必要参数清单 */
  requiredParams: ParamRequirement[];
  /** 安全默认值（AI 在用户明确接受默认时可填） */
  safeDefaults: Record<string, unknown>;
  /** 不要瞎猜的参数（必须问用户） */
  doNotAssume: string[];
  /** 默认工作流提示 */
  workflow: string;
}

// ─── 全局 Agent 规则 ───

export const GLOBAL_AGENT_RULES = [
  '不得替用户编造生辰、性别、出生地等关键参数；缺失时必须追问。',
  '排盘结果为传统文化参考，不作绝对预测或医疗诊断依据。',
  '性别影响八字大运顺逆与紫微大限起向，必须明确，不得默认男。',
  '时辰精确到时（0-23）；若用户只给"上午/下午"，须追问具体时辰或时支。',
];

// ─── 各工具的参数引导 ───

const BIRTH_PARAMS: ParamRequirement[] = [
  { name: 'birth.year', required: true, description: '公历年', promptToUser: '请提供出生年份（公历，如 1990）。' },
  { name: 'birth.month', required: true, description: '公历月', promptToUser: '请提供出生月份（公历，1-12）。' },
  { name: 'birth.day', required: true, description: '公历日', promptToUser: '请提供出生日期（公历，1-31）。' },
  { name: 'birth.hour', required: true, description: '公历时（0-23）', promptToUser: '请提供出生时辰（24小时制，如 12 表示中午，23 表示子时）。若不确定，请告知时支（子/丑/寅…）。' },
  { name: 'birth.gender', required: true, description: '性别（男/女）', promptToUser: '请提供性别（男/女）。性别影响大运顺逆，不可默认。' },
];

export const TOOL_GUIDANCE: Record<string, ToolGuidance> = {
  bazi_calculate: {
    tool: 'bazi_calculate',
    purpose: '八字排盘：四柱、日主、五行、十神、大运。需完整生辰。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认完整生辰（年月日时+性别）→ 调 bazi_calculate → 如需喜用神再调 calc_xiyong（用返回的 dayMasterWuxing + elements）。',
  },
  ziwei_chart: {
    tool: 'ziwei_chart',
    purpose: '紫微斗数排盘：十二宫、主星、四化。需完整生辰。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认完整生辰 → 调 ziwei_chart → 解读命宫主星与四化。',
  },
  cast_liuyao: {
    tool: 'cast_liuyao',
    purpose: '六爻起卦：需起卦方式 + 求测事项（用于用神选取）。',
    requiredParams: [
      { name: 'method', required: true, description: '起卦方式（coin/time/manual）', promptToUser: '请选择起卦方式：铜钱法(coin)、时间起卦(time)、或手动爻值(manual，需提供6位6-9数字)。' },
      { name: 'question', required: true, description: '求测事项', promptToUser: '请说明想测什么事（如"今年财运""能否升职"），用于自动选取用神。' },
      ...BIRTH_PARAMS.filter((p) => p.name !== 'birth.gender'),
    ],
    safeDefaults: { method: 'coin', birth: { gender: '男', minute: 0 } },
    doNotAssume: ['question', 'birth.year', 'birth.month', 'birth.day', 'birth.hour'],
    workflow: '先确认求测事项 + 起卦方式 → 调 cast_liuyao → 看用神旺衰与动爻断吉凶。',
  },
  arrange_qimen: {
    tool: 'arrange_qimen',
    purpose: '奇门遁甲排盘：需测当时的年月日时（起局时间）。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0, gender: '男' } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour'],
    workflow: '先确认起局时间（测事的当前时间或指定时间）→ 调 arrange_qimen → 看值符值使与格局断吉凶。',
  },
  liuren_calculate: {
    tool: 'liuren_calculate',
    purpose: '大六壬排盘：需测当时的年月日时（占时）。传统三式之一，擅长事件细节与应期。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0, gender: '男' } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour'],
    workflow: '先确认占时（测事的当前时间或指定时间）→ 调 liuren_calculate → 看三传四课与格局断吉凶。',
  },
  xingxiu_daily: {
    tool: 'xingxiu_daily',
    purpose: '二十八星宿每日值宿查询：需日期。返回值宿、禽星、四象、吉凶宜忌。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0, gender: '男' } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day'],
    workflow: '确认日期 → 调 xingxiu_daily → 看当日值宿吉凶宜忌。',
  },
  cast_meihua: {
    tool: 'cast_meihua',
    purpose: '梅花易数：时间起卦需生辰，数字起卦需两个数字。',
    requiredParams: [
      { name: 'method', required: true, description: '起卦方式（time/number）', promptToUser: '请选择起卦方式：时间起卦(time，需生辰) 或 数字起卦(number，需两个数字)。' },
      ...BIRTH_PARAMS.filter((p) => p.name !== 'birth.gender'),
    ],
    safeDefaults: { method: 'time', birth: { gender: '男', minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour'],
    workflow: '确认起卦方式与参数 → 调 cast_meihua → 看体用生克与吉凶分级。',
  },
  calc_yunqi: {
    tool: 'calc_yunqi',
    purpose: '五运六气：需年份（生辰年或欲测年份）。',
    requiredParams: [
      { name: 'year', required: true, description: '公历年', promptToUser: '请提供年份（公历，如 2024）。' },
    ],
    safeDefaults: { currentMonth: new Date().getMonth() + 1 },
    doNotAssume: ['year'],
    workflow: '确认年份 → 调 calc_yunqi → 可联动 get_constitution_tendency 看体质倾向。',
  },
  analyze_name: {
    tool: 'analyze_name',
    purpose: '姓名评分：需姓 + 名，出生年可选（影响生肖契合度）。',
    requiredParams: [
      { name: 'surname', required: true, description: '姓氏', promptToUser: '请提供姓氏（如"张"）。' },
      { name: 'givenName', required: true, description: '名', promptToUser: '请提供名（如"伟"）。' },
    ],
    safeDefaults: {},
    doNotAssume: ['surname', 'givenName'],
    workflow: '确认姓与名 → 调 analyze_name（如有出生年一并传入提升生肖契合度）→ 看五维评分与等级。',
  },
  calc_xiyong: {
    tool: 'calc_xiyong',
    purpose: '喜用神：需日主五行 + 五行计数（通常来自 bazi_calculate 结果）。',
    requiredParams: [
      { name: 'dayMasterWuxing', required: true, description: '日主五行（木/火/土/金/水）', promptToUser: '需先有八字结果。请先调 bazi_calculate 取得 dayMasterWuxing 与 elements。' },
      { name: 'elements', required: true, description: '五行计数 {木,火,土,金,水}', promptToUser: '需先有八字结果。请先调 bazi_calculate 取得 elements。' },
    ],
    safeDefaults: {},
    doNotAssume: ['dayMasterWuxing', 'elements'],
    workflow: '先调 bazi_calculate → 用其 dayMasterWuxing + elements 调 calc_xiyong。',
  },
  get_constitution_tendency: {
    tool: 'get_constitution_tendency',
    purpose: '体质倾向：需五运六气结果（dayun/sitian/zaquan，来自 calc_yunqi）。',
    requiredParams: [
      { name: 'wuyun.dayun', required: true, description: '岁运', promptToUser: '需先有五运六气结果。请先调 calc_yunqi 取得 wuyun.dayun。' },
      { name: 'liuqi.sitian', required: true, description: '司天', promptToUser: '需先有五运六气结果。请先调 calc_yunqi 取得 liuqi.sitian。' },
    ],
    safeDefaults: {},
    doNotAssume: ['wuyun.dayun', 'liuqi.sitian'],
    workflow: '先调 calc_yunqi → 用其 wuyun + liuqi 调 get_constitution_tendency。',
  },
  dream_interpret: {
    tool: 'dream_interpret',
    purpose: '周公解梦：需梦象关键词。',
    requiredParams: [
      { name: 'keyword', required: true, description: '梦象关键词', promptToUser: '请描述梦见的事物（如"蛇""水""棺材""结婚"）。' },
    ],
    safeDefaults: { useFull: false },
    doNotAssume: ['keyword'],
    workflow: '确认梦象关键词 → 调 dream_interpret → 看现代解读与古文断语。',
  },
  // ─── 跨系统联合分析 ───
  combo_annual_fortune: {
    tool: 'combo_annual_fortune',
    purpose: '年度综合运势：八字+五运六气+奇门+命卦方位 联合推算某年运势。需完整生辰 + 欲测年份。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认生辰 + 欲测年份 → 调 combo_annual_fortune → 看三系统一致性 + 方位建议。',
  },
  combo_decision: {
    tool: 'combo_decision',
    purpose: '事件决策：六爻+梅花+奇门 三卜交叉验证。需完整生辰 + 求测事项。',
    requiredParams: [
      { name: 'question', required: true, description: '求测事项', promptToUser: '请说明想测什么事（如"今年适合换工作吗""投资能否获利"）。' },
      ...BIRTH_PARAMS,
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['question', 'birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认生辰 + 求测事项 → 调 combo_decision → 看三卜一致性，以六爻为主断吉凶。',
  },
  combo_space_time: {
    tool: 'combo_space_time',
    purpose: '空间+时间：飞星+八宅命卦+奇门吉方 联合推算某年布局方位。需完整生辰 + 欲测年份。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认生辰 + 欲测年份 → 调 combo_space_time → 看主卧/财位/凶位布局建议。',
  },
  combo_sanshi: {
    tool: 'combo_sanshi',
    purpose: '三式互参：大六壬+奇门+梅花 传统三式交叉验证。需完整生辰 + 求测事项。',
    requiredParams: [
      { name: 'question', required: true, description: '求测事项', promptToUser: '请说明想测什么事（如"某事能否成功""何时有成"）。' },
      ...BIRTH_PARAMS,
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['question', 'birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认生辰 + 求测事项 → 调 combo_sanshi → 看三式一致性，以大六壬三传为主断事态。',
  },
};

/** 取某工具的参数引导。未注册工具返回 null。 */
export function getToolGuidance(toolName: string): ToolGuidance | null {
  return TOOL_GUIDANCE[toolName] ?? null;
}

/** 列出所有工具的引导摘要 */
export function listToolGuidance(): Array<{ tool: string; purpose: string; requiredParams: string[] }> {
  return Object.values(TOOL_GUIDANCE).map((g) => ({
    tool: g.tool,
    purpose: g.purpose,
    requiredParams: g.requiredParams.filter((p) => p.required).map((p) => p.name),
  }));
}

/**
 * 校验输入是否满足工具的必填参数。返回缺失参数的追问文本列表（空表示齐全）。
 */
export function validateToolInput(toolName: string, input: Record<string, unknown>): { missing: ParamRequirement[]; prompts: string[] } {
  const guidance = TOOL_GUIDANCE[toolName];
  if (!guidance) return { missing: [], prompts: [] };
  const missing: ParamRequirement[] = [];
  for (const p of guidance.requiredParams) {
    if (!p.required) continue;
    if (!hasParam(input, p.name)) missing.push(p);
  }
  return { missing, prompts: missing.map((p) => p.promptToUser) };
}

/** 按点分路径检查参数是否存在（如 birth.year） */
function hasParam(input: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let cur: unknown = input;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur !== undefined && cur !== null && cur !== '';
}
