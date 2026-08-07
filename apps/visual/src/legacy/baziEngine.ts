/**
 * baziEngine — 八字排盘纯 TS 引擎（C 类迁移第四步）
 *
 * 整合 visual/js/engines/bazi-engine.js（本地近似 BaziEngine）与
 * engine-adapters.js 的 BaziLunarAdapter（精确节气干支）两条路径：
 * - 传入 solar（lunar-javascript Solar 入口）→ 走精确节气干支（local-exact）
 * - 未传 solar → 走本地近似（节气日近似表 + 基准日推日柱，local-approx）
 *
 * 两条路径输出结构一致（对齐 engine-adapters.js buildBaziResultFromPillars），
 * 渲染器/BaziWorkspace 可直接消费。旧 JS 保留作 EngineAdapterRegistry fallback，零回归。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import { relationBetweenPillars } from './ganZhiChongHe';
import { calcShenSha, type ShenShaItem, type TrineSource } from './shensha';

const TG = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 柱 key → 中文名（避免 toReading/snapshot 输出「year柱」中英混合） */
const PILLAR_CN: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
const STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const STEM_YY = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴'];
const BRANCH_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

const HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'],
  卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'],
  酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

// ─── lunar-javascript Solar/Lunar 入口类型（参数化）──
interface LunarEightCharLike {
  getYear?: () => string;
  getYearGanZhi?: () => string;
  year?: string;
  yearGanZhi?: string;
  getMonth?: () => string;
  getMonthGanZhi?: () => string;
  month?: string;
  monthGanZhi?: string;
  getDay?: () => string;
  getDayGanZhi?: () => string;
  day?: string;
  dayGanZhi?: string;
  getTime?: () => string;
  getTimeGanZhi?: () => string;
  getHour?: () => string;
  hour?: string;
  timeGanZhi?: string;
  /** lunar-javascript 大运入口 */
  /** lunar-javascript/lunar-typescript 大运入口（gender: string 或 number） */
  getYun?: (gender: string | number) => LunarYunLike;
}

/** lunar-javascript 大运对象（getYun 返回） */
interface LunarYunLike {
  getDaYun?: () => Array<LunarDaYunLike>;
  isForward?: () => boolean;
  getStartSolar?: () => { toYmd?: () => string; toString?: () => string };
}

/** lunar-javascript 单个大运对象 */
interface LunarDaYunLike {
  getGanZhi?: () => string;
  getStartAge?: () => number;
  getStartYear?: () => number;
  getEndYear?: () => number;
}
interface LunarLike {
  getEightChar?: () => LunarEightCharLike;
}

interface LunarTransitLike {
  getMonthInGanZhiExact?: () => string;
  getMonthInGanZhi?: () => string;
  getDayInGanZhiExact?: () => string;
  getDayInGanZhi?: () => string;
}

interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): unknown };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): unknown };
}

export interface BaziBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: string;
  isLunar?: boolean;
  useExactCalendar?: boolean;
}

export interface BaziInput {
  birth: BaziBirth;
  /** 可选 lunar-javascript Solar 入口（精确节气干支） */
  solar?: SolarLike | null;
  /** 神煞三合局查取口径：'year' 年支查（传统主流，默认）/ 'day' 日支查（流派之一） */
  shenShaTrineSource?: TrineSource;
}

export interface BaziPillar {
  stem: string;
  branch: string;
  stemIndex: number;
  branchIndex: number;
}
export interface BaziPillars {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
}

export interface BaziLuck {
  ageStart: number;
  stem: string;
  branch: string;
  stemWuxing: string;
  /** 起运年份（精确路径 lunar 提供） */
  startYear?: number;
  /** 该运结束年份（精确路径） */
  endYear?: number;
}

export interface BaziResult {
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  confidenceNote: string;
  sourceProject?: string;
  pillars: BaziPillars;
  dayMaster: string;
  dayMasterWuxing: string;
  dayMasterYinYang: string;
  gender: string;
  hiddenStems: Record<string, string[]>;
  shishen: Record<string, { stem: string; branch: string }>;
  shishenList: Record<string, string>;
  elements: Record<string, number>;
  luck: BaziLuck[];
  luckDirection: '顺行' | '逆行';
  luckStartSolar?: string;
  shenSha: ShenShaItem[];
  /** 本命局神煞所用的三合局查取口径 */
  shenShaTrineSource: TrineSource;
  calendar?: { provider: string; exactSolarTerms: boolean };
}

export interface BaziTransitRelation {
  pillar: string;
  ganZhi: string;
  relations: string[];
}

export interface BaziTransitSnapshot {
  targetYear: number;
  age: number;
  luck: BaziLuck[];
  luckDirection: '顺行' | '逆行';
  luckStartSolar?: string;
  currentLuck: BaziLuck | null;
  yearly: {
    stem: string;
    branch: string;
    stemShiShen: string;
    stemWuxing: string;
  };
  natalRelations: BaziTransitRelation[];
  luckRelations: string[];
  available: boolean;
}

export interface BaziMonthDayPillar {
  stem: string;
  branch: string;
  stemShiShen: string;
  stemWuxing: string;
  natalRelations: BaziTransitRelation[];
  luckRelations: string[];
}

export interface BaziMonthDaySnapshot {
  targetDate: string;
  currentLuck: BaziLuck | null;
  monthly: BaziMonthDayPillar;
  daily: BaziMonthDayPillar;
  available: boolean;
}

// ─── 十神 ───
function getShiShen(dayStem: number, otherStem: number): string {
  const d = dayStem, o = otherStem;
  const diff = (o - d + 10) % 10;
  const same = (d % 2 === 0) === (o % 2 === 0);
  if (diff === 0) return same ? '比肩' : '劫财';
  if (diff === 1) return same ? '偏印' : '正印';
  if (diff === 2) return '食神';
  if (diff === 3) return '伤官';
  if (diff === 4) return '偏财';
  if (diff === 5) return '正财';
  if (diff === 6) return '七杀';
  if (diff === 7) return '正官';
  if (diff === 8) return same ? '比肩' : '劫财';
  if (diff === 9) return same ? '偏印' : '正印';
  return '';
}

// ─── 本地近似：节气日近似表 ───
const SOLAR_TERMS = [
  { m: 2, d: 4 }, { m: 3, d: 6 }, { m: 4, d: 5 },
  { m: 5, d: 6 }, { m: 6, d: 6 }, { m: 7, d: 7 },
  { m: 8, d: 7 }, { m: 9, d: 8 }, { m: 10, d: 8 },
  { m: 11, d: 7 }, { m: 12, d: 7 }, { m: 1, d: 6 },
];
function getMonthIndex(year: number, month: number, day: number): number {
  let idx = 0;
  for (let i = 0; i < SOLAR_TERMS.length; i++) {
    const t = SOLAR_TERMS[i];
    if (month > t.m || (month === t.m && day >= t.d)) idx = i + 1;
  }
  return idx >= 12 ? 0 : idx;
}

function calcPillarsLocal(year: number, month: number, day: number, hour: number): BaziPillars {
  // 年柱（立春前用上年）
  let yStem = (year - 4) % 10;
  let yBranch = (year - 4) % 12;
  if (month < 2 || (month === 2 && day < 4)) {
    yStem = (year - 5) % 10;
    yBranch = (year - 5) % 12;
  }
  if (yStem < 0) yStem += 10;
  if (yBranch < 0) yBranch += 12;

  // 月柱
  const monthIdx = getMonthIndex(year, month, day);
  let mStem = (yStem * 2 + monthIdx + 2) % 10;
  if (mStem < 0) mStem += 10;
  const mBranch = (monthIdx + 2) % 12;

  // 日柱（1900-01-01 = 甲子索引35 = 己亥）
  const ref = new Date(1900, 0, 1);
  const tgt = new Date(year, month - 1, day);
  const days = Math.round((tgt.getTime() - ref.getTime()) / 86400000);
  let sexa = (35 + days) % 60;
  if (sexa < 0) sexa += 60;
  let dStem = sexa % 10;
  let dBranch = sexa % 12;

  // 时柱
  const hBranch = Math.floor((hour + 1) / 2) % 12;
  let hStem = (dStem * 2 + hBranch) % 10;
  if (hStem < 0) hStem += 10;

  // 子时 23:00+ 日柱用次日
  if (hour >= 23) {
    const nextDay = (sexa + 1) % 60;
    dStem = nextDay % 10;
    dBranch = nextDay % 12;
    hStem = (dStem * 2 + 0) % 10;
  }

  return {
    year: { stem: TG[yStem], branch: DZ[yBranch], stemIndex: yStem, branchIndex: yBranch },
    month: { stem: TG[mStem], branch: DZ[mBranch], stemIndex: mStem, branchIndex: mBranch },
    day: { stem: TG[dStem], branch: DZ[dBranch], stemIndex: dStem, branchIndex: dBranch },
    hour: { stem: TG[hStem], branch: DZ[hBranch], stemIndex: hStem, branchIndex: hBranch },
  };
}

// ─── 五行统计（茎2 + 支2 + 藏干1）──
function calcElements(pillars: BaziPillars): Record<string, number> {
  const c: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
    const p = pillars[k];
    c[STEM_WX[p.stemIndex]] += 2;
    c[BRANCH_WX[p.branchIndex]] += 2;
    (HIDDEN[p.branch] || []).forEach((h) => {
      const hi = TG.indexOf(h);
      if (hi >= 0) c[STEM_WX[hi]] += 1;
    });
  });
  return c;
}

function getLuckDirection(pillars: BaziPillars, gender: string): '顺行' | '逆行' {
  const yYang = pillars.year.stemIndex % 2 === 0;
  const isMale = gender === '男';
  return (yYang && isMale) || (!yYang && !isMale) ? '顺行' : '逆行';
}

// ─── 大运（简化 3 岁起运）──
function calcLuck(pillars: BaziPillars, gender: string): BaziLuck[] {
  const mStem = pillars.month.stemIndex;
  const mBranch = pillars.month.branchIndex;
  const forward = getLuckDirection(pillars, gender) === '顺行';
  const luck: BaziLuck[] = [];
  for (let i = 0; i < 8; i++) {
    const age = 3 + i * 10;
    const ls = forward ? (mStem + i + 1) % 10 : (mStem - i - 1 + 10) % 10;
    const lb = forward ? (mBranch + i + 1) % 12 : (mBranch - i - 1 + 12) % 12;
    luck.push({ ageStart: age, stem: TG[ls], branch: DZ[lb], stemWuxing: STEM_WX[ls] });
  }
  return luck;
}

/**
 * 精确大运（lunar-javascript getYun/getDaYun）。
 * 精确起运年龄（按节气余气折算），并带起运/结束年份。跳过 lunar 的胎运段（index 0）。
 * 返回 null 表示 lunar 能力不可用（调用方降级简化大运）。
 */
interface LunarLuckMetadata {
  luck: BaziLuck[];
  direction: '顺行' | '逆行';
  startSolar?: string;
}

function calcLuckWithLunar(solar: SolarLike, birth: BaziBirth): LunarLuckMetadata | null {
  try {
    const s = solar.fromYmdHms
      ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
      : solar.fromYmd?.(birth.year, birth.month, birth.day);
    const lunar = (s && typeof s.getLunar === 'function' ? s.getLunar() : null) as LunarLike | null;
    const eightChar = lunar && typeof lunar.getEightChar === 'function' ? lunar.getEightChar() : null;
    const getYun = eightChar && typeof eightChar.getYun === 'function' ? eightChar.getYun : null;
    if (!getYun) return null;
    const yun = getYun.call(eightChar, birth.gender === '女' ? 0 : 1);
    const getDaYun = yun && typeof yun.getDaYun === 'function' ? yun.getDaYun : null;
    if (!getDaYun) return null;
    const daYun = getDaYun.call(yun);
    if (!Array.isArray(daYun)) return null;

    const luck: BaziLuck[] = [];
    for (const d of daYun) {
      const gz = d && typeof d.getGanZhi === 'function' ? d.getGanZhi() : '';
      const stem = gz.charAt(0);
      const branch = gz.charAt(1);
      const stemIndex = TG.indexOf(stem);
      // 跳过胎运段（干支为空，出生前，startAge < 1）
      if (stemIndex < 0) continue;
      const ageStart = d.getStartAge ? d.getStartAge() : 0;
      luck.push({
        ageStart,
        stem,
        branch,
        stemWuxing: STEM_WX[stemIndex],
        startYear: d.getStartYear ? d.getStartYear() : undefined,
        endYear: d.getEndYear ? d.getEndYear() : undefined,
      });
    }
    if (!luck.length) return null;
    const startSolar = yun.getStartSolar?.();
    const startSolarText = startSolar?.toYmd?.() ?? startSolar?.toString?.();
    return {
      luck,
      direction: yun.isForward?.() === false ? '逆行' : '顺行',
      startSolar: startSolarText,
    };
  } catch {
    return null;
  }
}

// ─── 由 pillars 构建完整结果（对齐 engine-adapters buildBaziResultFromPillars）──
function buildResultFromPillars(
  pillars: BaziPillars,
  birth: BaziBirth,
  luck: BaziLuck[],
  mode: 'local-exact' | 'local-approx',
  confidenceNote: string,
  sourceProject: string | undefined,
  trineSource: TrineSource,
  luckDirection = getLuckDirection(pillars, birth.gender || '男'),
  luckStartSolar?: string,
): BaziResult {
  const dm = pillars.day.stemIndex;
  const hiddenStems: Record<string, string[]> = {};
  const shishenList: Record<string, string> = {};
  const shishen: Record<string, { stem: string; branch: string }> = {};
  (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
    hiddenStems[k] = HIDDEN[pillars[k].branch] || [];
    shishenList[k] = getShiShen(dm, pillars[k].stemIndex);
    const mainH = hiddenStems[k].length ? TG.indexOf(hiddenStems[k][0]) : -1;
    shishen[k] = { stem: shishenList[k], branch: mainH >= 0 ? getShiShen(dm, mainH) : '' };
  });
  const result: BaziResult = {
    engineName: mode === 'local-exact' ? 'BaziLunarAdapter' : 'BaziEngine',
    mode,
    confidenceNote,
    sourceProject,
    pillars,
    dayMaster: pillars.day.stem,
    dayMasterWuxing: STEM_WX[dm],
    dayMasterYinYang: STEM_YY[dm],
    gender: birth.gender || '男',
    hiddenStems,
    shishen,
    shishenList,
    elements: calcElements(pillars),
    luck,
    luckDirection,
    luckStartSolar,
    shenSha: calcShenSha(pillars, trineSource, (birth.gender ?? '男') as '男' | '女'),
    shenShaTrineSource: trineSource,
  };
  if (mode === 'local-exact') result.calendar = { provider: 'lunar-javascript', exactSolarTerms: true };
  return result;
}

// ─── 精确路径：lunar-javascript 取节气干支 ───
function callFirst(obj: LunarEightCharLike | undefined, names: string[]): string {
  if (!obj) return '';
  for (const name of names) {
    const v = (obj as Record<string, unknown>)[name];
    // 用 call(obj) 保证 this 绑定（lunar-javascript 方法依赖 this 访问内部 _p）
    if (typeof v === 'function') return (v as (...a: unknown[]) => unknown).call(obj) as string;
    if (v !== undefined) return String(v);
  }
  return '';
}

function extractPillarText(eightChar: LunarEightCharLike, keys: string[]): string {
  const value = callFirst(eightChar, keys);
  const s = value && typeof value.toString === 'function' ? value.toString() : '';
  return String(s || '').replace(/\s/g, '').slice(0, 2);
}

function pillarFromText(text: string): { stem: string; branch: string; stemIndex: number; branchIndex: number } {
  const stem = text.charAt(0);
  const branch = text.charAt(1);
  const stemIndex = TG.indexOf(stem);
  const branchIndex = DZ.indexOf(branch);
  if (stemIndex < 0 || branchIndex < 0) throw new Error('无法解析干支: ' + text);
  return { stem, branch, stemIndex, branchIndex };
}

function calcPillarsWithLunar(birth: BaziBirth, solar: SolarLike): BaziPillars | null {
  const s = solar.fromYmdHms
    ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
    : solar.fromYmd?.(birth.year, birth.month, birth.day);
  const lunar = (s && typeof s.getLunar === 'function' ? s.getLunar() : null) as LunarLike | null;
  const eightChar = lunar && typeof lunar.getEightChar === 'function' ? lunar.getEightChar() : null;
  if (!eightChar) return null;
  return {
    year: pillarFromText(extractPillarText(eightChar, ['getYear', 'getYearGanZhi', 'year', 'yearGanZhi'])),
    month: pillarFromText(extractPillarText(eightChar, ['getMonth', 'getMonthGanZhi', 'month', 'monthGanZhi'])),
    day: pillarFromText(extractPillarText(eightChar, ['getDay', 'getDayGanZhi', 'day', 'dayGanZhi'])),
    hour: pillarFromText(extractPillarText(eightChar, ['getTime', 'getTimeGanZhi', 'getHour', 'hour', 'timeGanZhi'])),
  };
}

// ─── 主入口 ───
export function calculateBazi(input: BaziInput): BaziResult {
  const birth = input.birth;
  const gender = birth.gender || '男';
  const trineSource: TrineSource = input.shenShaTrineSource ?? 'year';

  // 精确路径
  if (birth.useExactCalendar !== false && input.solar) {
    try {
      const pillars = calcPillarsWithLunar(birth, input.solar);
      if (pillars) {
        // 精确大运（lunar getYun 节气余气起运）；不可用则降级简化
        const lunarLuck = calcLuckWithLunar(input.solar, birth);
        const luck = lunarLuck?.luck ?? calcLuck(pillars, gender);
        const hasExactLuck = luck.length > 0 && luck[0].startYear !== undefined;
        return buildResultFromPillars(
          pillars, birth, luck, 'local-exact',
          hasExactLuck
            ? '已通过 lunar-javascript/Solar 全局对象读取节气干支；大运按节气余气精确起运。'
            : '已通过 lunar-javascript/Solar 全局对象读取节气干支；起运沿用本地简化大运。',
          '6tail/lunar-javascript',
          trineSource,
          lunarLuck?.direction,
          lunarLuck?.startSolar,
        );
      }
    } catch {
      /* 降级近似 */
    }
  }

  // 近似路径
  const pillars = calcPillarsLocal(birth.year, birth.month, birth.day, birth.hour);
  const luck = calcLuck(pillars, gender);
  return buildResultFromPillars(
    pillars, birth, luck, 'local-approx',
    '纯 JS 本地快速排盘；月柱使用近似节气，起运按 3 岁简化，适合可视化与学习参考。',
    undefined,
    trineSource,
  );
}

function describeTransitRelations(referenceGanZhi: string, yearlyGanZhi: string): string[] {
  const relation = relationBetweenPillars(referenceGanZhi, yearlyGanZhi);
  return [
    relation.ganHe ? '天干合' : '',
    relation.ganChong ? '天干冲' : '',
    relation.liuHe ? '六合' : '',
    relation.sanHe ? '三合' : '',
    relation.chong ? '六冲' : '',
    relation.hai ? '相害' : '',
    relation.xing ? '相刑' : '',
  ].filter(Boolean);
}

function buildTransitRelations(pillars: BaziPillars, transitGanZhi: string): BaziTransitRelation[] {
  return (['year', 'month', 'day', 'hour'] as const).map((key) => {
    const pillar = pillars[key];
    const ganZhi = `${pillar.stem}${pillar.branch}`;
    return { pillar: `${PILLAR_CN[key]}柱`, ganZhi, relations: describeTransitRelations(ganZhi, transitGanZhi) };
  }).filter((item) => item.relations.length > 0);
}

export function getBaziTransitSnapshot(input: BaziInput['birth'], targetYear: number, solar?: SolarLike | null): BaziTransitSnapshot {
  const empty: BaziTransitSnapshot = {
    targetYear,
    age: 0,
    luck: [],
    luckDirection: '顺行',
    currentLuck: null,
    yearly: { stem: '', branch: '', stemShiShen: '', stemWuxing: '' },
    natalRelations: [],
    luckRelations: [],
    available: false,
  };
  if (!Number.isInteger(targetYear)) return empty;
  try {
    const result = calculateBazi({ birth: input, solar });
    const age = targetYear - input.year;
    const currentLuck = result.luck.reduce<BaziLuck | null>((active, item) => (
      item.ageStart <= age && (!active || item.ageStart > active.ageStart) ? item : active
    ), null);
    const stemIndex = ((targetYear - 4) % 10 + 10) % 10;
    const branchIndex = ((targetYear - 4) % 12 + 12) % 12;
    const yearlyGanZhi = `${TG[stemIndex]}${DZ[branchIndex]}`;
    const natalRelations = buildTransitRelations(result.pillars, yearlyGanZhi);
    const luckGanZhi = currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '';
    return {
      targetYear,
      age,
      luck: result.luck,
      luckDirection: result.luckDirection,
      luckStartSolar: result.luckStartSolar,
      currentLuck,
      yearly: {
        stem: TG[stemIndex],
        branch: DZ[branchIndex],
        stemShiShen: getShiShen(result.pillars.day.stemIndex, stemIndex),
        stemWuxing: STEM_WX[stemIndex],
      },
      natalRelations,
      luckRelations: luckGanZhi ? describeTransitRelations(luckGanZhi, yearlyGanZhi) : [],
      available: true,
    };
  } catch {
    return empty;
  }
}

function createEmptyMonthDayPillar(): BaziMonthDayPillar {
  return { stem: '', branch: '', stemShiShen: '', stemWuxing: '', natalRelations: [], luckRelations: [] };
}

function parseSolarDate(date: string): { year: number; month: number; day: number } | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return { year, month, day };
}

function createMonthDayPillar(result: BaziResult, ganZhi: string, currentLuck: BaziLuck | null): BaziMonthDayPillar {
  const stem = ganZhi.charAt(0);
  const branch = ganZhi.charAt(1);
  const stemIndex = TG.indexOf(stem);
  if (stemIndex < 0 || DZ.indexOf(branch) < 0) return createEmptyMonthDayPillar();
  const luckGanZhi = currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '';
  return {
    stem,
    branch,
    stemShiShen: getShiShen(result.pillars.day.stemIndex, stemIndex),
    stemWuxing: STEM_WX[stemIndex],
    natalRelations: buildTransitRelations(result.pillars, ganZhi),
    luckRelations: luckGanZhi ? describeTransitRelations(luckGanZhi, ganZhi) : [],
  };
}

export function getBaziMonthDaySnapshot(input: BaziInput['birth'], targetDate: string, solar?: SolarLike | null): BaziMonthDaySnapshot {
  const empty: BaziMonthDaySnapshot = {
    targetDate,
    currentLuck: null,
    monthly: createEmptyMonthDayPillar(),
    daily: createEmptyMonthDayPillar(),
    available: false,
  };
  const date = parseSolarDate(targetDate);
  if (!date || !solar) return empty;
  try {
    const result = calculateBazi({ birth: input, solar });
    const age = date.year - input.year;
    const currentLuck = result.luck.reduce<BaziLuck | null>((active, item) => (
      item.ageStart <= age && (!active || item.ageStart > active.ageStart) ? item : active
    ), null);
    const lunar = solar.fromYmd?.(date.year, date.month, date.day).getLunar() as LunarTransitLike;
    const monthlyGanZhi = lunar.getMonthInGanZhiExact?.() ?? lunar.getMonthInGanZhi?.() ?? '';
    const dailyGanZhi = lunar.getDayInGanZhiExact?.() ?? lunar.getDayInGanZhi?.() ?? '';
    const monthly = createMonthDayPillar(result, monthlyGanZhi, currentLuck);
    const daily = createMonthDayPillar(result, dailyGanZhi, currentLuck);
    if (!monthly.stem || !daily.stem) return empty;
    return { targetDate, currentLuck, monthly, daily, available: true };
  } catch {
    return empty;
  }
}

// ─── ToolEnvelope 适配 ───
export interface BaziData extends BaziResult {
  export_snapshot: ExportSnapshot;
}

export function calcBaziEnveloped(input: BaziInput): ToolEnvelope<BaziData> {
  const result = calculateBazi(input);
  const p = result.pillars;
  const pillarsStr = [p.year, p.month, p.day, p.hour].map((col) => col.stem + col.branch).join(' ');
  const dm = result.dayMaster;
  const dmWx = result.dayMasterWuxing;
  const dmYy = result.dayMasterYinYang;
  const els = result.elements;
  const elSummary = Object.keys(els).map((k) => `${k}:${els[k]}`).join(' ');
  let maxEl = '', maxVal = -1, minEl = '', minVal = Infinity;
  Object.keys(els).forEach((k) => { if (els[k] > maxVal) { maxVal = els[k]; maxEl = k; } if (els[k] < minVal) { minVal = els[k]; minEl = k; } });
  const isStrong = maxVal >= 8;

  const snapshot: ExportSnapshot = {
    summary: `四柱：${pillarsStr}。日主${dm}${dmYy}${dmWx}，五行 ${elSummary}，偏旺${maxEl}、偏弱${minEl}，整体${isStrong ? '偏强' : '偏弱'}。`,
    tags: ['八字', dmWx + '命', dmYy + '干', isStrong ? '身强' : '身弱', result.mode === 'local-exact' ? '精确历法' : '近似历法'],
    sections: [
      { heading: '四柱', body: `年柱 ${p.year.stem}${p.year.branch}、月柱 ${p.month.stem}${p.month.branch}、日柱 ${p.day.stem}${p.day.branch}、时柱 ${p.hour.stem}${p.hour.branch}。` },
      { heading: '五行分布', body: `${elSummary}。最旺：${maxEl}(${maxVal})，最弱：${minEl}(${minVal})。` },
      { heading: '十神', body: (['year', 'month', 'day', 'hour'] as const).map((k) => `${PILLAR_CN[k]}柱${result.shishenList[k]}`).join('、') + '。' },
      { heading: '日主强弱', body: `日主${dm}为${dmYy}${dmWx}，五行总量${Object.values(els).reduce((s, v) => s + v, 0)}，判断为${isStrong ? '偏强' : '偏弱'}。此判断基于五行计数近似，仅供参考。` },
      { heading: '大运', body: result.luck.map((l) => `${l.ageStart}岁起 ${l.stem}${l.branch}(${l.stemWuxing})${l.startYear ? `（${l.startYear}-${l.endYear}）` : ''}`).join('；') + `。${result.luck.some((l) => l.startYear !== undefined) ? '按节气余气精确起运。' : '起运按3岁简化。'}` },
      { heading: '神煞', body: (result.shenSha.length ? result.shenSha.map((s) => `${s.name}(${s.branch}·${s.pillar})`).join('、') + '。' : '本命局未检出常见神煞。') + `（桃花/驿马/华盖/将星按${result.shenShaTrineSource === 'year' ? '年支' : '日支'}三合查）` },
      { heading: '边界说明', body: result.confidenceNote },
    ],
    sourceNotes: result.confidenceNote,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote, ...(result.mode === 'local-approx' ? ['未传入精确历法入口，月柱按节气近似'] : [])],
    evidence: {
      steps: [
        { key: 'settle', stage: '定盘', status: result.mode === 'local-exact' ? 'ok' : 'approx', inputs: { year: input.birth.year, month: input.birth.month, day: input.birth.day, hour: input.birth.hour }, result: pillarsStr, promptText: `按${result.mode === 'local-exact' ? '精确节气' : '近似节气'}排出四柱 ${pillarsStr}` },
        { key: 'elements', stage: '五行统计', status: 'ok', inputs: pillarsStr, result: elSummary, dependsOnStepKeys: ['settle'], promptText: `四柱五行计数 ${elSummary}` },
        { key: 'daymaster', stage: '日主判定', status: 'ok', inputs: { dm, dmWx, dmYy }, result: `${dm}${dmYy}${dmWx}`, dependsOnStepKeys: ['settle'], promptText: `日主为${dm}（${dmYy}${dmWx}）` },
        { key: 'luck', stage: '大运推算', status: result.luck.some((l) => l.startYear !== undefined) ? 'ok' : 'approx', inputs: { gender: input.birth.gender }, result: result.luck.map((l) => `${l.ageStart}岁起 ${l.stem}${l.branch}`).join('；'), dependsOnStepKeys: ['settle'], promptText: result.luck.some((l) => l.startYear !== undefined) ? '大运按节气余气精确起运' : '大运按3岁简化起运', limitation: result.luck.some((l) => l.startYear !== undefined) ? undefined : '起运年龄为简化3岁，非精确节令起运' },
      ],
      facts: [
        { level: '主证', title: `日主${dm}${dmYy}${dmWx}`, detail: `五行偏${isStrong ? '强' : '弱'}（${maxEl}${maxVal} vs ${minEl}${minVal}）`, source: '五行计数近似', tags: ['日主', '五行'] },
        { level: '主证', title: `四柱 ${pillarsStr}`, detail: `十神 ${['year', 'month', 'day', 'hour'].map((k) => `${PILLAR_CN[k]}${result.shishenList[k]}`).join(' ')}`, source: result.mode === 'local-exact' ? 'lunar-javascript 节气表' : '本地近似节气', tags: ['四柱'] },
        { level: '辅证', title: `神煞 ${result.shenSha.map((s) => s.name).join('、') || '无'}`, detail: result.shenSha.length ? result.shenSha.map((s) => `${s.name}(${s.branch}·${s.pillar})`).join('、') : '未检出常见神煞', source: '神煞规则表', tags: ['神煞'] },
        { level: '限制', title: '日主强弱为五行计数近似', detail: '非月令旺衰/格局判断，仅作参考', source: '引擎口径', tags: ['边界'] },
      ],
      limitations: ['日主强弱基于五行计数近似，非月令旺衰/格局/调候判断', '大运起运按3岁简化，非精确节令起运'],
    },
    result_meta: {
      engineVersion: result.mode,
      evidenceSchemaVersion: '0.1.0',
      algorithm: '四柱排盘',
      calculationConfig: { exactCalendar: input.birth.useExactCalendar !== false, shenShaTrineSource: input.shenShaTrineSource ?? 'year' },
    },
  };
}
