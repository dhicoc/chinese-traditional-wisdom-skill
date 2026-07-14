export type ModuleGroup = '易学源流' | '术数排盘' | '堪舆风水' | '医道运气' | '日用工具' | '知识检索' | '开发者';

export type ModuleStatus = 'local-exact' | 'local-approx' | 'demo' | 'knowledge' | 'derived' | 'folk-experience';

export type ModuleId =
  | 'home'
  | 'bazi'
  | 'ziwei'
  | 'liuyao'
  | 'meihua'
  | 'qimen'
  | 'fengshui'
  | 'feixing'
  | 'bazhai'
  | 'yunqi'
  | 'tizhi'
  | 'almanac'
  | 'namewuxing'
  | 'dream'
  | 'rhythm'
  | 'mermaid'
  | 'testing'
  | 'reader'
  | 'history'
  | 'combo'
  | 'liuren'
  | 'xingxiu'
  | 'taiyi';

export interface WisdomModule {
  id: ModuleId;
  group: ModuleGroup;
  title: string;
  shortTitle: string;
  status: ModuleStatus;
  statusLabel: string;
  privacyLevel: string;
  questionTypes: string[];
  accent: string;
  description: string;
}

export const MODULES: WisdomModule[] = [
  {
    id: 'home',
    group: '易学源流',
    title: '首页',
    shortTitle: '首页',
    status: 'derived',
    statusLabel: '入口聚合',
    privacyLevel: '不保存个人资料',
    questionTypes: ['工具索引', '能力边界'],
    accent: '#159b6e',
    description: '统一展示工具入口、能力状态、隐私边界和 AI 上下文复制。',
  },
  {
    id: 'bazi',
    group: '术数排盘',
    title: '八字命盘',
    shortTitle: '八字',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['命盘', '五行', '十神'],
    accent: '#c6301f',
    description: '基于出生年月日时生成四柱结构，并输出五行与十神基础分析。',
  },
  {
    id: 'ziwei',
    group: '术数排盘',
    title: '紫微斗数',
    shortTitle: '紫微',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['十二宫', '星曜', '四化'],
    accent: '#9f2418',
    description: '紫微斗数：按生辰排十二宫命盘，显示十四主星、辅星、四化，分析性格与运势走向。',
  },
  {
    id: 'liuyao',
    group: '术数排盘',
    title: '六爻占卜',
    shortTitle: '六爻',
    status: 'local-exact',
    statusLabel: '本地真实纳甲',
    privacyLevel: '仅本地计算',
    questionTypes: ['纳甲', '世应', '用神', '六亲', '六神'],
    accent: '#dd5836',
    description: '内置京房八宫纳甲引擎：铜钱法/时间起卦/手动爻值，输出纳甲、六亲、六神、世应、用神与变卦。',
  },
  {
    id: 'meihua',
    group: '术数排盘',
    title: '梅花易数',
    shortTitle: '梅花',
    status: 'local-approx',
    statusLabel: '本地规则',
    privacyLevel: '仅本地计算',
    questionTypes: ['时间起卦', '数字起卦', '体用'],
    accent: '#c9b27a',
    description: '梅花易数：时间起卦或数字起卦，输出上下卦、动爻、体用生克、互卦变卦、错综卦与吉凶分级。',
  },
  {
    id: 'qimen',
    group: '术数排盘',
    title: '奇门遁甲',
    shortTitle: '奇门',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['时家奇门', '九宫', '门星神'],
    accent: '#9a8a7a',
    description: '时家奇门遁甲排盘（3meta v2.6.0 真实排盘）：三奇六仪、九星、八门、八神、值符值使、空亡马星、旺相休囚、十二长生、六仪击刑、十干生克、吉凶格局自动检测。',
  },
  {
    id: 'liuren',
    group: '术数排盘',
    title: '大六壬',
    shortTitle: '六壬',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['事件占断', '应期推算', '三传四课', '神煞格局'],
    accent: '#5b7c99',
    description: '大六壬（六壬神课）：天地盘、四课、三传（九宗门贼克/比用/涉害/遥克/昴星/八专/伏吟/返吟）、神煞、格局。传统三式之一，擅长事件细节与应期推算。',
  },
  {
    id: 'xingxiu',
    group: '术数排盘',
    title: '二十八星宿',
    shortTitle: '星宿',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['值日星宿', '吉凶宜忌', '四象禽星', '择日参考'],
    accent: '#4a6fa5',
    description: '二十八星宿：每日值宿查询、吉凶宜忌、四象（青龙/朱雀/白虎/玄武）分组、禽星全称、七曜五行。传统择吉与天文历法基础。',
  },
  {
    id: 'taiyi',
    group: '术数排盘',
    title: '太乙神数',
    shortTitle: '太乙',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅本地计算',
    questionTypes: ['事件占断', '主客胜负', '应期推算', '格局吉凶'],
    accent: '#8a6db8',
    description: '太乙神数：传统三式之首。太乙积年推局数，太乙落宫、文昌始击定目、主客算与四将，据掩迫关囚击格等格局断事件吉凶与主客胜负。',
  },
  {
    id: 'fengshui',
    group: '堪舆风水',
    title: '风水罗盘',
    shortTitle: '罗盘',
    status: 'knowledge',
    statusLabel: '知识映射',
    privacyLevel: '不含个人资料',
    questionTypes: ['二十四山', '八卦'],
    accent: '#2a9d75',
    description: '展示二十四山、八卦方位与映射表说明。',
  },
  {
    id: 'feixing',
    group: '堪舆风水',
    title: '流年飞星',
    shortTitle: '飞星',
    status: 'local-approx',
    statusLabel: '本地规则',
    privacyLevel: '仅年份输入',
    questionTypes: ['九宫', '飞星'],
    accent: '#159b6e',
    description: '按年份渲染九宫飞星结构和吉凶提示。',
  },
  {
    id: 'bazhai',
    group: '堪舆风水',
    title: '八宅大游年',
    shortTitle: '八宅',
    status: 'local-approx',
    statusLabel: '本地规则',
    privacyLevel: '仅出生年与性别',
    questionTypes: ['命卦', '宅卦'],
    accent: '#173a47',
    description: '展示东四命、西四命与八宅游年吉凶结构。',
  },
  {
    id: 'combo',
    group: '术数排盘',
    title: '联合分析',
    shortTitle: '联合',
    status: 'local-exact',
    statusLabel: '多系统聚合',
    privacyLevel: '仅本地计算',
    questionTypes: ['综合运势', '事件决策', '空间布局', '交叉验证', '择吉日'],
    accent: '#9d7ad6',
    description: '跨系统联合分析：年度综合运势（八字+五运六气+奇门+命卦方位）、事件决策（六爻+梅花+奇门三卜交叉验证）、空间+时间（飞星+八宅+奇门吉方）、三式互参（大六壬+奇门+梅花）、三式合一（奇门+太乙+大六壬）、今日养生建议（体质+24节气+子午流注时辰+方位）、综合择日（黄历宜忌+神煞+太岁三煞+命卦吉方筛吉日）。多系统一致性检验。',
  },
  {
    id: 'yunqi',
    group: '医道运气',
    title: '五运六气',
    shortTitle: '运气',
    status: 'local-exact',
    statusLabel: '本地精确历法',
    privacyLevel: '仅年份输入',
    questionTypes: ['岁运', '司天', '在泉'],
    accent: '#2a9d75',
    description: '按年份推算岁运、司天在泉与六步客气。',
  },
  {
    id: 'tizhi',
    group: '医道运气',
    title: '体质辨识',
    shortTitle: '体质',
    status: 'derived',
    statusLabel: '评分派生',
    privacyLevel: '仅本地评分',
    questionTypes: ['九种体质', '雷达图'],
    accent: '#c9b27a',
    description: '用九种体质评分展示偏颇倾向和调养提示。',
  },
  // 日用工具扩展 (v0.4)
  {
    id: 'almanac',
    group: '日用工具',
    title: '每日黄历',
    shortTitle: '黄历',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '不保存个人资料',
    questionTypes: ['宜忌', '时辰', '节气'],
    accent: '#c6301f',
    description: '基于农历日期展示当日宜忌、吉时凶时、节气物候等民俗参考信息，不做吉凶预测。',
  },
  {
    id: 'namewuxing',
    group: '日用工具',
    title: '姓名五行',
    shortTitle: '姓名',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '仅本地计算',
    questionTypes: ['笔画', '五行', '三才'],
    accent: '#2a9d75',
    description: '分析姓名汉字的笔画五行与三才配置，作为文化参考，不构成命名建议。',
  },
  {
    id: 'dream',
    group: '日用工具',
    title: '周公解梦',
    shortTitle: '解梦',
    status: 'folk-experience',
    statusLabel: '民俗参考',
    privacyLevel: '不保存个人资料',
    questionTypes: ['梦象', '吉凶', '古文断语'],
    accent: '#6b5b95',
    description: '基于开源周公解梦库（9550条现代解读+952条古文断语）提供梦象吉凶寓意查询，民俗参考，非预言绝对。',
  },
  {
    id: 'rhythm',
    group: '日用工具',
    title: '每日节律',
    shortTitle: '节律',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '不保存个人资料',
    questionTypes: ['时辰', '经络', '养生'],
    accent: '#c9b27a',
    description: '展示十二时辰与经络气血流注的对应关系，提供养生节律参考。',
  },
  {
    id: 'mermaid',
    group: '知识检索',
    title: '知识图谱',
    shortTitle: '图谱',
    status: 'knowledge',
    statusLabel: '知识图谱',
    privacyLevel: '不含个人资料',
    questionTypes: ['古籍', '映射', '流程'],
    accent: '#eee8cc',
    description: '通过 Mermaid 和后续 Split Reader 展示知识结构与古籍映射。',
  },
  {
    id: 'reader',
    group: '开发者',
    title: '古籍 Split Reader',
    shortTitle: '古籍',
    status: 'knowledge',
    statusLabel: '知识映射',
    privacyLevel: '不含个人资料',
    questionTypes: ['古籍原文', '映射 JSON', '对照'],
    accent: '#c9b27a',
    description: '左侧古籍 Markdown 原文与右侧映射 JSON 结构对照阅读，支持关键词搜索高亮。',
  },
  {
    id: 'history',
    group: '开发者',
    title: '本地历史与收藏',
    shortTitle: '历史',
    status: 'derived',
    statusLabel: '本地存储',
    privacyLevel: '脱敏摘要',
    questionTypes: ['历史', '收藏', '隐私'],
    accent: '#c9b27a',
    description: '自动保存最近 30 条脱敏阅读摘要，不保存完整姓名、完整出生日期或具体地点。',
  },
];

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((module) => module.group)));

export function getModuleById(id: ModuleId) {
  return MODULES.find((module) => module.id === id) ?? MODULES[0];
}

export function isModuleId(value: string): value is ModuleId {
  return MODULES.some((module) => module.id === value);
}
