/**
 * ichingTexts — 文王六十四卦的规范索引、原文与关系计算。
 *
 * 原文数据来自 kentang2017/kintaiyi（MIT）的 data.pkl「易經卦爻詳解」字段，
 * 每卦含卦辞、初爻至上爻六条爻辞和彖传。卦序、上下卦、爻形、Unicode
 * 与错综互变关系均由本地 TypeScript 模型确定，不交由模型推演。
 */

import texts from './ichingTexts.json';

type HexagramTexts = Record<string, string>;
export type YaoPolarity = 'yin' | 'yang';
export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

export interface TrigramDefinition {
  name: TrigramName;
  traditionalName: string;
  nature: string;
  traditionalNature: string;
  linesBottomUp: readonly [YaoPolarity, YaoPolarity, YaoPolarity];
}

export const TRIGRAM_ORDER: readonly TrigramName[] = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export const TRIGRAMS: Readonly<Record<TrigramName, TrigramDefinition>> = {
  乾: { name: '乾', traditionalName: '乾', nature: '天', traditionalNature: '天', linesBottomUp: ['yang', 'yang', 'yang'] },
  兑: { name: '兑', traditionalName: '兌', nature: '泽', traditionalNature: '澤', linesBottomUp: ['yang', 'yang', 'yin'] },
  离: { name: '离', traditionalName: '離', nature: '火', traditionalNature: '火', linesBottomUp: ['yang', 'yin', 'yang'] },
  震: { name: '震', traditionalName: '震', nature: '雷', traditionalNature: '雷', linesBottomUp: ['yang', 'yin', 'yin'] },
  巽: { name: '巽', traditionalName: '巽', nature: '风', traditionalNature: '風', linesBottomUp: ['yin', 'yang', 'yang'] },
  坎: { name: '坎', traditionalName: '坎', nature: '水', traditionalNature: '水', linesBottomUp: ['yin', 'yang', 'yin'] },
  艮: { name: '艮', traditionalName: '艮', nature: '山', traditionalNature: '山', linesBottomUp: ['yin', 'yin', 'yang'] },
  坤: { name: '坤', traditionalName: '坤', nature: '地', traditionalNature: '地', linesBottomUp: ['yin', 'yin', 'yin'] },
};

const TEXTS = texts as Record<string, HexagramTexts>;

const SIMPLIFY: Record<string, string> = {
  乾: '乾', 坤: '坤', 屯: '屯', 蒙: '蒙', 需: '需', 訟: '讼',
  師: '师', 比: '比', 小畜: '小畜', 履: '履', 泰: '泰', 否: '否',
  同人: '同人', 大有: '大有', 謙: '谦', 豫: '豫', 隨: '随', 蠱: '蛊',
  臨: '临', 觀: '观', 噬嗑: '噬嗑', 賁: '贲', 剝: '剥', 復: '复',
  无妄: '无妄', 無妄: '无妄', 大畜: '大畜', 頤: '颐', 大過: '大过', 坎: '坎', 離: '离',
  咸: '咸', 恆: '恒', 遯: '遁', 大壯: '大壮', 晉: '晋', 明夷: '明夷',
  家人: '家人', 睽: '睽', 蹇: '蹇', 解: '解', 損: '损', 益: '益',
  夬: '夬', 姤: '姤', 萃: '萃', 升: '升', 困: '困', 井: '井',
  革: '革', 鼎: '鼎', 震: '震', 艮: '艮', 漸: '渐', 歸妹: '归妹',
  豐: '丰', 旅: '旅', 巽: '巽', 兌: '兑', 渙: '涣', 節: '节',
  中孚: '中孚', 小過: '小过', 既濟: '既济', 未濟: '未济',
};

const HEXAGRAM_LAYOUT: ReadonlyArray<readonly [string, TrigramName, TrigramName]> = [
  ['乾', '乾', '乾'], ['坤', '坤', '坤'], ['屯', '坎', '震'], ['蒙', '艮', '坎'], ['需', '坎', '乾'], ['訟', '乾', '坎'], ['師', '坤', '坎'], ['比', '坎', '坤'],
  ['小畜', '巽', '乾'], ['履', '乾', '兑'], ['泰', '坤', '乾'], ['否', '乾', '坤'], ['同人', '乾', '离'], ['大有', '离', '乾'], ['謙', '坤', '艮'], ['豫', '震', '坤'],
  ['隨', '兑', '震'], ['蠱', '艮', '巽'], ['臨', '坤', '兑'], ['觀', '巽', '坤'], ['噬嗑', '离', '震'], ['賁', '艮', '离'], ['剝', '艮', '坤'], ['復', '坤', '震'],
  ['无妄', '乾', '震'], ['大畜', '艮', '乾'], ['頤', '艮', '震'], ['大過', '兑', '巽'], ['坎', '坎', '坎'], ['離', '离', '离'], ['咸', '兑', '艮'], ['恆', '震', '巽'],
  ['遯', '乾', '艮'], ['大壯', '震', '乾'], ['晉', '离', '坤'], ['明夷', '坤', '离'], ['家人', '巽', '离'], ['睽', '离', '兑'], ['蹇', '坎', '艮'], ['解', '震', '坎'],
  ['損', '艮', '兑'], ['益', '巽', '震'], ['夬', '兑', '乾'], ['姤', '乾', '巽'], ['萃', '兑', '坤'], ['升', '坤', '巽'], ['困', '兑', '坎'], ['井', '坎', '巽'],
  ['革', '兑', '离'], ['鼎', '离', '巽'], ['震', '震', '震'], ['艮', '艮', '艮'], ['漸', '巽', '艮'], ['歸妹', '震', '兑'], ['豐', '震', '离'], ['旅', '离', '艮'],
  ['巽', '巽', '巽'], ['兌', '兑', '兑'], ['渙', '巽', '坎'], ['節', '坎', '兑'], ['中孚', '巽', '兑'], ['小過', '震', '艮'], ['既濟', '坎', '离'], ['未濟', '离', '坎'],
];

export interface HexagramClassicalText {
  name: string;
  guaCi: string;
  yaoCi: string[];
  tuanZhuan: string;
}

export interface CanonicalHexagram extends HexagramClassicalText {
  number: number;
  traditionalName: string;
  fullName: string;
  traditionalFullName: string;
  upperTrigram: TrigramName;
  lowerTrigram: TrigramName;
  upperNature: string;
  lowerNature: string;
  linesBottomUp: YaoPolarity[];
  symbol: string;
  codePoint: string;
  aliases: string[];
}

export interface HexagramRelationSet {
  cuo: CanonicalHexagram;
  zong: CanonicalHexagram;
  hu: CanonicalHexagram;
}

export const ICHING_DATA_PROVENANCE = Object.freeze({
  source: 'kentang2017/kintaiyi',
  upstreamRevision: 'a8f839456ebf008b39675984e8ec951354984344',
  upstreamBlobSha: 'c54e68889fe33d52f95699b59e535da1d26fd3f8',
  localSha256: 'C379F1DDCA8360B38973E4159A9E20D37F88BDB1F9A3CE1A56ECA3349DFB46EF',
  license: 'MIT',
  content: '文王六十四卦卦辞、六爻辞与彖传',
  reviewStatus: 'imported',
});

function resolveRawTextName(name: string): string {
  if (TEXTS[name]) return name;
  const simplifiedName = SIMPLIFY[name] ?? name;
  return Object.keys(TEXTS).find((key) => (SIMPLIFY[key] ?? key) === simplifiedName) ?? name;
}

function pureHexagramFullName(name: TrigramName, traditional = false): string {
  const trigram = TRIGRAMS[name];
  const displayName = traditional ? trigram.traditionalName : trigram.name;
  const nature = traditional ? trigram.traditionalNature : trigram.nature;
  return `${displayName}${traditional ? '為' : '为'}${nature}`;
}

function compoundFullName(rawName: string, upper: TrigramName, lower: TrigramName, traditional = false): string {
  if (upper === lower) return pureHexagramFullName(upper, traditional);
  const upperNature = traditional ? TRIGRAMS[upper].traditionalNature : TRIGRAMS[upper].nature;
  const lowerNature = traditional ? TRIGRAMS[lower].traditionalNature : TRIGRAMS[lower].nature;
  const name = traditional ? rawName : (SIMPLIFY[rawName] ?? rawName);
  return `${upperNature}${lowerNature}${name}`;
}

function parseText(rawName: string, data: HexagramTexts): HexagramClassicalText {
  return {
    name: SIMPLIFY[rawName] ?? rawName,
    guaCi: data['0'] ?? '',
    yaoCi: [data['1'] ?? '', data['2'] ?? '', data['3'] ?? '', data['4'] ?? '', data['5'] ?? '', data['6'] ?? ''],
    tuanZhuan: data['7'] ?? '',
  };
}

function createCanonicalHexagram(rawName: string, upperTrigram: TrigramName, lowerTrigram: TrigramName, index: number): CanonicalHexagram {
  const textName = resolveRawTextName(rawName);
  const classical = parseText(textName, TEXTS[textName]);
  const number = index + 1;
  const symbol = String.fromCodePoint(0x4dbf + number);
  const fullName = compoundFullName(rawName, upperTrigram, lowerTrigram);
  const traditionalFullName = compoundFullName(rawName, upperTrigram, lowerTrigram, true);
  const linesBottomUp = [...TRIGRAMS[lowerTrigram].linesBottomUp, ...TRIGRAMS[upperTrigram].linesBottomUp];
  const aliases = Array.from(new Set([
    classical.name,
    rawName,
    fullName,
    traditionalFullName,
    symbol,
    `第${number}卦`,
    `${number}卦`,
    `上${upperTrigram}下${lowerTrigram}`,
    `${TRIGRAMS[upperTrigram].nature}${TRIGRAMS[lowerTrigram].nature}`,
  ]));
  return {
    ...classical,
    number,
    traditionalName: rawName,
    fullName,
    traditionalFullName,
    upperTrigram,
    lowerTrigram,
    upperNature: TRIGRAMS[upperTrigram].nature,
    lowerNature: TRIGRAMS[lowerTrigram].nature,
    linesBottomUp,
    symbol,
    codePoint: `U+${(0x4dbf + number).toString(16).toUpperCase()}`,
    aliases,
  };
}

const CANONICAL_HEXAGRAMS: CanonicalHexagram[] = HEXAGRAM_LAYOUT.map(([rawName, upper, lower], index) => (
  createCanonicalHexagram(rawName, upper, lower, index)
));

const TRADITIONAL_REPLACEMENTS = [
  ...Object.entries(SIMPLIFY),
  ['為', '为'], ['澤', '泽'], ['風', '风'], ['兌', '兑'], ['離', '离'],
] as Array<[string, string]>;

export function normalizeHexagramLookupText(value: string): string {
  let normalized = value.trim().replace(/[\s·・]/g, '');
  for (const [traditional, simplified] of TRADITIONAL_REPLACEMENTS.sort((a, b) => b[0].length - a[0].length)) {
    normalized = normalized.split(traditional).join(simplified);
  }
  return normalized.toLowerCase();
}

function normalizeTrigramName(value: string): TrigramName | null {
  const normalized = normalizeHexagramLookupText(value);
  return TRIGRAM_ORDER.find((name) => (
    normalizeHexagramLookupText(name) === normalized
    || normalizeHexagramLookupText(TRIGRAMS[name].traditionalName) === normalized
    || normalizeHexagramLookupText(TRIGRAMS[name].nature) === normalized
    || normalizeHexagramLookupText(TRIGRAMS[name].traditionalNature) === normalized
  )) ?? null;
}

export function listCanonicalHexagrams(): CanonicalHexagram[] {
  return CANONICAL_HEXAGRAMS.map((hexagram) => ({
    ...hexagram,
    yaoCi: [...hexagram.yaoCi],
    linesBottomUp: [...hexagram.linesBottomUp],
    aliases: [...hexagram.aliases],
  }));
}

export function getCanonicalHexagram(number: number): CanonicalHexagram | null {
  return Number.isInteger(number) && number >= 1 && number <= 64 ? CANONICAL_HEXAGRAMS[number - 1] : null;
}

export function resolveHexagram(upperTrigram: string, lowerTrigram: string): CanonicalHexagram | null {
  const upper = normalizeTrigramName(upperTrigram);
  const lower = normalizeTrigramName(lowerTrigram);
  if (!upper || !lower) return null;
  return CANONICAL_HEXAGRAMS.find((hexagram) => hexagram.upperTrigram === upper && hexagram.lowerTrigram === lower) ?? null;
}

export function resolveHexagramLines(linesBottomUp: readonly YaoPolarity[]): CanonicalHexagram | null {
  if (linesBottomUp.length !== 6 || linesBottomUp.some((line) => line !== 'yin' && line !== 'yang')) return null;
  const key = linesBottomUp.join('-');
  return CANONICAL_HEXAGRAMS.find((hexagram) => hexagram.linesBottomUp.join('-') === key) ?? null;
}

export function findCanonicalHexagramByName(name: string): CanonicalHexagram | null {
  const normalized = normalizeHexagramLookupText(name);
  if (!normalized) return null;
  return CANONICAL_HEXAGRAMS.find((hexagram) => (
    hexagram.aliases.some((alias) => normalizeHexagramLookupText(alias) === normalized)
  )) ?? null;
}

export function searchCanonicalHexagrams(query: string): CanonicalHexagram[] {
  const normalized = normalizeHexagramLookupText(query);
  if (!normalized) return listCanonicalHexagrams();
  const numberMatch = normalized.match(/^第?(\d{1,2})卦?$/);
  if (numberMatch) {
    const hexagram = getCanonicalHexagram(Number(numberMatch[1]));
    return hexagram ? [hexagram] : [];
  }
  return CANONICAL_HEXAGRAMS.filter((hexagram) => (
    hexagram.aliases.some((alias) => normalizeHexagramLookupText(alias).includes(normalized))
    || hexagram.guaCi.includes(query.trim())
    || hexagram.yaoCi.some((line) => line.includes(query.trim()))
    || hexagram.tuanZhuan.includes(query.trim())
  ));
}

export function getHexagramRelations(hexagramOrNumber: CanonicalHexagram | number): HexagramRelationSet | null {
  const hexagram = typeof hexagramOrNumber === 'number' ? getCanonicalHexagram(hexagramOrNumber) : hexagramOrNumber;
  if (!hexagram) return null;
  const inverted = hexagram.linesBottomUp.map((line): YaoPolarity => line === 'yang' ? 'yin' : 'yang');
  const reversed = [...hexagram.linesBottomUp].reverse();
  const nuclear = [
    hexagram.linesBottomUp[1], hexagram.linesBottomUp[2], hexagram.linesBottomUp[3],
    hexagram.linesBottomUp[2], hexagram.linesBottomUp[3], hexagram.linesBottomUp[4],
  ];
  const cuo = resolveHexagramLines(inverted);
  const zong = resolveHexagramLines(reversed);
  const hu = resolveHexagramLines(nuclear);
  return cuo && zong && hu ? { cuo, zong, hu } : null;
}

export function changeHexagramLines(hexagramOrNumber: CanonicalHexagram | number, changingLines: readonly number[]): CanonicalHexagram | null {
  const hexagram = typeof hexagramOrNumber === 'number' ? getCanonicalHexagram(hexagramOrNumber) : hexagramOrNumber;
  if (!hexagram) return null;
  const uniqueLines = Array.from(new Set(changingLines));
  if (uniqueLines.some((line) => !Number.isInteger(line) || line < 1 || line > 6)) return null;
  const changed = hexagram.linesBottomUp.map((line, index): YaoPolarity => (
    uniqueLines.includes(index + 1) ? (line === 'yang' ? 'yin' : 'yang') : line
  ));
  return resolveHexagramLines(changed);
}

/** 按卦名查古典文本。支持繁体、简体、全名和 Unicode 卦符。 */
export function getHexagramText(hexName: string): HexagramClassicalText | null {
  const canonical = findCanonicalHexagramByName(hexName);
  if (canonical) return {
    name: canonical.name,
    guaCi: canonical.guaCi,
    yaoCi: [...canonical.yaoCi],
    tuanZhuan: canonical.tuanZhuan,
  };
  const normalized = normalizeHexagramLookupText(hexName);
  const partial = CANONICAL_HEXAGRAMS.find((hexagram) => (
    normalizeHexagramLookupText(hexagram.fullName).includes(normalized)
    || normalizeHexagramLookupText(hexagram.traditionalFullName).includes(normalized)
  ));
  return partial ? {
    name: partial.name,
    guaCi: partial.guaCi,
    yaoCi: [...partial.yaoCi],
    tuanZhuan: partial.tuanZhuan,
  } : null;
}
