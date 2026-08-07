/**
 * feixingEngine — 流年飞星 MCP 工具引擎。
 *
 * 把 canvasRenderers 的飞星排盘 + flyingStarRemedies 的九星化解/元运/星曜状态
 * 组合成完整 ToolEnvelope，供 MCP server 注册为 calc_feixing 工具。
 * 纯计算（按年份九宫飞布），零外部依赖。
 */

import type { ToolEnvelope, ExportSnapshot, FlyingStarGrid, FlyingStarsSummary, Tone } from './baseTypes';
import { getFeixingGrid, getFeixingSummary } from './canvasRenderers';
import {
  NINE_STAR_REMEDIES,
  getYuanYun,
  getStarStatuses,
  MING_GUA_DIRECTIONS,
  PALACE_TO_DIR,
  type NineStarRemedy,
  type StarStatus,
} from './flyingStarRemedies';
import { calcMingGua } from './bazhaiHouse';

export interface FeixingInput {
  /** 公历年，默认今年 */
  year?: number;
  /** 性别（用于推算命卦方位，可选） */
  gender?: '男' | '女';
  /** 出生年（用于命卦，若与 year 不同；不传则用 year 推命卦） */
  birthYear?: number;
}

export interface FeixingResult {
  year: number;
  /** 元运信息 */
  yuanYun: { num: number; name: string; wangStar: number; shengStar: number; tuiStar: number };
  /** 中宫飞星摘要 */
  center: FlyingStarsSummary;
  /** 3×3 九宫飞星盘 */
  grid: FlyingStarGrid;
  /** 九星旺衰状态（按元运） */
  starStatuses: StarStatus[];
  /** 各宫飞星化解建议 */
  remedies: Array<{ palace: string; direction: string; starNum: number; starName: string; luck: string; remedy: NineStarRemedy }>;
  /** 个人命卦方位（需 gender） */
  mingGua?: { trigram: string; group: string; directions: typeof MING_GUA_DIRECTIONS[number] };
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

function toneFromCenter(luck: string): Tone {
  if (luck === '吉') return '吉';
  if (luck === '凶') return '凶';
  return '中';
}

export function calcFeixing(input: FeixingInput = {}): ToolEnvelope<FeixingResult> {
  const year = input.year ?? new Date().getFullYear();
  const grid = getFeixingGrid(year);
  const summary = getFeixingSummary(year);

  if (!grid || !summary) {
    return {
      ok: false,
      tool: 'calc_feixing',
      version: '1.0.0',
      input_normalized: { year },
      data: null as unknown as FeixingResult,
      summary: [],
      error: { code: 'CALC_FAILED', message: `无法推算 ${year} 年飞星盘` },
    };
  }

  const yuanYun = getYuanYun(year);
  const starStatuses = getStarStatuses(yuanYun);
  const tone = toneFromCenter(summary.luck);

  // 各宫飞星化解
  const remedies = grid.flat().map((cell) => ({
    palace: cell.palace,
    direction: PALACE_TO_DIR[cell.palace] ?? cell.palace,
    starNum: cell.starNum,
    starName: cell.starName,
    luck: cell.luck,
    remedy: NINE_STAR_REMEDIES[cell.starNum] ?? { name: cell.starName, nature: '', meaning: '', remedy: '' },
  }));

  // 命卦方位（需 gender）
  let mingGua: FeixingResult['mingGua'];
  if (input.gender) {
    const birthYear = input.birthYear ?? year;
    const gua = calcMingGua(birthYear, input.gender);
    if (gua?.trigram && gua.trigram !== '?' && gua.num && MING_GUA_DIRECTIONS[gua.num]) {
      mingGua = { trigram: gua.trigram, group: gua.group, directions: MING_GUA_DIRECTIONS[gua.num] };
    }
  }

  const cautionLabels = remedies.filter((r) => r.luck === '凶').map((r) => `${r.direction}(${r.starName})`);
  const favorableLabels = remedies.filter((r) => r.luck === '吉').map((r) => `${r.direction}(${r.starName})`);

  const synthesis = `${year}年${yuanYun.name}（当令${yuanYun.wangStar}白），中宫${summary.centerStar}白${summary.starName}（${summary.wuxing}，${summary.luck}）。${favorableLabels.length ? `传统吉性标签：${favorableLabels.join('、')}。` : ''}${cautionLabels.length ? `传统谨慎标签：${cautionLabels.join('、')}。` : ''}${mingGua ? `命卦${mingGua.trigram}（${mingGua.group}），生气标签方${mingGua.directions.shengqi}、天医标签方${mingGua.directions.tianyi}。` : ''}内容仅作传统文化阅读，不用于健康、财务、施工或其他现实决策。`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['流年飞星', `${year}年`, yuanYun.name, `${summary.centerStar}白中宫`],
    sections: [
      { heading: '元运', body: `${year}年属${yuanYun.name}（${yuanYun.startYear}-${yuanYun.endYear}），传统当令标签${yuanYun.wangStar}白，生气标签${yuanYun.shengStar}白，退气标签${yuanYun.tuiStar}白。` },
      { heading: '中宫飞星', body: `中宫${summary.centerStar}白${summary.starName}，五行${summary.wuxing}，传统吉凶标签${summary.luck}。` },
      { heading: '九宫飞星盘', body: grid.flat().map((c) => `${c.palace}(${PALACE_TO_DIR[c.palace] ?? c.palace})${c.starNum}白${c.starName}(${c.luck})`).join('；') + '。' },
      { heading: '九星旺衰', body: starStatuses.map((s) => `${s.star}白${s.status}`).join('、') + '。' },
      { heading: '传统方位提示', body: remedies.filter((r) => r.luck === '凶').map((r) => `${r.direction}(${r.starName})：${r.remedy.remedy || r.remedy.meaning || '传统谨慎标签'}`).join('；') + '。' },
      ...(mingGua ? [{ heading: '命卦方位标签', body: `命卦${mingGua.trigram}（${mingGua.group}）：生气${mingGua.directions.shengqi}、天医${mingGua.directions.tianyi}、延年${mingGua.directions.niannian}、伏位${mingGua.directions.fuwei}；绝命${mingGua.directions.jueming}、五鬼${mingGua.directions.wugui}、六煞${mingGua.directions.liusha}、祸害${mingGua.directions.huohai}。以上均为传统八宅标签，不预示现实结果。` }] : []),
    ],
    sourceNotes: '飞星按九宫顺飞推算；元运与方位说法属于玄空传统口径，仅供文化参考。',
  };

  const result: FeixingResult = {
    year,
    yuanYun: { num: yuanYun.num, name: yuanYun.name, wangStar: yuanYun.wangStar, shengStar: yuanYun.shengStar, tuiStar: yuanYun.tuiStar },
    center: summary,
    grid,
    starStatuses,
    remedies,
    mingGua,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'feixingEngine',
    mode: 'local-exact',
    confidenceNote: '飞星按九宫顺飞推算；元运与方位说法属于玄空传统口径，仅供文化参考。',
  };

  return {
    ok: true,
    tool: 'calc_feixing',
    version: '1.0.0',
    input_normalized: { year, gender: input.gender, birthYear: input.birthYear },
    data: result,
    summary: [synthesis],
    warnings: [result.confidenceNote],
  };
}

export function calcFeixingEnveloped(input: FeixingInput): ToolEnvelope<FeixingResult> {
  return calcFeixing(input);
}
