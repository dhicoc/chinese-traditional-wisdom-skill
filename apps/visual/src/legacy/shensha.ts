/**
 * shensha.ts — 八字神煞推算（纯干支规则，零外部依赖）
 *
 * 神煞为传统命理中的"星煞"体系，按日干 / 日支 / 月支 / 日柱等规则，
 * 在四柱地支（或天干）中检出吉凶神煞。本实现覆盖最常用的 10 类：
 * 天乙贵人、文昌、禄神、羊刃、咸池桃花、驿马、华盖、将星、月德贵人、魁罡。
 *
 * 查法口径（trineSource）：桃花 / 驿马 / 华盖 / 将星 这四个三合局神煞，
 * 传统主流按【年支】三合查（trineSource='year'），亦有按【日支】三合查的流派
 * （trineSource='day'）。两种口径并存，由调用方/用户选择，本引擎不裁定。
 * 其余神煞（天乙/文昌/禄刃按日干、月德按月支、魁罡按日柱）查法固定，不受口径影响。
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
  | '魁罡';

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

/** 三合局归类（用于桃花 / 驿马 / 华盖 / 将星） */
function triadOf(branch: string): '申子辰' | '亥卯未' | '寅午戌' | '巳酉丑' | '' {
  if (branch === '申' || branch === '子' || branch === '辰') return '申子辰';
  if (branch === '亥' || branch === '卯' || branch === '未') return '亥卯未';
  if (branch === '寅' || branch === '午' || branch === '戌') return '寅午戌';
  if (branch === '巳' || branch === '酉' || branch === '丑') return '巳酉丑';
  return '';
}

const TAOHUA: Record<string, string> = { 申子辰: '酉', 亥卯未: '子', 寅午戌: '卯', 巳酉丑: '午' };
const YIMA: Record<string, string> = { 申子辰: '寅', 亥卯未: '巳', 寅午戌: '申', 巳酉丑: '亥' };
const HUAGAI: Record<string, string> = { 申子辰: '辰', 亥卯未: '未', 寅午戌: '戌', 巳酉丑: '丑' };
const JIANGXING: Record<string, string> = { 申子辰: '子', 亥卯未: '卯', 寅午戌: '午', 巳酉丑: '酉' };

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
const YUEDE: Record<string, string> = { 寅午戌: '丙', 申子辰: '壬', 亥卯未: '甲', 巳酉丑: '庚' };
const KUIGANG = ['庚戌', '庚辰', '壬辰', '戊戌'];

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
  魁罡: '性情刚毅果决，临日柱主掌权不服输。',
};

export function calcShenSha(pillars: PillarsLike, trineSource: TrineSource = 'year'): ShenShaItem[] {
  const items: ShenShaItem[] = [];
  const dayStem = pillars.day.stem;
  const dayBranch = pillars.day.branch;
  const monthBranch = pillars.month.branch;
  // 三合局神煞的查取支：年支（传统主流）或日支（流派之一）
  const trineBranch = trineSource === 'day' ? dayBranch : pillars.year.branch;

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

  // 天乙贵人（日干查地支）
  const ty = TIANYI[dayStem];
  if (ty) ty.forEach((b) => pushBranch('天乙贵人', '贵人', b));

  // 文昌贵人（日干）
  const wc = WENCHANG[dayStem];
  if (wc) pushBranch('文昌贵人', '文昌', wc);

  // 禄神 / 羊刃（日干）
  if (LUSHEN[dayStem]) pushBranch('禄神', '禄刃', LUSHEN[dayStem]);
  if (YANGREN[dayStem]) pushBranch('羊刃', '禄刃', YANGREN[dayStem]);

  // 桃花 / 驿马 / 华盖 / 将星（按 trineSource 取年支或日支三合局）
  const triad = triadOf(trineBranch);
  if (triad) {
    if (TAOHUA[triad]) pushBranch('桃花', '桃花', TAOHUA[triad]);
    if (YIMA[triad]) pushBranch('驿马', '驿马', YIMA[triad]);
    if (HUAGAI[triad]) pushBranch('华盖', '华盖', HUAGAI[triad]);
    if (JIANGXING[triad]) pushBranch('将星', '将星', JIANGXING[triad]);
  }

  // 月德贵人（月支三合 → 天干）
  const mTriad = triadOf(monthBranch);
  if (mTriad && YUEDE[mTriad]) pushStem('月德贵人', '月德', YUEDE[mTriad]);

  // 魁罡（日柱干支）
  if (KUIGANG.includes(dayStem + dayBranch)) {
    items.push({ name: '魁罡', category: '魁罡', branch: dayBranch, pillar: '日', meaning: MEANING['魁罡'] });
  }

  return items;
}
