/**
 * almanacData — 基于内置 lunar-javascript 的真实每日黄历数据。
 *
 * 替代旧 AlmanacWorkspace 的 seed 伪造数据，统一走 6tail/lunar-javascript
 * 引擎：干支、宜忌、彭祖百忌、吉神凶煞、神位方位、冲煞、时辰吉凶、
 * 纳音星宿等均为真实历法推算。引擎未加载时返回 null，由 UI 显示降级提示。
 */

export interface AlmanacTimeHour {
  /** 时辰干支，如「壬子」 */
  ganZhi: string;
  /** 时段名，如「子时」 */
  label: string;
  /** 天神名，如「天刑」 */
  tianShen: string;
  /** 黄道/黑道 */
  tianShenType: string;
  /** 吉 / 凶 */
  luck: string;
  yi: string[];
  ji: string[];
}

export interface AlmanacData {
  /** 公历日期，如「2026年7月8日」 */
  solarDate: string;
  /** 农历日期，如「农历六月初十四」 */
  lunarDate: string;
  /** 年柱 */
  yearGanZhi: string;
  /** 月柱 */
  monthGanZhi: string;
  /** 日柱 */
  dayGanZhi: string;
  /** 生肖 */
  zodiac: string;
  /** 节气（若当日为节气点） */
  jieQi?: string;
  /** 节日 */
  festivals: string[];
  /** 日纳音，如「杨柳木」 */
  dayNaYin: string;
  /** 二十八星宿 */
  dayXiu: string;
  /** 星宿歌诀 */
  dayXiuSong: string;
  /** 日天神，如「玄武」 */
  dayTianShen: string;
  /** 黄道/黑道 */
  dayTianShenType: string;
  /** 宜 */
  yi: string[];
  /** 忌 */
  ji: string[];
  /** 吉神宜趋 */
  jiShen: string[];
  /** 凶煞宜忌 */
  xiongSha: string[];
  /** 彭祖百忌 */
  pengZu: string;
  /** 喜神方位 */
  xiPosition: string;
  /** 福神方位 */
  fuPosition: string;
  /** 财神方位 */
  caiPosition: string;
  /** 阳贵神方位 */
  yangGuiPosition: string;
  /** 阴贵神方位 */
  yinGuiPosition: string;
  /** 冲煞描述 */
  chong: string;
  /** 煞方 */
  sha: string;
  /** 时辰吉凶 */
  hours: AlmanacTimeHour[];
  /** 数据来源说明 */
  confidenceNote: string;
}

interface LunarLike {
  getYearInGanZhi(): string;
  getMonthInGanZhi(): string;
  getDayInGanZhi(): string;
  getYearShengXiao(): string;
  getDayYi(): string[];
  getDayJi(): string[];
  getDayJiShen(): string[];
  getDayXiongSha(): string[];
  getPengZuGan(): string;
  getPengZuZhi(): string;
  getDayNaYin(): string;
  getXiu(): string;
  getXiuSong(): string;
  getDayTianShen(): string;
  getDayTianShenType(): string;
  getDayPositionXiDesc(): string;
  getDayPositionFuDesc(): string;
  getDayPositionCaiDesc(): string;
  getDayPositionYangGuiDesc(): string;
  getDayPositionYinGuiDesc(): string;
  getDayChongDesc(): string;
  getDaySha(): string;
  getJieQi?(): string;
  getFestivals(): string[];
  getTimes(): LunarTimeLike[];
  getDayInChinese(): string;
  getMonthInChinese(): string;
}

interface LunarTimeLike {
  getGanZhi(): string;
  getZhi(): string;
  getTianShen(): string;
  getTianShenType(): string;
  getTianShenLuck(): string;
  getYi(): string[];
  getJi(): string[];
}

interface SolarLike {
  fromYmd(year: number, month: number, day: number): { getLunar(): LunarLike };
}

interface LegacyWindowWithLunar extends Window {
  Solar?: SolarLike;
}

const ZHI_LABELS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 时辰地支 → 时段名（含时辰范围） */
function hourLabel(zhi: string): string {
  const map: Record<string, string> = {
    子: '子时 23-1', 丑: '丑时 1-3', 寅: '寅时 3-5', 卯: '卯时 5-7',
    辰: '辰时 7-9', 巳: '巳时 9-11', 午: '午时 11-13', 未: '未时 13-15',
    申: '申时 15-17', 酉: '酉时 17-19', 戌: '戌时 19-21', 亥: '亥时 21-23',
  };
  return map[zhi] ?? zhi;
}

/**
 * 取指定公历日期的黄历数据。
 * @param dateStr 公历日期字符串 yyyy-mm-dd
 * @param solar 可选 lunar-javascript Solar 入口；传入时走纯 TS 路径（A 类，MCP 可直接 import lunar-javascript 的 ESM 版传入）。
 *              未传时回退读 window.Solar（旧 JS 暴露），两者皆不可用返回 null。
 */
export function getAlmanacData(dateStr: string, solar?: SolarLike | null): AlmanacData | null {
  const solarEntry = solar ?? (() => {
    try {
      if (typeof window !== 'undefined') return (window as LegacyWindowWithLunar).Solar ?? null;
    } catch {
      /* window 不可用 */
    }
    return null;
  })();
  if (!solarEntry) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;

  let lunar: LunarLike;
  try {
    lunar = solarEntry.fromYmd(year, month, day).getLunar();
  } catch {
    return null;
  }

  try {
    const times = lunar.getTimes() || [];
    const hours: AlmanacTimeHour[] = times.map((t) => {
      const zhi = t.getZhi();
      return {
        ganZhi: t.getGanZhi(),
        label: hourLabel(zhi in ZHI_LABELS ? zhi : zhi),
        tianShen: t.getTianShen(),
        tianShenType: t.getTianShenType(),
        luck: t.getTianShenLuck(),
        yi: t.getYi() || [],
        ji: t.getJi() || [],
      };
    });

    let jieQi: string | undefined;
    if (typeof lunar.getJieQi === 'function') {
      jieQi = lunar.getJieQi() || undefined;
    }

    return {
      solarDate: `${year}年${month}月${day}日`,
      lunarDate: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      yearGanZhi: lunar.getYearInGanZhi(),
      monthGanZhi: lunar.getMonthInGanZhi(),
      dayGanZhi: lunar.getDayInGanZhi(),
      zodiac: lunar.getYearShengXiao(),
      jieQi,
      festivals: lunar.getFestivals() || [],
      dayNaYin: lunar.getDayNaYin(),
      dayXiu: lunar.getXiu(),
      dayXiuSong: lunar.getXiuSong(),
      dayTianShen: lunar.getDayTianShen(),
      dayTianShenType: lunar.getDayTianShenType(),
      yi: lunar.getDayYi() || [],
      ji: lunar.getDayJi() || [],
      jiShen: lunar.getDayJiShen() || [],
      xiongSha: lunar.getDayXiongSha() || [],
      pengZu: `${lunar.getPengZuGan()} ${lunar.getPengZuZhi()}`,
      xiPosition: lunar.getDayPositionXiDesc(),
      fuPosition: lunar.getDayPositionFuDesc(),
      caiPosition: lunar.getDayPositionCaiDesc(),
      yangGuiPosition: lunar.getDayPositionYangGuiDesc(),
      yinGuiPosition: lunar.getDayPositionYinGuiDesc(),
      chong: lunar.getDayChongDesc(),
      sha: lunar.getDaySha(),
      hours,
      confidenceNote: '数据由内置 6tail/lunar-javascript 真实历法推算；宜忌为民俗参考，不作为决策依据。',
    };
  } catch {
    // 任一 getter 抛错时降级，避免整页黑屏
    return null;
  }
}
