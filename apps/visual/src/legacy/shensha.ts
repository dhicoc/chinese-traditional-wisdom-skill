/**
 * shensha.ts — 八字神煞推算（纯干支规则，零外部依赖）
 *
 * 神煞为传统命理中的"星煞"体系，按日干/日支/年支/月支等查法，
 * 在四柱地支（或天干）中检出吉凶神煞。本实现收录 35 种常用神煞，
 * 规则依据《渊海子平》《三命通会》等古籍，经联网交叉核验。
 *
 * 查法分类：
 * - 日干查地支：天乙/文昌/禄神/羊刃/金舆/太极/福星/国印/天厨/天德/月德/天德合/月德合
 * - 年支（或日支）三合查：桃花/驿马/华盖/将星/孤辰/寡宿/劫煞/灾煞/亡神/六厄/月空
 * - 日柱直查：魁罡/阴差阳错/十恶大败/空亡/六秀/四废（按月定季）
 * - 年支直查：红鸾/天喜/天罗地网（按纳音筛选）
 * - 年干（或日干）顺排：三奇
 * - 纳音查：学堂/词馆
 *
 * 注意：神煞为文化参考与命理意象，不构成绝对吉凶判断。
 */

/** 三合局神煞的查取口径：年支三合（传统主流）或日支三合（流派之一） */
export type TrineSource = 'year' | 'day';

export type ShenShaCategory =
  | '贵人'
  | '文昌'
  | '禄刃'
  | '桃花'
  | '驿马'
  | '华盖'
  | '将星'
  | '月德'
  | '天德'
  | '月空'
  | '天赦'
  | '金舆'
  | '孤寡'
  | '空亡'
  | '魁罡'
  | '太极'
  | '福星'
  | '国印'
  | '天厨'
  | '三奇'
  | '学堂'
  | '六秀'
  | '劫煞'
  | '灾煞'
  | '亡神'
  | '六厄'
  | '天罗地网'
  | '红鸾'
  | '阴差阳错'
  | '十恶大败'
  | '四废';

export interface ShenShaItem {
  name: string;
  category: ShenShaCategory;
  /** 命局中触发该神煞的地支（魁罡为日支） */
  branch: string;
  /** 出现在哪一柱 */
  pillar: '年' | '月' | '日' | '时';
  meaning: string;
}

interface PillarLike {
  stem: string;
  branch: string;
}
export interface PillarsLike {
  year: PillarLike;
  month: PillarLike;
  day: PillarLike;
  hour: PillarLike;
}

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const;
const PILLAR_LABEL: Record<(typeof PILLAR_KEYS)[number], '年' | '月' | '日' | '时'> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
};

// 干支序（用于空亡/四废等推算）
const GAN_ORDER = '甲乙丙丁戊己庚辛壬癸';
const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';

/** 三合局归类 */
function triadOf(branch: string): '申子辰' | '亥卯未' | '寅午戌' | '巳酉丑' | '' {
  if (branch === '申' || branch === '子' || branch === '辰') return '申子辰';
  if (branch === '亥' || branch === '卯' || branch === '未') return '亥卯未';
  if (branch === '寅' || branch === '午' || branch === '戌') return '寅午戌';
  if (branch === '巳' || branch === '酉' || branch === '丑') return '巳酉丑';
  return '';
}

// ─── 日干查地支 ───

const TIANYI: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
const WENCHANG: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LUSHEN: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const YANGREN: Record<string, string> = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
const JINYU: Record<string, string> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };

/** 太极贵人（日干或年干查地支）：甲乙→子午，丙丁→卯酉，戊己→辰戌丑未，庚辛→寅亥，壬癸→巳申 */
const TAIJI: Record<string, string[]> = {
  甲: ['子', '午'], 乙: ['子', '午'], 丙: ['卯', '酉'], 丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'], 己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'], 辛: ['寅', '亥'], 壬: ['巳', '申'], 癸: ['巳', '申'],
};

/** 福星贵人（年干或日干查地支，口诀配对版）：甲丙→寅子，乙癸→丑卯，戊→申，己→未，丁→亥，庚→午，辛→巳，壬→辰 */
const FUXING: Record<string, string[]> = {
  甲: ['寅', '子'], 丙: ['寅', '子'], 乙: ['丑', '卯'], 癸: ['丑', '卯'],
  戊: ['申'], 己: ['未'], 丁: ['亥'], 庚: ['午'], 辛: ['巳'], 壬: ['辰'],
};

/** 国印贵人（日干或年干查地支）：甲戌乙亥丙丑丁寅戊丑己寅庚辰辛巳壬未癸申 */
const GUOYIN: Record<string, string> = { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' };

/** 天厨贵人（日干或年干查地支，食神之禄位）：甲巳乙午丙巳丁午戊申己酉庚亥辛子壬寅癸卯 */
const TIANCHU: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };

/** 天德贵人（月支查天干）：正丁二申三壬四辛五亥六甲七癸八寅九丙十乙十一巳十二庚 */
const TIANDE: Record<string, string> = {
  寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲',
  申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚',
};
/** 天德合（月支查天干，取天德的五合）：丁壬合、申巳合、壬丁合、辛丙合、亥寅合、甲己合、癸戊合、寅亥合、丙辛合、乙庚合、巳申合、庚乙合 */
const TIANDECOMBINE: Record<string, string> = {
  寅: '壬', 卯: '巳', 辰: '丁', 巳: '丙', 午: '寅', 未: '己',
  申: '戊', 酉: '亥', 戌: '辛', 亥: '庚', 子: '申', 丑: '乙',
};

/** 月德贵人（月支三合 → 天干）：寅午戌→丙，申子辰→壬，亥卯未→甲，巳酉丑→庚 */
const YUEDE: Record<string, string> = { 寅午戌: '丙', 申子辰: '壬', 亥卯未: '甲', 巳酉丑: '庚' };
/** 月德合（月支三合 → 天干五合）：丙辛合、壬丁合、甲己合、庚乙合 */
const YUEDECOMBINE: Record<string, string> = { 寅午戌: '辛', 申子辰: '丁', 亥卯未: '己', 巳酉丑: '乙' };

/** 三奇贵人（日干为锚，四柱天干顺排）：天上甲戊庚 / 地下乙丙丁 / 人中辛壬癸 */
const SANQI: Record<string, { group: string; seq: string[] }> = {
  天上三奇: { group: '三奇', seq: ['甲', '戊', '庚'] },
  地下三奇: { group: '三奇', seq: ['乙', '丙', '丁'] },
  人中三奇: { group: '三奇', seq: ['辛', '壬', '癸'] },
};

// ─── 年支（或日支）三合查 ───

const TAOHUA: Record<string, string> = { 申子辰: '酉', 亥卯未: '子', 寅午戌: '卯', 巳酉丑: '午' };
const YIMA: Record<string, string> = { 申子辰: '寅', 亥卯未: '巳', 寅午戌: '申', 巳酉丑: '亥' };
const HUAGAI: Record<string, string> = { 申子辰: '辰', 亥卯未: '未', 寅午戌: '戌', 巳酉丑: '丑' };
const JIANGXING: Record<string, string> = { 申子辰: '子', 亥卯未: '卯', 寅午戌: '午', 巳酉丑: '酉' };

/** 劫煞（三合局之绝地）：申子辰→巳，寅午戌→亥，巳酉丑→寅，亥卯未→申 */
const JIESHA: Record<string, string> = { 申子辰: '巳', 寅午戌: '亥', 巳酉丑: '寅', 亥卯未: '申' };
/** 灾煞（三合局帝旺之对冲）：申子辰→午，寅午戌→子，巳酉丑→卯，亥卯未→酉 */
const ZAISHA: Record<string, string> = { 申子辰: '午', 寅午戌: '子', 巳酉丑: '卯', 亥卯未: '酉' };
/** 亡神（三合局之临官位）：申子辰→亥，寅午戌→巳，巳酉丑→申，亥卯未→寅 */
const WANGSHEN: Record<string, string> = { 申子辰: '亥', 寅午戌: '巳', 巳酉丑: '申', 亥卯未: '寅' };
/** 六厄（三合局五行之死地）：申子辰→卯，寅午戌→酉，巳酉丑→子，亥卯未→午 */
const LIUE: Record<string, string> = { 申子辰: '卯', 寅午戌: '酉', 巳酉丑: '子', 亥卯未: '午' };
/** 月空（月支三合对冲）：申子辰→午，亥卯未→申，寅午戌→子，巳酉丑→卯 */
const YUEKONG: Record<string, string> = { 申子辰: '午', 亥卯未: '申', 寅午戌: '子', 巳酉丑: '卯' };

/** 孤辰寡宿（按年支三合）：申子辰→孤寅寡戌，亥卯未→孤申寡辰，寅午戌→孤巳寡丑，巳酉丑→孤申寡辰 */
const GUGUA: Record<string, { gu: string; gua: string }> = {
  申: { gu: '寅', gua: '戌' }, 子: { gu: '寅', gua: '戌' }, 辰: { gu: '寅', gua: '戌' },
  亥: { gu: '申', gua: '辰' }, 卯: { gu: '申', gua: '辰' }, 未: { gu: '申', gua: '辰' },
  寅: { gu: '巳', gua: '丑' }, 午: { gu: '巳', gua: '丑' }, 戌: { gu: '巳', gua: '丑' },
  巳: { gu: '申', gua: '辰' }, 酉: { gu: '申', gua: '辰' }, 丑: { gu: '申', gua: '辰' },
};

// ─── 日柱直查 ───

/** 魁罡四日 */
const KUIGANG = ['庚戌', '庚辰', '壬辰', '戊戌'];
/** 阴差阳错十二日（阳错/阴差各六） */
const YINCHAYANGCHUO = {
  阳错: ['丙子', '戊寅', '壬辰', '丙午', '戊申', '壬戌'],
  阴差: ['丁丑', '辛卯', '癸巳', '丁未', '辛酉', '癸亥'],
};
/** 十恶大败十日 */
const SHIE = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];
/** 六秀日 */
const LIUXIU = ['丙午', '丁未', '戊子', '戊午', '己丑', '己未'];
/** 四废（按月支定季）：春(寅卯辰)废金、夏(巳午未)废水、秋(申酉戌)废木、冬(亥子丑)废火 */
const SIFEI: Record<string, string[]> = {
  寅卯辰: ['庚申', '辛酉'], 巳午未: ['壬子', '癸亥'],
  申酉戌: ['甲寅', '乙卯'], 亥子丑: ['丙午', '丁巳'],
};
/** 季节 → 所属月支（用于天赦/四废） */
function seasonOf(monthBranch: string): string {
  if (['寅', '卯', '辰'].includes(monthBranch)) return '寅卯辰';
  if (['巳', '午', '未'].includes(monthBranch)) return '巳午未';
  if (['申', '酉', '戌'].includes(monthBranch)) return '申酉戌';
  return '亥子丑';
}

/** 天赦日（按月支定季）：春戊寅、夏甲午、秋戊申、冬甲子 */
const TIANSHEDAY: Record<string, string> = { 寅卯辰: '戊寅', 巳午未: '甲午', 申酉戌: '戊申', 亥子丑: '甲子' };

/** 红鸾/天喜（年支查）：红鸾从卯逆数，天喜=红鸾对冲 */
const HONGLUAN: Record<string, { hongluan: string; tianxi: string }> = {
  子: { hongluan: '卯', tianxi: '酉' }, 丑: { hongluan: '寅', tianxi: '申' },
  寅: { hongluan: '丑', tianxi: '未' }, 卯: { hongluan: '子', tianxi: '午' },
  辰: { hongluan: '亥', tianxi: '巳' }, 巳: { hongluan: '戌', tianxi: '辰' },
  午: { hongluan: '酉', tianxi: '卯' }, 未: { hongluan: '申', tianxi: '寅' },
  申: { hongluan: '未', tianxi: '丑' }, 酉: { hongluan: '午', tianxi: '子' },
  戌: { hongluan: '巳', tianxi: '亥' }, 亥: { hongluan: '辰', tianxi: '戌' },
};

/** 天罗地网（三命通会纳音严格版）：火命见戌亥=天罗，水土命见辰巳=地网，金木命不论 */
const NAYIN_WUXING: Record<string, string> = {
  甲子: '金', 乙丑: '金', 丙寅: '火', 丁卯: '火', 戊辰: '木', 己巳: '木',
  庚午: '土', 辛未: '土', 壬申: '金', 癸酉: '金', 甲戌: '火', 乙亥: '火',
  丙子: '水', 丁丑: '水', 戊寅: '土', 己卯: '土', 庚辰: '金', 辛巳: '金',
  壬午: '木', 癸未: '木', 甲申: '水', 乙酉: '水', 丙戌: '土', 丁亥: '土',
  戊子: '火', 己丑: '火', 庚寅: '木', 辛卯: '木', 壬辰: '水', 癸巳: '水',
  甲午: '金', 乙未: '金', 丙申: '火', 丁酉: '火', 戊戌: '木', 己亥: '木',
  庚子: '土', 辛丑: '土', 壬寅: '金', 癸卯: '金', 甲辰: '火', 乙巳: '火',
  丙午: '水', 丁未: '水', 戊申: '土', 己酉: '土', 庚戌: '金', 辛亥: '金',
  壬子: '木', 癸丑: '木', 甲寅: '水', 乙卯: '水', 丙辰: '土', 丁巳: '土',
  戊午: '火', 己未: '火', 庚申: '木', 辛酉: '木', 壬戌: '水', 癸亥: '水',
};

/** 学堂（纳音五行查）：金巳木亥水申火寅土申 */
const XUETANG: Record<string, string> = { 金: '巳', 木: '亥', 水: '申', 火: '寅', 土: '申' };
/** 词馆（纳音五行查，临官位）：金申木寅水亥火巳土亥 */
const CIGUAN: Record<string, string> = { 金: '申', 木: '寅', 水: '亥', 火: '巳', 土: '亥' };

// ─── 释义 ───

const MEANING: Record<string, string> = {
  天乙贵人: '命中最吉之神，主逢凶化吉、得长辈贵人扶助。',
  文昌贵人: '主聪明好学、利考试文运与才艺表达。',
  禄神: '日主之禄地，主安稳享福、有俸禄根基。',
  羊刃: '刚烈之煞，过旺易刚极易折，需制化方吉。',
  桃花: '主异性缘与情感，过旺则易风流多情。',
  驿马: '主变动、远行、迁徙与奔波，动静皆显。',
  华盖: '主聪慧孤高，喜玄学、艺术与独处思辨。',
  将星: '主领导才能，为组织中之骨干中坚。',
  月德贵人: '月建之德神，主化灾解厄、仁慈荫庇。',
  天德贵人: '四时德神之最，主人品德性、遇事有贵人相扶。',
  月德合: '月德之合神，主贵人合助、逢凶化吉。',
  天德合: '天德之合神，主贵人扶助、化险为夷。',
  月空: '月德之对冲神，主空亡虚浮、谋事易成空。',
  天赦: '赦宥之神，主人逢凶化吉、遇难呈祥。',
  金舆: '主婚姻美、得贤内助，为载命之车。',
  孤辰: '主孤独自立，六亲缘薄，须自立自强。',
  寡宿: '主孤寡清冷，宜静守、专注内在。',
  空亡: '旬空之支，主虚浮落空、事有欠缺，吉凶皆减力。',
  魁罡: '性情刚毅果决，临日柱主掌权不服输。',
  太极贵人: '主聪慧好学、洞察幽微，喜钻研神秘学问。',
  福星贵人: '主福气优厚、少遭凶险，逢凶化吉。',
  国印贵人: '主掌权掌印、信用尊严，利官贵职位。',
  天厨贵人: '主饮食丰足、禄享天厨，利才学名望。',
  三奇: '天地人三奇，主才华超群、成就非凡，须顺排方成立。',
  学堂: '主聪明好学、利学业功名（纳音所查）。',
  词馆: '主文才出众、利科举仕途（纳音所查）。',
  六秀: '六秀之日，主才貌秀气、聪慧不凡。',
  劫煞: '凶煞，主破耗灾祸、防失窃损伤。',
  灾煞: '凶煞，主血光灾祸、防意外伤灾。',
  亡神: '凶煞，主耗财是非、易生暗昧灾祸。',
  六厄: '厄难之神，主困顿挫折、谋事多阻。',
  天罗地网: '困滞之神，主束缚困顿、进退失据。',
  红鸾: '喜庆吉星，主婚姻喜事、情缘顺遂。',
  天喜: '喜庆吉星，主喜事临门、人缘和合。',
  阴差阳错: '婚姻之神，主婚缘不顺、感情多波折。',
  十恶大败: '败神，主破财败家、家业难聚。',
  四废: '废日之神，主衰败无力、谋事难成。',
};

// ─── 60 甲子（空亡/纳音用）───

const JIAZI60: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < 60; i++) out.push(GAN_ORDER[i % 10] + ZHI_ORDER[i % 12]);
  return out;
})();

/** 六旬空亡：甲子旬空戌亥…甲寅旬空子丑 */
const XUN_KONG: Record<string, string[]> = {
  甲子: ['戌', '亥'], 甲戌: ['申', '酉'], 甲申: ['午', '未'],
  甲午: ['辰', '巳'], 甲辰: ['寅', '卯'], 甲寅: ['子', '丑'],
};

/** 取日柱所属旬首干支 */
function xunShouOf(dayStem: string, dayBranch: string): string {
  const idx = JIAZI60.indexOf(dayStem + dayBranch);
  if (idx < 0) return '';
  return JIAZI60[idx - (idx % 10)];
}

// ─── 主函数 ───

export function calcShenSha(pillars: PillarsLike, trineSource: TrineSource = 'year'): ShenShaItem[] {
  const items: ShenShaItem[] = [];
  const dayStem = pillars.day.stem;
  const dayBranch = pillars.day.branch;
  const monthBranch = pillars.month.branch;
  const yearStem = pillars.year.stem;
  const yearBranch = pillars.year.branch;
  // 三合局神煞的查取支：年支（传统主流）或日支（流派之一）
  const trineBranch = trineSource === 'day' ? dayBranch : yearBranch;

  const pushBranch = (name: string, category: ShenShaCategory, target: string) => {
    for (const key of PILLAR_KEYS) {
      if (pillars[key].branch === target) {
        items.push({ name, category, branch: target, pillar: PILLAR_LABEL[key], meaning: MEANING[name] });
      }
    }
  };
  const pushStem = (name: string, category: ShenShaCategory, target: string) => {
    for (const key of PILLAR_KEYS) {
      if (pillars[key].stem === target) {
        items.push({ name, category, branch: pillars[key].branch, pillar: PILLAR_LABEL[key], meaning: MEANING[name] });
      }
    }
  };
  // 对每一柱按给定分支集合匹配（用于阳错/阴差细分展示）
  const pushBranchMany = (name: string, category: ShenShaCategory, targets: string[]) => {
    for (const key of PILLAR_KEYS) {
      if (targets.includes(pillars[key].branch)) {
        items.push({ name, category, branch: pillars[key].branch, pillar: PILLAR_LABEL[key], meaning: MEANING[name] });
      }
    }
  };

  // ── 日干查地支 ──
  const ty = TIANYI[dayStem];
  if (ty) ty.forEach((b) => pushBranch('天乙贵人', '贵人', b));
  const wc = WENCHANG[dayStem];
  if (wc) pushBranch('文昌贵人', '文昌', wc);
  if (LUSHEN[dayStem]) pushBranch('禄神', '禄刃', LUSHEN[dayStem]);
  if (YANGREN[dayStem]) pushBranch('羊刃', '禄刃', YANGREN[dayStem]);
  if (JINYU[dayStem]) pushBranch('金舆', '金舆', JINYU[dayStem]);
  const tj = [...(TAIJI[dayStem] ?? []), ...(TAIJI[yearStem] ?? [])];
  if (tj.length) tj.forEach((b) => pushBranch('太极贵人', '太极', b));
  const fx = [...(FUXING[dayStem] ?? []), ...(FUXING[yearStem] ?? [])];
  if (fx.length) fx.forEach((b) => pushBranch('福星贵人', '福星', b));
  if (GUOYIN[dayStem]) pushBranch('国印贵人', '国印', GUOYIN[dayStem]);
  if (GUOYIN[yearStem]) pushBranch('国印贵人', '国印', GUOYIN[yearStem]);
  if (TIANCHU[dayStem]) pushBranch('天厨贵人', '天厨', TIANCHU[dayStem]);
  if (TIANCHU[yearStem]) pushBranch('天厨贵人', '天厨', TIANCHU[yearStem]);

  // ── 年支（或日支）三合查 ──
  const triad = triadOf(trineBranch);
  if (triad) {
    if (TAOHUA[triad]) pushBranch('桃花', '桃花', TAOHUA[triad]);
    if (YIMA[triad]) pushBranch('驿马', '驿马', YIMA[triad]);
    if (HUAGAI[triad]) pushBranch('华盖', '华盖', HUAGAI[triad]);
    if (JIANGXING[triad]) pushBranch('将星', '将星', JIANGXING[triad]);
    if (JIESHA[triad]) pushBranch('劫煞', '劫煞', JIESHA[triad]);
    if (ZAISHA[triad]) pushBranch('灾煞', '灾煞', ZAISHA[triad]);
    if (WANGSHEN[triad]) pushBranch('亡神', '亡神', WANGSHEN[triad]);
    if (LIUE[triad]) pushBranch('六厄', '六厄', LIUE[triad]);
  }

  // 孤辰寡宿（年支三合）
  const gg = GUGUA[yearBranch];
  if (gg) {
    pushBranch('孤辰', '孤寡', gg.gu);
    pushBranch('寡宿', '孤寡', gg.gua);
  }

  // ── 月支查 ──
  const mTriad = triadOf(monthBranch);
  if (mTriad && YUEDE[mTriad]) pushStem('月德贵人', '月德', YUEDE[mTriad]);
  if (mTriad && YUEDECOMBINE[mTriad]) pushStem('月德合', '月德', YUEDECOMBINE[mTriad]);
  if (TIANDE[monthBranch]) pushStem('天德贵人', '天德', TIANDE[monthBranch]);
  if (TIANDECOMBINE[monthBranch]) pushStem('天德合', '天德', TIANDECOMBINE[monthBranch]);
  if (mTriad && YUEKONG[mTriad]) pushBranch('月空', '月空', YUEKONG[mTriad]);

  // 天赦（按月支定季 → 日柱匹配）
  const season = seasonOf(monthBranch);
  const tianSheDay = TIANSHEDAY[season];
  if (tianSheDay && dayStem + dayBranch === tianSheDay) {
    items.push({ name: '天赦', category: '天赦', branch: dayBranch, pillar: '日', meaning: MEANING['天赦'] });
  }

  // ── 日柱直查 ──
  if (KUIGANG.includes(dayStem + dayBranch)) {
    items.push({ name: '魁罡', category: '魁罡', branch: dayBranch, pillar: '日', meaning: MEANING['魁罡'] });
  }
  if (LIUXIU.includes(dayStem + dayBranch)) {
    items.push({ name: '六秀', category: '六秀', branch: dayBranch, pillar: '日', meaning: MEANING['六秀'] });
  }
  if (YINCHAYANGCHUO.阳错.includes(dayStem + dayBranch)) {
    items.push({ name: '阴差阳错', category: '阴差阳错', branch: dayBranch, pillar: '日', meaning: MEANING['阴差阳错'] });
  }
  if (YINCHAYANGCHUO.阴差.includes(dayStem + dayBranch)) {
    items.push({ name: '阴差阳错', category: '阴差阳错', branch: dayBranch, pillar: '日', meaning: MEANING['阴差阳错'] });
  }
  if (SHIE.includes(dayStem + dayBranch)) {
    items.push({ name: '十恶大败', category: '十恶大败', branch: dayBranch, pillar: '日', meaning: MEANING['十恶大败'] });
  }
  // 四废（按月支定季 → 日柱）
  const feiDays = SIFEI[season];
  if (feiDays && feiDays.includes(dayStem + dayBranch)) {
    items.push({ name: '四废', category: '四废', branch: dayBranch, pillar: '日', meaning: MEANING['四废'] });
  }

  // 空亡（日柱旬）
  const xunShou = xunShouOf(dayStem, dayBranch);
  const kongZhi = XUN_KONG[xunShou];
  if (kongZhi) pushBranchMany('空亡', '空亡', kongZhi);

  // ── 年支直查 ──
  const hl = HONGLUAN[yearBranch];
  if (hl) {
    pushBranch('红鸾', '红鸾', hl.hongluan);
    pushBranch('天喜', '红鸾', hl.tianxi);
  }

  // 天罗地网（三命通会纳音严格版：火命见戌亥=天罗，水土命见辰巳=地网）
  const yearNaYinWx = NAYIN_WUXING[yearStem + yearBranch];
  if (yearNaYinWx === '火') {
    pushBranchMany('天罗地网', '天罗地网', ['戌', '亥']);
  } else if (yearNaYinWx === '水' || yearNaYinWx === '土') {
    pushBranchMany('天罗地网', '天罗地网', ['辰', '巳']);
  }

  // ── 三奇（日干为锚，四柱天干顺排）──
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  for (const [, g] of Object.entries(SANQI)) {
    const seq = g.seq;
    const dayPos = seq.indexOf(dayStem);
    if (dayPos < 0) continue;
    // 形态1：年→月→日 顺排（日干为 seq 末位，年/月为前两位）
    if (dayPos === 2 && stems[0] === seq[0] && stems[1] === seq[1]) {
      items.push({ name: '三奇', category: '三奇', branch: dayBranch, pillar: '日', meaning: MEANING['三奇'] });
      break;
    }
    // 形态2：月→日→时 顺排（日干为 seq 首或中位，月/时与日形成 seq 三段）
    if (dayPos === 0 && stems[1] === seq[1] && stems[2] === seq[2]) {
      items.push({ name: '三奇', category: '三奇', branch: dayBranch, pillar: '日', meaning: MEANING['三奇'] });
      break;
    }
    if (dayPos === 1 && stems[0] === seq[0] && stems[2] === seq[2]) {
      items.push({ name: '三奇', category: '三奇', branch: dayBranch, pillar: '日', meaning: MEANING['三奇'] });
      break;
    }
  }

  // ── 学堂/词馆（纳音查）──
  const naYinWx = NAYIN_WUXING[yearStem + yearBranch];
  if (naYinWx && XUETANG[naYinWx]) pushBranch('学堂', '学堂', XUETANG[naYinWx]);
  if (naYinWx && CIGUAN[naYinWx]) pushBranch('词馆', '学堂', CIGUAN[naYinWx]);

  return items;
}
