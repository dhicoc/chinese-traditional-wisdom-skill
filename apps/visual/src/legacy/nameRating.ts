/**
 * nameRating — 姓名五维评分（fate P3，简化自建版）。
 *
 * 参考 babyname/fate 的 `internal/rating/rating.go` 五维框架与权重，
 * 但各维度用本项目已有数据计算（非 fate 的 ent.Character/chronosfate 口径）：
 * - 五格数理 30%：5 格吉凶计分（吉100/半吉60/凶20）
 * - 三才配置 15%：三才吉凶（大吉100/吉80/半吉半凶50/凶20）
 * - 五行平衡 25%：五行分布均匀度（标准差越小越高）
 * - 字义五行 20%：字元字义五行多样性 + 未收录字扣分
 * - 生肖契合 10%：出生年生肖五行与名字字义五行相生关系
 *
 * 等级表对齐 fate scoreToGrade：≥90上上 / ≥80上吉 / ≥70中吉 / ≥60中平 / ≥50中下 / <50下下。
 * 明确标注「简化自建口径，非 fate 令分数体系」。
 */

import type { NameAnalysis } from './nameWuxing';
import zodiacNameChars from './zodiacNameChars.json';

export interface NameRatingResult {
  totalScore: number;
  grade: string;
  dimensions: {
    name: string;
    score: number;
    weight: number;
    detail: string;
  }[];
  confidenceNote: string;
}

/** 五格吉凶 → 分数 */
function luckToScore(luck: string): number {
  if (luck.includes('大吉')) return 100;
  if (luck === '吉') return 90;
  if (luck.includes('半吉')) return 60;
  if (luck === '凶') return 20;
  if (luck.includes('凶')) return 25;
  return 50;
}

/** 三才吉凶 → 分数 */
function sancaiLuckToScore(luck: string): number {
  if (luck.includes('大吉')) return 100;
  if (luck === '吉') return 80;
  if (luck.includes('半')) return 50;
  if (luck.includes('凶')) return 20;
  return 50;
}

/** 五行分布均匀度 → 0-100 分（越均匀越高） */
function balanceScore(balance: Record<string, number>): number {
  const vals = Object.values(balance);
  const total = vals.reduce((s, v) => s + v, 0);
  if (total === 0) return 50;
  const avg = total / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const std = Math.sqrt(variance);
  // std 越小越均匀；理论上 std 最大约 total，归一化
  const normalized = Math.max(0, 1 - std / Math.max(1, total));
  return Math.round(normalized * 100);
}

const SHENG = ['木', '火', '土', '金', '水'];
const SHENG_MAP: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE_MAP: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

/** 生肖 → 五行 */
const ZODIAC_WUXING: Record<string, string> = {
  鼠: '水', 牛: '土', 虎: '木', 兔: '木', 龙: '土', 蛇: '火',
  马: '火', 羊: '土', 猴: '金', 鸡: '金', 狗: '土', 猪: '水',
};

const ZODIAC_NAME_CHARS = zodiacNameChars as Record<string, { xi: string; ji: string }>;

/**
 * 生肖契合度（fate 真实喜忌表）：名字字在生肖忌用字表中扣分，
 * 在喜用字表中加分；无喜用表时回退五行相生近似。
 */
function zodiacScore(birthYear: number, chars: { char: string; meaningWuxing: string }[]): number {
  const zodiacs = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
  const zodiac = zodiacs[((birthYear - 4) % 12 + 12) % 12];
  const zwx = ZODIAC_WUXING[zodiac] ?? '';
  if (!zwx) return 50;

  const zodiacData = ZODIAC_NAME_CHARS[zodiac];
  const xiSet = zodiacData?.xi ? new Set(zodiacData.xi.split(/[\s,，]+/).filter(Boolean)) : new Set<string>();
  const jiSet = zodiacData?.ji ? new Set(zodiacData.ji.split(/[\s,，]+/).filter(Boolean)) : new Set<string>();

  let total = 0;
  let counted = 0;
  for (const c of chars) {
    let s = 60; // 基础分
    if (xiSet.has(c.char)) s += 40; // 喜用字
    if (jiSet.has(c.char)) s -= 40; // 忌用字
    // 无喜忌命中时，用五行相生近似补充
    if (!xiSet.has(c.char) && !jiSet.has(c.char) && c.meaningWuxing) {
      if (c.meaningWuxing === zwx) s = 80;
      else if (SHENG_MAP[zwx] === c.meaningWuxing || SHENG_MAP[c.meaningWuxing] === zwx) s = 90;
      else if (KE_MAP[zwx] === c.meaningWuxing || KE_MAP[c.meaningWuxing] === zwx) s = 40;
    }
    total += Math.max(0, Math.min(100, s));
    counted++;
  }
  return counted > 0 ? Math.round(total / counted) : 50;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return '上上';
  if (score >= 80) return '上吉';
  if (score >= 70) return '中吉';
  if (score >= 60) return '中平';
  if (score >= 50) return '中下';
  return '下下';
}

/**
 * 计算姓名五维评分。
 * @param analysis analyzeName 的结果
 * @param birthYear 出生年（用于生肖契合度），可选
 */
export function calcNameRating(analysis: NameAnalysis, birthYear?: number): NameRatingResult {
  // 1. 五格数理 30%
  const wugeScores = analysis.wuGeEntries.map((e) => luckToScore(e.luck));
  const wugeAvg = wugeScores.reduce((s, v) => s + v, 0) / wugeScores.length;
  const wugeScore = Math.round(wugeAvg);
  const wugeDetail = analysis.wuGeEntries
    .map((e) => `${e.name}${e.value}(${e.luck})`)
    .join('、');

  // 2. 三才配置 15%
  const sancaiScore = sancaiLuckToScore(analysis.sanCai.luck);
  const sancaiDetail = `${analysis.sanCai.config} · ${analysis.sanCai.luck}`;

  // 3. 五行平衡 25%
  const balanceSc = balanceScore(analysis.wuxingBalance);
  const balanceDetail = Object.entries(analysis.wuxingBalance)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}${v}`)
    .join('、');

  // 4. 字义五行 20%
  const allChars = [...analysis.surnameChars, ...analysis.givenChars];
  const meaningWxs = allChars.map((c) => c.meaningWuxing).filter(Boolean);
  const unrecordedCount = allChars.filter((c) => c.estimated).length;
  const diversity = new Set(meaningWxs).size;
  let meaningScore = Math.min(100, 50 + diversity * 20);
  if (unrecordedCount > 0) meaningScore -= unrecordedCount * 15;
  meaningScore = Math.max(0, meaningScore);
  const meaningDetail = `${meaningWxs.length}/${allChars.length} 字有字义五行${
    unrecordedCount > 0 ? `，${unrecordedCount} 字未收录扣分` : ''
  }`;

  // 5. 生肖契合 10%
  const zodiacSc = birthYear ? zodiacScore(birthYear, allChars) : 50;
  const zodiacDetail = birthYear ? `基于出生年生肖五行与字义五行相生关系` : '未提供出生年，按中性分';

  const dimensions = [
    { name: '五格数理', score: wugeScore, weight: 0.3, detail: wugeDetail },
    { name: '三才配置', score: sancaiScore, weight: 0.15, detail: sancaiDetail },
    { name: '五行平衡', score: balanceSc, weight: 0.25, detail: balanceDetail },
    { name: '字义五行', score: meaningScore, weight: 0.2, detail: meaningDetail },
    { name: '生肖契合', score: zodiacSc, weight: 0.1, detail: zodiacDetail },
  ];

  const totalScore = Math.round(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0),
  );

  return {
    totalScore,
    grade: scoreToGrade(totalScore),
    dimensions,
    confidenceNote:
      '五维评分基于本项目已有数据简化计算（五格30%+三才15%+五行平衡25%+字义五行20%+生肖契合10%），非 fate 令分数体系口径，仅供参考。',
  };
}
