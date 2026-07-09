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
  | 'history';

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
    statusLabel: '本地 iztro 排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['十二宫', '星曜', '四化'],
    accent: '#9f2418',
    description: 'React Shell 已通过 Legacy EngineAdapterRegistry 接入 SylarLong/iztro v2.5.8 本地真实排盘，并复用十二宫 Canvas renderer。',
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
    description: '内置时间起卦与数字起卦 Adapter，输出体用生克、互卦与变卦结构。',
  },
  {
    id: 'qimen',
    group: '术数排盘',
    title: '奇门遁甲',
    shortTitle: '奇门',
    status: 'local-approx',
    statusLabel: '本地规则',
    privacyLevel: '仅本地计算',
    questionTypes: ['时家奇门', '九宫', '门星神'],
    accent: '#9a8a7a',
    description: '简化时家奇门遁甲排盘：按年月日时定局，九宫排布八门、九星、八神，输出值符值使与吉凶方位。',
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
    title: '梦境意象',
    shortTitle: '解梦',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '不保存个人资料',
    questionTypes: ['意象', '情绪', '联想'],
    accent: '#6b5b95',
    description: '基于传统解梦词库提供意象联想参考，用于自我观察，不做预言判断。',
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
