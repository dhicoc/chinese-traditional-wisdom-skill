/**
 * flyingStarRemedies — 九星化煞建议与方位用途数据
 *
 * 提炼自 Sudo-Biao/suangua (MIT) 的 NINE_STARS 数据表，
 * 含化煞物品、适宜房间用途、健康注意、事业提示。
 * 用于增强流年飞星模块的展示层。
 */

export interface NineStarRemedy {
  /** 星编号 1-9 */
  num: number;
  /** 星名（如「一白贪狼星」） */
  name: string;
  /** 五行 */
  element: string;
  /** 吉凶 */
  nature: '吉' | '大吉' | '凶' | '大凶';
  /** 方位用途标签 */
  usageLabel: string;
  /** 适宜房间用途 */
  roomUse: string[];
  /** 事业提示 */
  career: string;
  /** 健康注意 */
  health: string;
  /** 化煞物品（凶星才有） */
  remedy?: string;
  /** 建议颜色 */
  colors?: string;
  /** 具体摆设物品 */
  items?: string;
  /** 含义简述 */
  meaning: string;
}

export const NINE_STAR_REMEDIES: Record<number, NineStarRemedy> = {
  1: {
    num: 1, name: '一白贪狼星', element: '水', nature: '吉',
    usageLabel: '桃花位',
    roomUse: ['书房', '主卧（单身或学生）'],
    career: '传统上与文学、沟通等主题相联系',
    health: '传统水行标签，仅作方位阅读参考',
    colors: '黑色、蓝色、白色',
    items: '水种植物、鱼缸、黑色水晶',
    meaning: '传统上与人缘、学习和沟通等主题相联系',
  },
  2: {
    num: 2, name: '二黑巨门星', element: '土', nature: '大凶',
    usageLabel: '病符位',
    roomUse: ['储物室等低频使用空间'],
    career: '传统上标为需谨慎使用的方位',
    health: '传统“病符”标签，不对应个人健康或孕产风险评估',
    remedy: '传统布置说法：可使用金属色或金属材质的装饰作阅读对照',
    colors: '白色、金色',
    items: '铜葫芦、铜钱、铜钟等传统民俗物件',
    meaning: '传统上与谨慎、口舌等象征主题相联系，不预示现实疾病或事件',
  },
  3: {
    num: 3, name: '三碧禄存星', element: '木', nature: '凶',
    usageLabel: '是非位',
    roomUse: ['储物室等低频使用空间', '传统上以红色系搭配作阅读对照'],
    career: '传统上与沟通摩擦、意见分歧等主题相联系，不预示合同或法律结果',
    health: '传统木行标签，仅作方位阅读参考',
    remedy: '传统布置说法：可使用红色系装饰作阅读对照',
    colors: '红色、紫色',
    items: '红色中国结、灯饰、红色地毯、紫水晶等传统民俗物件',
    meaning: '传统上与口舌、争执等象征主题相联系，不预示现实事件',
  },
  4: {
    num: 4, name: '四绿文昌星', element: '木', nature: '吉',
    usageLabel: '文昌位',
    roomUse: ['书房', '儿童房', '办公室'],
    career: '传统上与学习、写作、教育等主题相联系，不保证考试或职业结果',
    health: '传统木行标签，仅作方位阅读参考',
    colors: '绿色、青色',
    items: '文昌塔、毛笔架、绿色植物、书柜等传统民俗物件',
    meaning: '传统上与文学、学习和人际互动等象征主题相联系',
  },
  5: {
    num: 5, name: '五黄廉贞星', element: '土', nature: '大凶',
    usageLabel: '五黄凶位',
    roomUse: ['传统上建议避免安排大型改造的区域'],
    career: '传统上通常建议避免在此方位安排大型改造；实际施工请以建筑安全和物业规定为准',
    health: '传统“五黄”标签，不对应个人健康或安全风险评估',
    remedy: '传统布置说法：可使用金属色或金属材质的装饰作阅读对照',
    colors: '白色、金色',
    items: '铜钱、铜风铃、铜葫芦等传统民俗物件',
    meaning: '传统上标为需谨慎对待的方位标签，不预示灾祸、死亡或财务结果',
  },
  6: {
    num: 6, name: '六白武曲星', element: '金', nature: '吉',
    usageLabel: '武贵位',
    roomUse: ['主卧（当家者）', '书房', '客厅主位'],
    career: '传统上与秩序、管理和行动力等主题相联系，不构成投资或职业建议',
    health: '传统金行标签，仅作方位阅读参考',
    colors: '白色、金色、黄色',
    items: '金属摆件、铜马、水晶球、白色水晶等传统民俗物件',
    meaning: '传统上与权责、行动和人际支持等象征主题相联系',
  },
  7: {
    num: 7, name: '七赤破军星', element: '金', nature: '凶',
    usageLabel: '破败位',
    roomUse: ['储物室等低频使用空间'],
    career: '传统上与沟通摩擦、损耗感等主题相联系，不预示财务或法律结果',
    health: '传统金行标签，仅作方位阅读参考',
    remedy: '传统布置说法：可使用蓝黑色系装饰作阅读对照',
    colors: '黑色、蓝色',
    items: '蓝色水晶球、水种植物、黑色曜石等传统民俗物件',
    meaning: '传统上与口舌、变动等象征主题相联系，不预示伤害、失窃或破财',
  },
  8: {
    num: 8, name: '八白左辅星', element: '土', nature: '大吉',
    usageLabel: '财位',
    roomUse: ['主卧', '客厅', '传统上用于财帛主题的陈设区域'],
    career: '传统上与资源、经营和居住安排等主题相联系，不构成置业或投资建议',
    health: '传统土行标签，仅作方位阅读参考',
    colors: '黄色、棕色、红色',
    items: '黄水晶球、貔貅、金蟾、聚宝盆、红色地毯等传统民俗物件',
    meaning: '传统上与资源、居所和积累等象征主题相联系，不保证财务或家庭结果',
  },
  9: {
    num: 9, name: '九紫右弼星', element: '火', nature: '吉',
    usageLabel: '喜庆位',
    roomUse: ['客厅', '主卧（夫妻）'],
    career: '传统上与显现、庆贺和人际互动等主题相联系，不保证升迁或婚恋结果',
    health: '传统火行标签，仅作方位阅读参考',
    colors: '红色、紫色、绿色',
    items: '九紫灯、红色鲜花、紫水晶、红色中国结等传统民俗物件',
    meaning: '传统上与喜庆、名声和人际支持等象征主题相联系',
  },
};

/**
 * 三元九运表（提炼自 fengshui.skill references/feixing.md）
 */
export interface YuanYun {
  num: number;
  name: string;
  startYear: number;
  endYear: number;
  centerStar: number;
  /** 当令旺星 */
  wangStar: number;
  /** 生气星（将来旺） */
  shengStar: number;
  /** 退气星（刚退） */
  tuiStar: number;
}

export const YUAN_YUN: YuanYun[] = [
  { num: 1, name: '一运', startYear: 1864, endYear: 1883, centerStar: 1, wangStar: 1, shengStar: 2, tuiStar: 9 },
  { num: 2, name: '二运', startYear: 1884, endYear: 1903, centerStar: 2, wangStar: 2, shengStar: 3, tuiStar: 1 },
  { num: 3, name: '三运', startYear: 1904, endYear: 1923, centerStar: 3, wangStar: 3, shengStar: 4, tuiStar: 2 },
  { num: 4, name: '四运', startYear: 1924, endYear: 1943, centerStar: 4, wangStar: 4, shengStar: 5, tuiStar: 3 },
  { num: 5, name: '五运', startYear: 1944, endYear: 1963, centerStar: 5, wangStar: 5, shengStar: 6, tuiStar: 4 },
  { num: 6, name: '六运', startYear: 1964, endYear: 1983, centerStar: 6, wangStar: 6, shengStar: 7, tuiStar: 5 },
  { num: 7, name: '七运', startYear: 1984, endYear: 2003, centerStar: 7, wangStar: 7, shengStar: 8, tuiStar: 6 },
  { num: 8, name: '八运', startYear: 2004, endYear: 2023, centerStar: 8, wangStar: 8, shengStar: 9, tuiStar: 7 },
  { num: 9, name: '九运', startYear: 2024, endYear: 2043, centerStar: 9, wangStar: 9, shengStar: 1, tuiStar: 8 },
];

/** 取指定年份的元运 */
export function getYuanYun(year: number): YuanYun {
  return YUAN_YUN.find((y) => year >= y.startYear && year <= y.endYear) ?? YUAN_YUN[8];
}

/** 九星旺衰状态（按元运变化） */
export interface StarStatus {
  star: number;
  status: '当令旺' | '生气' | '退气' | '失令' | '凶星';
  description: string;
}

/** 取指定元运的九星旺衰状态 */
export function getStarStatuses(yuanYun: YuanYun): StarStatus[] {
  return [
    { star: yuanYun.wangStar, status: '当令旺', description: '传统元运中处于当令阶段的方位标签' },
    { star: yuanYun.shengStar, status: '生气', description: '传统元运中处于生气阶段的方位标签' },
    { star: yuanYun.tuiStar, status: '退气', description: '传统元运中处于退气阶段的方位标签' },
    { star: 5, status: '凶星', description: '传统“五黄”方位标签，仅供文化阅读' },
    { star: 2, status: '凶星', description: '传统“病符”方位标签，不对应疾病判断' },
  ];
}

/**
 * 命卦吉方表（八星 → 方位）。
 * 数据直接由项目权威 EIGHT_MANSIONS_DATA（visual/js/fengshui.js，乾卦已修正）
 * 反推生成，确保与八宅模块一致。此前转录自 suangua MING_GUA_LUCKY 的版本
 * 存在系统性方位错位（坎/坤/兑/艮/乾等多卦四凶位错位），已据此校正。
 */
export interface MingGuaDirections {
  shengqi: string;   // 生气位（最旺财丁）
  tianyi: string;    // 天医位（利健康）
  niannian: string;  // 延年位（利婚姻）
  fuwei: string;     // 伏位（稳定守成）
  jueming: string;   // 绝命位（最凶）
  wugui: string;     // 五鬼位（官非灾祸）
  liusha: string;    // 六煞位（破财损丁）
  huohai: string;    // 祸害位（口舌疾病）
}

export const MING_GUA_DIRECTIONS: Record<number, MingGuaDirections> = {
  1: { shengqi: '东南', tianyi: '东', niannian: '南', fuwei: '北', jueming: '西南', wugui: '东北', liusha: '西北', huohai: '西' },
  2: { shengqi: '东北', tianyi: '西', niannian: '西北', fuwei: '西南', jueming: '北', wugui: '东南', liusha: '南', huohai: '东' },
  3: { shengqi: '南', tianyi: '北', niannian: '东南', fuwei: '东', jueming: '西', wugui: '西北', liusha: '东北', huohai: '西南' },
  4: { shengqi: '北', tianyi: '南', niannian: '东', fuwei: '东南', jueming: '西北', wugui: '西', liusha: '西南', huohai: '东北' },
  6: { shengqi: '西', tianyi: '东北', niannian: '西南', fuwei: '西北', jueming: '南', wugui: '东', liusha: '北', huohai: '东南' },
  7: { shengqi: '西北', tianyi: '西南', niannian: '东北', fuwei: '西', jueming: '东南', wugui: '东', liusha: '南', huohai: '北' },
  8: { shengqi: '西南', tianyi: '西北', niannian: '西', fuwei: '东北', jueming: '南', wugui: '北', liusha: '东', huohai: '东南' },
  9: { shengqi: '东', tianyi: '东南', niannian: '北', fuwei: '南', jueming: '东北', wugui: '西南', liusha: '西北', huohai: '西' },
};

/** 方位 → 九宫宫位映射（洛书） */
const DIR_TO_PALACE: Record<string, string> = {
  '北': '坎', '西南': '坤', '东': '震', '东南': '巽',
  '中': '中', '西北': '乾', '西': '兑', '东北': '艮', '南': '离',
};

/** 宫位 → 方位映射（反向） */
const PALACE_TO_DIR: Record<string, string> = Object.fromEntries(
  Object.entries(DIR_TO_PALACE).map(([k, v]) => [v, k]),
);

export { DIR_TO_PALACE, PALACE_TO_DIR };
