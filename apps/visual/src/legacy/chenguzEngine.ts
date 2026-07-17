/**
 * chenguzEngine — 袁天罡称骨算命
 *
 * 按出生年月日时（农历）查四柱骨重，总重对应称骨歌。
 * - 年骨重：按年支（生肖）
 * - 月骨重：按农历月（1-12）
 * - 日骨重：按农历日（1-30）
 * - 时骨重：按时支（子-亥）
 *
 * 复用 calcBaziEnveloped 取年支/时支干支；农历月日由 lunar-javascript Solar.getLunar() 取。
 * 骨重表 + 称骨歌为公开传统数据，内嵌。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { calcBaziEnveloped, type BaziBirth, type BaziResult } from './baziEngine';

// ─── 骨重单位：两、钱（1 两 = 10 钱）──
export interface BoneWeight {
  liang: number; // 两
  qian: number;  // 钱
}

export interface ChenguzInput {
  birth: BaziBirth;
  solar?: unknown;
}

export interface ChenguzResult {
  /** 四柱骨重 */
  yearBone: { branch: string; weight: BoneWeight; };
  monthBone: { lunarMonth: number; weight: BoneWeight; };
  dayBone: { lunarDay: number; weight: BoneWeight; };
  hourBone: { branch: string; weight: BoneWeight; };
  /** 总重 */
  total: BoneWeight;
  /** 总重文字（如「三两八钱」） */
  totalText: string;
  /** 称骨歌诀 */
  song: string;
  /** 歌诀白话解读 */
  interpretation: string;
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

// ─── 年骨重表（按年支/生肖）单位：钱 ──
// 子鼠/丑牛/寅虎/卯兔/辰龙/巳蛇/午马/未羊/申猴/酉鸡/戌狗/亥猪
const YEAR_BONE: Record<string, BoneWeight> = {
  子: { liang: 1, qian: 6 }, 丑: { liang: 0, qian: 6 },
  寅: { liang: 0, qian: 7 }, 卯: { liang: 1, qian: 9 },
  辰: { liang: 1, qian: 2 }, 巳: { liang: 0, qian: 5 },
  午: { liang: 1, qian: 9 }, 未: { liang: 0, qian: 6 },
  申: { liang: 0, qian: 8 }, 酉: { liang: 0, qian: 5 },
  戌: { liang: 0, qian: 9 }, 亥: { liang: 0, qian: 9 },
};

// ─── 月骨重表（农历月 1-12）单位：钱 ──
const MONTH_BONE: Record<number, BoneWeight> = {
  1: { liang: 0, qian: 6 }, 2: { liang: 0, qian: 7 }, 3: { liang: 1, qian: 8 },
  4: { liang: 0, qian: 9 }, 5: { liang: 0, qian: 5 }, 6: { liang: 1, qian: 6 },
  7: { liang: 0, qian: 9 }, 8: { liang: 1, qian: 5 }, 9: { liang: 1, qian: 8 },
  10: { liang: 0, qian: 8 }, 11: { liang: 0, qian: 9 }, 12: { liang: 0, qian: 5 },
};

// ─── 日骨重表（农历日 1-30）单位：钱 ──
const DAY_BONE: Record<number, BoneWeight> = {
  1: { liang: 0, qian: 5 }, 2: { liang: 1, qian: 0 }, 3: { liang: 0, qian: 8 },
  4: { liang: 1, qian: 5 }, 5: { liang: 1, qian: 6 }, 6: { liang: 1, qian: 5 },
  7: { liang: 0, qian: 8 }, 8: { liang: 1, qian: 6 }, 9: { liang: 0, qian: 8 },
  10: { liang: 1, qian: 6 }, 11: { liang: 0, qian: 9 }, 12: { liang: 1, qian: 7 },
  13: { liang: 0, qian: 8 }, 14: { liang: 1, qian: 7 }, 15: { liang: 1, qian: 0 },
  16: { liang: 0, qian: 8 }, 17: { liang: 0, qian: 9 }, 18: { liang: 1, qian: 8 },
  19: { liang: 0, qian: 5 }, 20: { liang: 1, qian: 5 }, 21: { liang: 1, qian: 0 },
  22: { liang: 0, qian: 9 }, 23: { liang: 0, qian: 8 }, 24: { liang: 0, qian: 9 },
  25: { liang: 1, qian: 5 }, 26: { liang: 1, qian: 8 }, 27: { liang: 0, qian: 7 },
  28: { liang: 0, qian: 8 }, 29: { liang: 1, qian: 6 }, 30: { liang: 0, qian: 6 },
};

// ─── 时骨重表（按时支）单位：钱 ──
const HOUR_BONE: Record<string, BoneWeight> = {
  子: { liang: 1, qian: 6 }, 丑: { liang: 0, qian: 6 },
  寅: { liang: 0, qian: 7 }, 卯: { liang: 1, qian: 0 },
  辰: { liang: 0, qian: 9 }, 巳: { liang: 1, qian: 6 },
  午: { liang: 1, qian: 0 }, 未: { liang: 0, qian: 8 },
  申: { liang: 0, qian: 8 }, 酉: { liang: 0, qian: 9 },
  戌: { liang: 0, qian: 6 }, 亥: { liang: 0, qian: 6 },
};

// ─── 称骨歌（按总重钱数索引，1 两=10 钱，2两1=21 钱 … 7两1=71 钱）──
// key 为总钱数，value 为歌诀
const SONG: Record<number, string> = {
  21: '短命非业谓大空，平生灾难事重重，凶祸频临陷逆境，终世困苦事不成。',
  22: '身寒骨冷苦伶仃，此命推来行乞人，碌碌碌碌无生成，终朝打混过平生。',
  23: '此命推来骨格轻，求谋作事事难成，妻儿兄弟应难许，别处他乡作散人。',
  24: '此命推来福禄无，门庭困苦总难营，妻儿无靠常啼哭，一生一世大空空。',
  25: '此命推来事不成，妻儿兄弟未能名，独身单影无依靠，终世受苦不如人。',
  26: '一生作事少商量，难靠祖宗作主张，独马单枪空作去，早年晚岁总无长。',
  27: '一生做事少商量，难靠祖宗作主张，独脚单枪空作去，早年晚岁总无长。',
  28: '一身作事少商量，妻儿难靠无依靠，独脚单枪空作去，终世受苦不如人。',
  29: '初年不及限亨通，劳劳作事尽皆空，苦心竭力成家计，那堪不久被风空。',
  30: '劳劳作事日更新，赤手成家自立身，须知有福天然至，提携一切不愁人。',
  31: '忙忙碌碌苦中求，何日云开见日现，难得祖基家可立，中年衣食渐无忧。',
  32: '初年运遇事难亨，劳劳作事尽皆空，半世自如流水去，后来运到始得金。',
  33: '早年做事事难成，百年勤劳劳空过，半世自如流水去，晚年运到始得金。',
  34: '此命福气果如何，僧道门中衣禄多，离祖出家方得稳，终朝拜佛念弥陀。',
  35: '生平福量不周全，祖业根基觉少传，营谋生涯宜守旧，时来福禄自双全。',
  36: '不须忙碌过平生，独自成家福不轻，早有福星常照命，任君行往百般成。',
  37: '此命终身运不通，劳劳作事尽皆空，苦心竭力成家计，到的那时在梦中。',
  38: '一生骨肉最清高，早入黉门姓名标，待看年将三十六，蓝衫脱去换红袍。',
  39: '此命推来福不轻，自成自立显门庭，从来富贵人钦敬，使婢差奴过一生。',
  40: '为禄为食有盈余，命中注定并不虚，平生福量多通达，时来福禄自双全。',
  41: '此命推来事不同，为人能干异凡庸，中年还有逍遥福，不比前时运未通。',
  42: '得宽怀处且宽怀，何必双眉皱不开，若使中年命运济，那时名利一起来。',
  43: '为人心性最聪明，作事轩昂近贵人，衣禄一生天数定，不须劳碌是丰享。',
  44: '万事由天莫强求，何须苦苦怨他人，中年福禄虽云有，寿数登时五十零。',
  45: '名利推求竭力图，朝朝役役与时违，不知否泰皆由命，只恐荣华不到头。',
  46: '东西南北尽皆通，出姓名扬满市中，走马随从无阻隔，添人进口百事通。',
  47: '此命推来旺末年，妻荣子贵自怡然，平生原有滔滔福，财源滚滚似水流。',
  48: '幼年行道莫随风，初年不及限亨通，劳劳作事尽皆空，外行期满始得金。',
  49: '此命推来福不轻，一生清贵显门庭，妻儿定然皆成对，业顺兴旺自成群。',
  50: '为名为利终日劳，中年福禄也多遭，老来稍可宽怀抱，处事从容是英豪。',
  51: '一世荣华事事通，不须劳碌自亨通，平生衣禄丰盈足，一世清闲处处通。',
  52: '一世享荣华，自然有家业，亲朋钦敬，妻儿终身靠。',
  53: '此格推来气象真，兴家发达在其中，一生福禄源源至，晚景荣华大不同。',
  54: '此命推来厚且清，诗书满腹看功成，丰衣足食自然稳，正是人间福禄翁。',
  55: '走马扬鞭争名利，少年作事有筹谋，一朝福禄源源至，富贵荣华显六亲。',
  56: '此格推来福泽宏，兴家立业在其中，一生衣禄安排定，独脚红旗树北风。',
  57: '福禄盈门万事通，心想事成百事亨，平生福量多通达，一世荣华出众人。',
  58: '富贵名誉享天恩，朝廷重用有声名，一身荣华显六亲，风声远播四海闻。',
  59: '细推此命福非轻，富贵荣华孰与争，定有玉堂金榜客，龙阁高登第一人。',
  60: '一生清贵显门庭，妻儿定然皆成对，业顺兴旺自成群，平生福禄自天定。',
  61: '不作朝中金榜客，定为世上大财翁，聪明天赋经书熟，名播千秋四海闻。',
  62: '此命生来福最宏，人间福禄自天定，妻儿定然皆成对，一世荣华出众人。',
  63: '主人本是多富贵，定有金榜把名扬，定有玉堂金榜客，龙阁高登第一人。',
  64: '此命生来福最宏，人间福禄自天定，妻儿定然皆成对，一世荣华出众人。',
  65: '细推此命福非轻，定是玉堂金榜客，龙阁高登第一人，富贵荣华显六亲。',
  66: '此格推来福最强，定为主一国之长，妻儿定然皆成对，一世荣华出众人。',
  67: '此命生来福自宏，定是朝中一栋梁，妻儿定然皆成对，一世荣华出众人。',
  68: '富贵荣华大不同，妻儿定然皆成对，鳞层次第出公卿，风声远播四海闻。',
  69: '细推此命福最强，定为主一国之长，妻儿定然皆成对，一世荣华出众人。',
  70: '此命生来福最强，定是朝中一栋梁，妻儿定然皆成对，一世荣华出众人。',
  71: '此命生来福最强，定是世间一奇人，妻儿定然皆成对，一世荣华出众人。',
};

// ─── 辅助 ─────────────────────────────────────────────

/** 数字 → 中文两钱（如 3 两 8 钱） */
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function boneToText(b: BoneWeight): string {
  const liangStr = b.liang < 10 ? CN_NUM[b.liang] : String(b.liang);
  return `${liangStr}两${b.qian === 0 ? '' : CN_NUM[b.qian] + '钱'}`;
}

/** 总重（两+钱转成总钱数） */
function totalQian(b: BoneWeight): number {
  return b.liang * 10 + b.qian;
}

function addBone(a: BoneWeight, b: BoneWeight): BoneWeight {
  const totalQ = a.liang * 10 + a.qian + b.liang * 10 + b.qian;
  return { liang: Math.floor(totalQ / 10), qian: totalQ % 10 };
}

/** 总重 → tone */
function toneFromTotal(total: BoneWeight): Tone {
  const q = totalQian(total);
  if (q >= 50) return '吉';
  if (q < 30) return '凶';
  return '中';
}

/** 取农历月日（从 lunar-javascript Solar.getLunar()） */
function getLunarMonthDay(birth: BaziBirth, solar: unknown): { month: number; day: number } | null {
  try {
    const s = solar as {
      fromYmdHms?: (y: number, mo: number, d: number, h: number, mi: number, sec: number) => { getLunar(): unknown };
      fromYmd?: (y: number, mo: number, d: number) => { getLunar(): unknown };
    };
    const solarObj = s.fromYmdHms
      ? s.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute ?? 0, 0)
      : s.fromYmd?.(birth.year, birth.month, birth.day);
    if (!solarObj) return null;
    const lunar = solarObj.getLunar() as {
      getMonthInChinese?: () => string;
      getDayInChinese?: () => string;
    };
    // 农历月日为中文数字，需转数字
    const monthStr = lunar.getMonthInChinese?.() ?? ''; // 如 "正" "二" "腊"
    const dayStr = lunar.getDayInChinese?.() ?? ''; // 如 "初一" "二十"
    const month = chineseMonthToNum(monthStr);
    const day = chineseDayToNum(dayStr);
    if (month < 1 || day < 1) return null;
    return { month, day };
  } catch {
    return null;
  }
}

const MONTH_CN: Record<string, number> = { 正: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 腊: 12, 十二: 12 };
function chineseMonthToNum(s: string): number {
  return MONTH_CN[s] ?? 0;
}

function chineseDayToNum(s: string): number {
  // lunar-javascript getDayInChinese 返回如 "初一"…"三十"
  const map: Record<string, number> = {
   初一:1,初二:2,初三:3,初四:4,初五:5,初六:6,初七:7,初八:8,初九:9,初十:10,
   十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,二十:20,
   廿一:21,廿二:22,廿三:23,廿四:24,廿五:25,廿六:26,廿七:27,廿八:28,廿九:29,三十:30,
  };
  return map[s] ?? 0;
}

// ─── 主函数 ─────────────────────────────────────────────

export function calcChenguz(input: ChenguzInput): ToolEnvelope<ChenguzResult> {
  const { birth, solar } = input;

  // 取八字四柱（年支、时支）
  const baziEnv = calcBaziEnveloped({ birth, solar: (solar ?? null) as never });
  const bazi = baziEnv.data as BaziResult;
  const yearBranch = bazi.pillars.year.branch; // 如 "午"
  const hourBranch = bazi.pillars.hour.branch;

  // 取农历月日
  const lunarMD = getLunarMonthDay(birth, solar);
  const lunarMonth = lunarMD?.month ?? birth.month;
  const lunarDay = lunarMD?.day ?? birth.day;

  // 四柱骨重
  const yearBoneW = YEAR_BONE[yearBranch] ?? { liang: 0, qian: 0 };
  const monthBoneW = MONTH_BONE[lunarMonth] ?? { liang: 0, qian: 0 };
  const dayBoneW = DAY_BONE[lunarDay] ?? { liang: 0, qian: 0 };
  const hourBoneW = HOUR_BONE[hourBranch] ?? { liang: 0, qian: 0 };

  const total = addBone(addBone(addBone(yearBoneW, monthBoneW), dayBoneW), hourBoneW);
  const totalText = boneToText(total);
  const totalQ = totalQian(total);
  const song = SONG[totalQ] ?? '称骨歌未收录此重量，请核对骨重计算。';
  const tone = toneFromTotal(total);

  // 白话解读（按重量区间概括）
  const interpretation = interpretTotal(total, totalText);

  const synthesis = `称骨算命：年(${yearBranch})${boneToText(yearBoneW)} + 月(农历${lunarMonth}月)${boneToText(monthBoneW)} + 日(农历${lunarDay})${boneToText(dayBoneW)} + 时(${hourBranch})${boneToText(hourBoneW)} = 总重${totalText}。${song}`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['称骨', totalText, `年${yearBranch}`, `时${hourBranch}`],
    sections: [
      { heading: '四柱骨重', body: `年(${yearBranch})：${boneToText(yearBoneW)}；月(农历${lunarMonth}月)：${boneToText(monthBoneW)}；日(农历${lunarDay})：${boneToText(dayBoneW)}；时(${hourBranch})：${boneToText(hourBoneW)}。` },
      { heading: '总骨重', body: `总重${totalText}（${totalQ}钱）。${interpretation}` },
      { heading: '称骨歌', body: song },
    ],
  };

  const result: ChenguzResult = {
    yearBone: { branch: yearBranch, weight: yearBoneW },
    monthBone: { lunarMonth, weight: monthBoneW },
    dayBone: { lunarDay, weight: dayBoneW },
    hourBone: { branch: hourBranch, weight: hourBoneW },
    total,
    totalText,
    song,
    interpretation,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'chenguzEngine',
    mode: lunarMD ? 'local-exact' : 'local-approx',
    confidenceNote: '骨重表/称骨歌为传统固定规则；农历月日依赖 lunar-javascript',
  };

  const warnings: string[] = [];
  if (!lunarMD) warnings.push('农历月日取值失败，已按输入月日近似计算');

  return {
    ok: true,
    tool: 'calc_chenguz',
    version: '1.0.0',
    input_normalized: { birthYear: birth.year, yearBranch, hourBranch, lunarMonth, lunarDay },
    data: result,
    summary: [synthesis],
    warnings,
  };
}

function interpretTotal(total: BoneWeight, totalText: string): string {
  const q = totalQian(total);
  if (q >= 60) return `${totalText}，骨重极厚，命格尊贵，古论王侯将相之命，今世多为非凡成就、显达一方之人。`;
  if (q >= 50) return `${totalText}，骨重厚实，福禄丰盈，衣食无忧，事业有成，晚年享福。`;
  if (q >= 40) return `${totalText}，骨重中等偏上，劳碌有成，中年渐顺，需勤勉得福。`;
  if (q >= 30) return `${totalText}，骨重中等，平生多劳，先难后易，靠自身勤恳立家。`;
  return `${totalText}，骨重较轻，平生多波折，宜安分守己、积德行善以转福。`;
}

/** 别名：enveloped 版本（同 calcChenguz，保持命名一致性） */
export function calcChenguzEnveloped(input: ChenguzInput): ToolEnvelope<ChenguzResult> {
  return calcChenguz(input);
}
