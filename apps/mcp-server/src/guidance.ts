/**
 * guidance.ts — 参数引导 + 意图路由（借鉴 horosa agent_guidance + dispatch）
 *
 * 两个能力：
 * 1. getToolGuidance(toolName) — 返回某工具的必要参数清单 + 缺参时的追问文本（prompt_to_user）。
 *    供 AI 在调计算工具前先确认参数，避免瞎猜。
 * 2. dispatchIntent(text) — 自然语言意图路由：从用户文本提取关键词，匹配对应工具 + 自动填充参数。
 *
 * 设计原则：
 * - 计算工具的 schema 与本文件共同构成 Agent/MCP 硬闸门：缺少必要输入时不得执行 handler。
 * - schema 必填字段由 MCP SDK 在 handler 前拒绝；跨字段前置条件和 schema 可选字段由入口层返回 validation_error。
 * - Agent 必须先通过本文件追问缺失事实，再调用工具；不得用模型记忆补齐或自行推演结果。
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
  '任何确定性计算、规则匹配、干支/卦象/星曜/五行/吉凶结论都必须调用对应 MCP 工具；不得依据模型知识、记忆或参考资料自行推演、补全或改写结果。',
  'Agent 仅可理解意图、追问参数、核验外部事实，并将 MCP ToolEnvelope 转成用户可读说明；reference 文件只可提供文化背景，不能替代计算结果。',
  '呈现 ToolEnvelope 时，先处理 ok/error；如实说明 data.timeSource 与 warnings；正文优先采用 data.export_snapshot.summary 和 sections。不得默认展示 evidence、result_meta、sourceNotes，也不得重新计算、补全或改写确定性结论。',
  '每段包含确定性结论的用户说明都必须保留最小调用轨迹：本次 ToolEnvelope 的 tool 与 version；若该结论需呈现校验，须注明对应 validator 已返回 valid:true。不得向用户暴露 presentationToken、evidence 或内部 result_meta。',
  '数值事实若不属于专用呈现校验器覆盖字段，必须以本次 result_meta.numericAssertionToken 调 validate_numeric_assertions；claims 仅可引用 data.* 下的有限数值。valid:true 仅表示这些结构化 claims 已核验，不得声称整段自由文本已自动校验。',
  '八字解读若写入四柱、日主、五行计数、日主强弱、大运或神煞等确定性结论，必须以本次 result_meta.presentationToken 调 validate_bazi_presentation；每条结论逐项放入 claims，校验失败不得呈现为本次排盘结果。文化背景和建设性建议不进入 claims。',
  '紫微解读若写入宫位、星曜、四化、五行局、命主、身主或本次动态层等确定性结论，必须以本次 ziwei_chart 的 result_meta.presentationToken 调 validate_ziwei_presentation；每条结论逐项放入 claims，校验失败不得呈现为本次命盘结果。传统解释、条件性推论和建议不进入 claims。',
  '八宅解读若写入命卦、东四/西四命、八方游年星与吉凶、或本次年份的太岁、岁破、三煞、五黄方位等确定性结论，必须以本次 calc_bazhai 的 result_meta.presentationToken 调 validate_bazhai_presentation；每条结论逐项放入 claims，校验失败不得呈现为本次推算结果。传统释义、布局建议、门主灶与化解建议不进入 claims。',
  '流年飞星解读若写入本次年份、元运、中宫飞星或指定九宫的飞星与吉凶等确定性结论，必须以本次 calc_feixing 的 result_meta.presentationToken 调 validate_feixing_presentation；每条结论逐项放入 claims，校验失败不得呈现为本次盘面结果。化解、布局、财位与个人命卦解释不进入 claims。',
  '五运六气如呈现年度、干支、岁运、司天、在泉或客气步骤，必须以本次 calc_yunqi 的 result_meta.presentationToken 调 validate_calendar_presentation；二十八星宿和黄历仅在显式传入 queryDate 或 date 后才可取得该凭证并校验基础历法字段。宜忌、疾病/养生建议、歌诀与传统解释不进入 claims。',
  '六爻、梅花、奇门、大六壬、太乙与皇极如呈现卦名、动爻、局式、宫位、干支、三传或周期等基础盘面事实，必须以本次 result_meta.presentationToken 调 validate_divination_presentation；吉凶、应期、策略、传统解释与行动建议不进入 claims。',
  '综合择日如呈现用途、搜索范围、已排序候选日期的日期/农历日期/干支/分数/标签/冲命主与犯年煞状态、本年凶方或命卦吉方条目，必须以本次 combo_zeri 的 result_meta.presentationToken 调 validate_combo_presentation；评分理由、淘汰理由、黄历全文、首选结论、吉时、行动建议与任何吉凶保证不进入 claims。',
  '不得替用户编造生辰、性别、出生地等关键参数；缺失时必须追问。',
  '真太阳时必须先核验地点经度、IANA 时区、出生时实际 UTC 偏移与夏令时依据；不得凭模型记忆填写或把民用时间伪称真太阳时。',
  '涉及八字的组合或增强分析也必须传入经核验的 baziTimeContext；民用时间路径须明确确认，并标注“未完成真太阳时复核”。',
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
  resolve_true_solar_time: {
    tool: 'resolve_true_solar_time',
    purpose: '真太阳时校准：对已核验的地点经度与历史时区资料进行确定性校正，仅供八字预处理。',
    requiredParams: [
      ...BIRTH_PARAMS,
      { name: 'location.displayName', required: true, description: '经核验的出生地点', promptToUser: '请提供可定位的出生城市/区县和国家或地区，不能只写“中国”或“美国”。' },
      { name: 'location.longitude', required: true, description: '经核验的出生地经度', promptToUser: '需要先核验出生地点对应的经度，不能由模型凭记忆估算。' },
      { name: 'location.ianaTimeZone', required: true, description: '经核验的 IANA 时区', promptToUser: '需要核验出生地点对应的 IANA 时区，例如 Asia/Shanghai。' },
      { name: 'location.utcOffsetMinutes', required: true, description: '出生当时实际 UTC 偏移，含夏令时', promptToUser: '需要核验出生当日当地实际 UTC 偏移和夏令时状态，不能按当前时区或模型记忆猜测。' },
      { name: 'location.utcOffsetEvidence', required: true, description: '历史时区与夏令时的核验依据', promptToUser: '请先取得可追溯的历史时区/夏令时核验依据；无法核验时必须降级为民用时间排盘。' },
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['location.displayName', 'location.longitude', 'location.ianaTimeZone', 'location.utcOffsetMinutes', 'location.utcOffsetEvidence'],
    workflow: '先收集完整民用生辰与可定位出生地 → Agent 核验经度、IANA 时区、历史 UTC 偏移和夏令时依据 → 调 resolve_true_solar_time → 仅将 trueSolarBirth 传给 bazi_calculate；无法核验时明确按民用时间排盘，禁止伪称真太阳时。',
  },
  bazi_calculate: {
    tool: 'bazi_calculate',
    purpose: '八字排盘：四柱、日主、五行、十神、大运。必须声明已核验真太阳时或用户确认的民用时间降级。',
    requiredParams: [
      ...BIRTH_PARAMS,
      { name: 'timeBasis', required: true, description: '排盘时间来源', promptToUser: '请选择时间来源：完成真太阳时核验后用 true-solar-verified；若您明确接受按民用出生记录排盘，则用 civil-unverified 并确认未完成真太阳时复核。' },
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender', 'timeBasis', 'calibrationToken', 'civilFallbackConfirmed'],
    workflow: '默认先调 resolve_true_solar_time；以返回的 trueSolarBirth 和当前 MCP 进程签发的 calibrationToken 调 bazi_calculate(timeBasis=true-solar-verified)。无法核验时，须由用户明确同意后才传 timeBasis=civil-unverified 与 civilFallbackConfirmed=true，结果强制标注“未完成真太阳时复核”。如需喜用神再调 calc_xiyong（用返回的 dayMasterWuxing + elements）。',
  },
  ziwei_chart: {
    tool: 'ziwei_chart',
    purpose: '紫微斗数排盘：十二宫、主星、四化。需完整生辰。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认完整生辰 → 调 ziwei_chart → 从本次 ToolEnvelope 提取宫位、星曜、四化等确定性事实组成 claims → 用 presentationToken 调 validate_ziwei_presentation；valid:true 后才呈现。传统解释与建议不进入 claims。',
  },
  cast_liuyao: {
    tool: 'cast_liuyao',
    purpose: '六爻起卦：需起卦方式 + 求测事项（用于用神选取）。',
    requiredParams: [
      { name: 'method', required: true, description: '起卦方式（coin/time/manual）', promptToUser: '请选择起卦方式：铜钱法(coin)、时间起卦(time)、或手动爻值(manual，需提供6位6-9数字)。' },
      { name: 'question', required: true, description: '求测事项', promptToUser: '请说明想测什么事（如"今年财运""能否升职"），用于自动选取用神。' },
      ...BIRTH_PARAMS.filter((p) => p.name !== 'birth.gender'),
    ],
    safeDefaults: { method: 'coin', birth: { minute: 0 } },
    doNotAssume: ['question', 'birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认求测事项 + 起卦方式 → 调 cast_liuyao → 呈现卦名、变卦、世应、动爻或干支前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。用神旺衰、吉凶与应期解释不进入 claims。'
  },
  arrange_qimen: {
    tool: 'arrange_qimen',
    purpose: '奇门遁甲排盘：需测当时的年月日时（起局时间）。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认起局时间（测事的当前时间或指定时间）→ 调 arrange_qimen → 呈现遁局、值符值使、宫位或干支前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。格局吉凶与策略解释不进入 claims。',
  },
  liuren_calculate: {
    tool: 'liuren_calculate',
    purpose: '大六壬排盘：需测当时的年月日时（占时）。传统三式之一，擅长事件细节与应期。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认占时（测事的当前时间或指定时间）→ 调 liuren_calculate → 呈现节气、月将、四课或三传前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。格局吉凶、应期与事件解释不进入 claims。',
  },
  xingxiu_daily: {
    tool: 'xingxiu_daily',
    purpose: '二十八星宿每日值宿查询：返回值宿、禽星与四象等基础字段；不传 queryDate 时仅查询系统当天。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.gender', 'queryDate'],
    workflow: '如需把值宿、禽星、四象、五行、七曜或禽星呈现为本次确定性事实，必须确认并显式传 queryDate → 调 xingxiu_daily → 用本次 presentationToken 调 validate_calendar_presentation；valid:true 后才呈现。未传 queryDate 的系统当天结果不签发凭证；吉凶宜忌、歌诀与传统解释不进入 claims。',
  },
  taiyi_calculate: {
    tool: 'taiyi_calculate',
    purpose: '太乙神数排盘：需测当时的年月日时（占时）。传统三式之首，擅推事件吉凶、应期与主客胜负。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 }, jiStyle: '0', acumYear: '0' },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '先确认占时（测事的当前时间或指定时间）→ 调 taiyi_calculate → 呈现干支、局式、太乙/文昌/始击落宫或主客算前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。格局断语、主客胜负、吉凶与应期不进入 claims。',
  },
  huangji_calculate: {
    tool: 'huangji_calculate',
    purpose: '皇极经世排盘：邵雍元会运世宇宙周期 + 九卦配置。长期/宏观预测视角（一运360年、一世30年）。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认占时（年月日时）→ 调 huangji_calculate → 呈现干支、会运世周期、九卦或动爻前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。主运大势、三十年气数与本年应象等解释不进入 claims。',
  },
  combo_sanshi_classic: {
    tool: 'combo_sanshi_classic',
    purpose: '三式合一：奇门+太乙+大六壬 真正传统三式交叉验证。需完整生辰 + 求测事项。',
    requiredParams: [
      ...BIRTH_PARAMS,
      { name: 'question', required: true, description: '求测事项', promptToUser: '请描述要测算的具体事项（如：今年适合换工作吗）。' },
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender', 'question'],
    workflow: '确认生辰 + 求测事项 → 调 combo_sanshi_classic → 看三式一致性，以大六壬三传为主、太乙格局次之、奇门方位为辅。',
  },
  combo_daily_wellness: {
    tool: 'combo_daily_wellness',
    purpose: '今日养生建议：体质+24节气+子午流注时辰+太岁/飞星方位。体质优先问卷结果，否则按五运六气倾向推断。',
    requiredParams: [
      ...BIRTH_PARAMS,
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认生辰 → （可选）问用户体质问卷结果（气虚质等），有则传 constitution；不传按五运六气倾向推断 → 调 combo_daily_wellness → 看节气饮食/起居/运动/穴位 + 体质针对性加减 + 当令时辰养生 + 方位借力。',
  },
  combo_zeri: {
    tool: 'combo_zeri',
    purpose: '综合择日：黄历宜忌+神煞+太岁三煞+命卦吉方 联合筛选指定用途吉日。需生辰 + 用途 + 日期区间。',
    requiredParams: [
      ...BIRTH_PARAMS,
      { name: 'purpose', required: true, description: '择日用途', promptToUser: '请说明择日用途：开业/结婚/搬家/动土/出行/签约/安葬/祈福。' },
      { name: 'startDate', required: true, description: '区间起（yyyy-mm-dd）', promptToUser: '请给出择日区间起始日期（如 2026-08-01）。' },
      { name: 'endDate', required: true, description: '区间止（yyyy-mm-dd）', promptToUser: '请给出择日区间结束日期（如 2026-08-31）。' },
    ],
    safeDefaults: { birth: { minute: 0 }, topN: 5 },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender', 'purpose', 'startDate', 'endDate'],
    workflow: '确认生辰 + 用途 + 日期区间 → 调 combo_zeri → 看 Top-N 吉日（评分+理由）+ 吉时 + 本年凶方规避 + 命卦吉方借力。动土/安葬用途已自动剔除犯太岁岁破日。',
  },
  combo_monthly_fortune: {
    tool: 'combo_monthly_fortune',
    purpose: '月度运势切片：流月干支+五运六气客气步+节气调养+紫微流月。需生辰 + 年份 + 月份。',
    requiredParams: [
      ...BIRTH_PARAMS,
      { name: 'targetYear', required: true, description: '欲测年份', promptToUser: '请给出欲测年份（如 2026）。' },
      { name: 'targetMonth', required: true, description: '欲测月份（1-12）', promptToUser: '请给出欲测月份（1-12）。' },
    ],
    safeDefaults: { birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender', 'targetYear', 'targetMonth'],
    workflow: '确认生辰 + 年份 + 月份 → （可选）问体质传 constitution → 调 combo_monthly_fortune → 看流月干支+客气步+节气调养+紫微流月四维度 + 本月建议。',
  },
  cast_meihua: {
    tool: 'cast_meihua',
    purpose: '梅花易数：时间起卦需生辰，数字起卦需两个数字。',
    requiredParams: [
      { name: 'method', required: true, description: '起卦方式（time/number）', promptToUser: '请选择起卦方式：时间起卦(time，需生辰) 或 数字起卦(number，需两个数字)。' },
      ...BIRTH_PARAMS.filter((p) => p.name !== 'birth.gender'),
    ],
    safeDefaults: { method: 'time', birth: { minute: 0 } },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认起卦方式与参数 → 调 cast_meihua → 呈现本卦、变卦、上下卦、动爻或体用关系前，以本次 presentationToken 调 validate_divination_presentation；valid:true 后才呈现。吉凶分级、策略与传统解释不进入 claims。',
  },
  calc_yunqi: {
    tool: 'calc_yunqi',
    purpose: '五运六气：需年份（生辰年或欲测年份）。',
    requiredParams: [
      { name: 'year', required: true, description: '公历年', promptToUser: '请提供年份（公历，如 2024）。' },
    ],
    safeDefaults: { currentMonth: new Date().getMonth() + 1 },
    doNotAssume: ['year'],
    workflow: '确认年份 → 调 calc_yunqi → 呈现年度、干支、岁运、司天、在泉或客气步骤前，以本次 presentationToken 调 validate_calendar_presentation；valid:true 后才呈现。疾病倾向、养生建议与传统解释不进入 claims。',
  },
  analyze_name: {
    tool: 'analyze_name',
    purpose: '姓名评分：需姓 + 名。出生年提升生肖契合度；完整生辰叠加八字喜用神补强评分。',
    requiredParams: [
      { name: 'surname', required: true, description: '姓氏', promptToUser: '请提供姓氏（如"张"）。' },
      { name: 'givenName', required: true, description: '名', promptToUser: '请提供名（如"伟"）。' },
    ],
    safeDefaults: {},
    doNotAssume: ['surname', 'givenName', 'birth.year', 'birth.month', 'birth.day', 'birth.hour'],
    workflow: '确认姓与名 → （可选）问出生年提生肖契合 → （可选）问完整生辰叠八字喜用神补强 → 调 analyze_name → 看五维评分与等级，命理契合维度会标注用神补强情况。',
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
  get_almanac: {
    tool: 'get_almanac',
    purpose: '每日黄历：干支、纳音、冲煞与时辰等基础历法字段；不传 date 时仅查询系统当天。',
    requiredParams: [
      { name: 'date', required: true, description: '公历日期 yyyy-mm-dd', promptToUser: '请提供要查询的公历日期（如 2026-08-01）；若查今天可不传。' },
    ],
    safeDefaults: {},
    doNotAssume: ['date'],
    workflow: '如需把基础历法字段呈现为本次确定性事实，必须确认并显式传 date → 调 get_almanac → 用本次 presentationToken 调 validate_calendar_presentation；valid:true 后才呈现。未传 date 的系统当天结果不签发凭证；宜忌、神位建议与传统解释不进入 claims。',
  },
  calc_feixing: {
    tool: 'calc_feixing',
    purpose: '流年飞星：九宫飞星盘+元运旺衰+凶位化解，可附命卦八方吉凶（需性别）。',
    requiredParams: [
      { name: 'year', required: true, description: '公历年', promptToUser: '请提供要查的年份（如 2026）；不传默认今年。' },
    ],
    safeDefaults: {},
    doNotAssume: ['year', 'gender', 'birthYear'],
    workflow: '确认年份（+可选性别/出生年推命卦方位）→ 调 calc_feixing → 从本次 ToolEnvelope 提取年度、元运、中宫与指定九宫飞星事实组成 claims → 用 presentationToken 调 validate_feixing_presentation；valid:true 后才呈现。化解、布局、财位与个人命卦解释不进入 claims。',
  },
  calc_bazhai: {
    tool: 'calc_bazhai',
    purpose: '八宅大游年：命卦+个人八方吉凶+太岁三煞，可算门主灶配合。需出生年+性别。',
    requiredParams: [
      { name: 'birthYear', required: true, description: '出生年', promptToUser: '请提供您的出生年份（如 1990）。' },
      { name: 'gender', required: true, description: '性别', promptToUser: '请提供性别（男/女），用于推命卦。' },
    ],
    safeDefaults: {},
    doNotAssume: ['birthYear', 'gender', 'door', 'bedroom', 'kitchen'],
    workflow: '确认出生年+性别 → 调 calc_bazhai → 从本次 ToolEnvelope 提取命卦、八方游年星与吉凶、年度太岁/岁破/三煞/五黄等确定性事实组成 claims → 用 presentationToken 调 validate_bazhai_presentation；valid:true 后才呈现。传统释义、布局建议、门主灶与化解建议不进入 claims。若用户问门主灶则补问 door/bedroom/kitchen 方位再调。',
  },
  get_daily_rhythm: {
    tool: 'get_daily_rhythm',
    purpose: '每日节律：当前节气调养+时辰经络当令，可传体质命中针对性建议。',
    requiredParams: [
      { name: 'date', required: true, description: '公历日期', promptToUser: '请提供日期（如 2026-08-01）；查今天可不传。' },
    ],
    safeDefaults: {},
    doNotAssume: ['date', 'hour', 'constitution'],
    workflow: '确认日期（+可选体质）→ 调 get_daily_rhythm → 解读节气调养与时辰经络养生。',
  },
  assess_constitution: {
    tool: 'assess_constitution',
    purpose: '中医九种体质问卷自评：传答题算转化分+主体质+调养建议。',
    requiredParams: [
      { name: 'answers', required: true, description: '用户答题数组', promptToUser: '请先调 list_constitution_questionnaire 取题目，逐题问用户得分（1-5），再传 answers 调本工具。' },
    ],
    safeDefaults: {},
    doNotAssume: ['answers'],
    workflow: '调 list_constitution_questionnaire 取题 → 逐题问用户得分（1-5）→ 汇总 answers → 调 assess_constitution → 解读主体质与调养方向。',
  },
  list_constitution_questionnaire: {
    tool: 'list_constitution_questionnaire',
    purpose: '列出九种体质问卷题目，供后续逐题收集用户评分。',
    requiredParams: [],
    safeDefaults: {},
    doNotAssume: [],
    workflow: '先调本工具取得题目 → 逐题询问用户 1-5 分 → 再调 assess_constitution。',
  },
  combo_marriage: {
    tool: 'combo_marriage',
    purpose: '合婚/合伙/合作配对：双方八字冲合、五行互补、命卦与可选姓名匹配。',
    requiredParams: [
      { name: 'personA.birth', required: true, description: '甲方完整生辰', promptToUser: '请提供甲方完整出生年月日时与性别。' },
      { name: 'personA.baziTimeContext', required: true, description: '甲方八字时间来源', promptToUser: '请确认甲方真太阳时校验结果，或明确同意按民用时间计算并确认未完成真太阳时复核。' },
      { name: 'personB.birth', required: true, description: '乙方完整生辰', promptToUser: '请提供乙方完整出生年月日时与性别。' },
      { name: 'personB.baziTimeContext', required: true, description: '乙方八字时间来源', promptToUser: '请确认乙方真太阳时校验结果，或明确同意按民用时间计算并确认未完成真太阳时复核。' },
    ],
    safeDefaults: {},
    doNotAssume: ['personA.birth', 'personA.baziTimeContext', 'personB.birth', 'personB.baziTimeContext'],
    workflow: '分别完成双方八字时间来源核验或民用降级确认 → 调 combo_marriage → 基于返回的配对结构化结果解读。',
  },
  cast_cezi: {
    tool: 'cast_cezi',
    purpose: '测字/字占：按汉字数理、字义五行与字形结构给出传统文化参考；可选叠加八字用神补益。',
    requiredParams: [
      { name: 'char', required: true, description: '所测汉字', promptToUser: '请提供要测的汉字。' },
    ],
    safeDefaults: {},
    doNotAssume: ['char', 'birth', 'baziTimeContext'],
    workflow: '确认所测汉字 → 调 cast_cezi；只有用户提供完整生辰时才可叠加八字用神，并必须同时传 baziTimeContext。',
  },
  calc_chenguz: {
    tool: 'calc_chenguz',
    purpose: '袁天罡称骨：按完整出生年月日时和性别计算传统称骨结果。',
    requiredParams: BIRTH_PARAMS,
    safeDefaults: { birth: { minute: 0 }, version: 'standard' },
    doNotAssume: ['birth.year', 'birth.month', 'birth.day', 'birth.hour', 'birth.gender'],
    workflow: '确认完整生辰 → 调 calc_chenguz → 仅依据返回结果说明民俗参考。',
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
