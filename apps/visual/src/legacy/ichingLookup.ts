import {
  changeHexagramLines,
  findCanonicalHexagramByName,
  getCanonicalHexagram,
  getHexagramRelations,
  ICHING_DATA_PROVENANCE,
  resolveHexagram,
  resolveHexagramLines,
  type CanonicalHexagram,
  type YaoPolarity,
} from './ichingTexts';

type LookupMode = 'number' | 'name' | 'trigrams' | 'lines';

export type IChingLookupRequest =
  | { by: 'number'; number: number; changingLines: number[] }
  | { by: 'name'; name: string; changingLines: number[] }
  | { by: 'trigrams'; upper: string; lower: string; changingLines: number[] }
  | { by: 'lines'; linesBottomUp: YaoPolarity[]; changingLines: number[] };

export interface IChingLookupSummary {
  number: number;
  name: string;
  fullName: string;
  symbol: string;
  upperTrigram: string;
  lowerTrigram: string;
}

export interface IChingLookupResult {
  schemaVersion: '1.0.0';
  queryMode: LookupMode;
  hexagram: IChingLookupSummary & {
    traditionalName: string;
    traditionalFullName: string;
    codePoint: string;
    upperNature: string;
    lowerNature: string;
    linesBottomUp: YaoPolarity[];
    classicalText: {
      guaCi: string;
      yaoCi: string[];
      tuanZhuan: string;
    };
  };
  relations: {
    cuo: IChingLookupSummary;
    zong: IChingLookupSummary;
    hu: IChingLookupSummary;
  };
  changingLines: number[];
  changedHexagram: IChingLookupSummary | null;
  provenance: typeof ICHING_DATA_PROVENANCE;
  limitation: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChangingLines(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError('changingLines 必须是 1-6 的整数数组。');
  const parsed = Array.from(new Set(value.map((line) => {
    if (!Number.isInteger(line) || Number(line) < 1 || Number(line) > 6) throw new TypeError('changingLines 只能包含 1-6 的整数。');
    return Number(line);
  }))).sort((a, b) => a - b);
  return parsed;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${key} 必须是非空字符串。`);
  return value.trim();
}

export function parseIChingLookupRequest(value: unknown): IChingLookupRequest {
  if (!isRecord(value)) throw new TypeError('输入必须是 JSON 对象。');
  const by = value.by;
  if (by !== 'number' && by !== 'name' && by !== 'trigrams' && by !== 'lines') {
    throw new TypeError('by 必须是 number、name、trigrams 或 lines。');
  }
  const changingLines = parseChangingLines(value.changingLines);
  if (by === 'number') {
    if (!Number.isInteger(value.number) || Number(value.number) < 1 || Number(value.number) > 64) throw new TypeError('number 必须是 1-64 的整数。');
    return { by, number: Number(value.number), changingLines };
  }
  if (by === 'name') return { by, name: requireString(value, 'name'), changingLines };
  if (by === 'trigrams') return { by, upper: requireString(value, 'upper'), lower: requireString(value, 'lower'), changingLines };
  if (!Array.isArray(value.linesBottomUp) || value.linesBottomUp.length !== 6 || value.linesBottomUp.some((line) => line !== 'yin' && line !== 'yang')) {
    throw new TypeError('linesBottomUp 必须按初爻到上爻提供 6 个 yin/yang。');
  }
  return { by, linesBottomUp: [...value.linesBottomUp] as YaoPolarity[], changingLines };
}

function summarize(hexagram: CanonicalHexagram): IChingLookupSummary {
  return {
    number: hexagram.number,
    name: hexagram.name,
    fullName: hexagram.fullName,
    symbol: hexagram.symbol,
    upperTrigram: hexagram.upperTrigram,
    lowerTrigram: hexagram.lowerTrigram,
  };
}

function resolveRequest(request: IChingLookupRequest): CanonicalHexagram | null {
  if (request.by === 'number') return getCanonicalHexagram(request.number);
  if (request.by === 'name') return findCanonicalHexagramByName(request.name);
  if (request.by === 'trigrams') return resolveHexagram(request.upper, request.lower);
  return resolveHexagramLines(request.linesBottomUp);
}

export function runIChingLookup(request: IChingLookupRequest): IChingLookupResult {
  const hexagram = resolveRequest(request);
  if (!hexagram) throw new RangeError('没有找到与输入相符的六十四卦。');
  const relations = getHexagramRelations(hexagram);
  if (!relations) throw new Error('六十四卦关系计算失败。');
  const changed = request.changingLines.length ? changeHexagramLines(hexagram, request.changingLines) : null;
  if (request.changingLines.length && !changed) throw new Error('变卦计算失败。');
  return {
    schemaVersion: '1.0.0',
    queryMode: request.by,
    hexagram: {
      ...summarize(hexagram),
      traditionalName: hexagram.traditionalName,
      traditionalFullName: hexagram.traditionalFullName,
      codePoint: hexagram.codePoint,
      upperNature: hexagram.upperNature,
      lowerNature: hexagram.lowerNature,
      linesBottomUp: [...hexagram.linesBottomUp],
      classicalText: {
        guaCi: hexagram.guaCi,
        yaoCi: [...hexagram.yaoCi],
        tuanZhuan: hexagram.tuanZhuan,
      },
    },
    relations: {
      cuo: summarize(relations.cuo),
      zong: summarize(relations.zong),
      hu: summarize(relations.hu),
    },
    changingLines: [...request.changingLines],
    changedHexagram: changed ? summarize(changed) : null,
    provenance: ICHING_DATA_PROVENANCE,
    limitation: '原文与卦象关系仅供传统文化学习，不构成现实预测或行动建议。',
  };
}
