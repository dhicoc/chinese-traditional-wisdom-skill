import type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionSector,
  EightMansionsData,
  EightMansionsGrid,
  EightMansionsSummary,
  FlyingStarCell,
  FlyingStarGrid,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
} from './baseTypes';
import { CONSTITUTION_TYPES } from './baseTypes';
import type { LegacyWindow, LiuyaoData, MeihuaData } from './divinationTypes';
export type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionSector,
  EightMansionsData,
  EightMansionsGrid,
  EightMansionsSummary,
  FlyingStarCell,
  FlyingStarGrid,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
  LiuyaoData,
  MeihuaData,
};
export { MEIHUA_TRIGRAMS } from './divinationTypes';

function legacyWindow() {
  return window as LegacyWindow;
}

export function getLegacyBaziModule() {
  return legacyWindow().LegacyVizModules?.bazi;
}

export function getLegacyHealthModule() {
  return legacyWindow().LegacyVizModules?.health;
}

export function getLegacyFengshuiModule() {
  return legacyWindow().LegacyVizModules?.fengshui;
}

export function getLegacyDivinationModule() {
  return legacyWindow().LegacyVizModules?.divination;
}

export function getLegacyZiweiModule() {
  return legacyWindow().LegacyVizModules?.ziwei;
}

export function getLegacyCORE() {
  return legacyWindow().LegacyCORE;
}

export function calculateLegacyYunqi(year: number) {
  const engine = legacyWindow().YunqiEngine;
  if (!engine) throw new Error('Legacy YunqiEngine is not loaded.');
  return engine.calculate(year);
}

export function renderLegacyBazi(canvasId: string, pillars: BaziPillars) {
  const bazi = getLegacyBaziModule();
  if (!bazi) throw new Error('Legacy bazi module is not loaded.');
  bazi.render(canvasId, pillars);
}

export function renderLegacyWuxing(canvasId: string, stats: WuxingStats) {
  const bazi = getLegacyBaziModule();
  if (!bazi) throw new Error('Legacy bazi module is not loaded.');
  bazi.renderWuxing(canvasId, stats);
}

export function renderLegacyYunqi(canvasId: string, data: YunqiData) {
  const health = getLegacyHealthModule();
  if (!health) throw new Error('Legacy health module is not loaded.');
  health.renderYunqi(canvasId, data);
}

export function renderLegacyCompass(canvasId: string) {
  const fengshui = getLegacyFengshuiModule();
  if (!fengshui) throw new Error('Legacy fengshui module is not loaded.');
  fengshui.renderCompass(canvasId);
}

export function renderLegacyConstitution(canvasId: string, data: ConstitutionData) {
  const health = getLegacyHealthModule();
  if (!health) throw new Error('Legacy health module is not loaded.');
  health.renderConstitution(canvasId, data);
}

export function renderLegacyFlyingStars(canvasId: string, data: FlyingStarsData) {
  const fengshui = getLegacyFengshuiModule();
  if (!fengshui) throw new Error('Legacy fengshui module is not loaded.');
  fengshui.renderFlyingStars(canvasId, data);
}

export function renderLegacyEightMansions(canvasId: string, data: EightMansionsData) {
  const fengshui = getLegacyFengshuiModule();
  if (!fengshui) throw new Error('Legacy fengshui module is not loaded.');
  fengshui.renderEightMansions(canvasId, data);
}

export function renderLegacyLiuyao(canvasId: string, data: LiuyaoData) {
  const divination = getLegacyDivinationModule();
  if (!divination) throw new Error('Legacy divination module is not loaded.');
  divination.renderLiuyao(canvasId, data);
}

export function renderLegacyMeihua(canvasId: string, data: MeihuaData) {
  const divination = getLegacyDivinationModule();
  if (!divination) throw new Error('Legacy divination module is not loaded.');
  divination.renderMeihua(canvasId, data);
}

export function renderLegacyZiwei(canvasId: string, data: unknown) {
  const ziwei = getLegacyZiweiModule();
  if (!ziwei) throw new Error('Legacy ziwei module is not loaded.');
  ziwei.render(canvasId, data);
}

export function deriveDominantConstitution(scores: ConstitutionScores): ConstitutionType | '' {
  let maxScore = -1;
  let dominant: ConstitutionType | '' = '';
  for (const type of CONSTITUTION_TYPES) {
    const score = scores[type] ?? 0;
    if (score > maxScore) {
      maxScore = score;
      dominant = type;
    }
  }
  return maxScore <= 0 ? '' : dominant;
}

export function getFeixingSummary(year: number): FlyingStarsSummary | null {
  const core = getLegacyCORE();
  if (!core) return null;
  const stars = core.getFlyingStars(year);
  const centerStar = stars['中'] ?? 0;
  if (centerStar < 1 || centerStar > 9) return null;
  const info = core.nineStars[centerStar - 1];
  if (!info) return null;
  return { centerStar, starName: info.name, wuxing: info.wuxing, luck: info.luck };
}

/** 洛书方位 → 3×3 网格（与 legacy fengshui.js FLYING_STAR_GRID 对齐） */
const FLYING_STAR_GRID: string[][] = [
  ['巽', '离', '坤'],
  ['震', '中', '兑'],
  ['艮', '坎', '乾'],
];

/** 返回 3×3 九宫飞星完整网格，供 SVG 组件渲染；CORE 未加载时返回 null。 */
export function getFeixingGrid(year: number): FlyingStarGrid | null {
  const core = getLegacyCORE();
  if (!core) return null;
  const stars = core.getFlyingStars(year);
  if (!stars) return null;
  return FLYING_STAR_GRID.map((row) =>
    row.map((palace) => {
      const starNum = stars[palace] ?? 0;
      const info = core.nineStars[starNum - 1] ?? { name: '', wuxing: '', luck: '' };
      return { palace, starNum, starName: info.name, wuxing: info.wuxing, luck: info.luck };
    }),
  );
}

export function getBazhaiSummary(year: number, gender: '男' | '女'): EightMansionsSummary | null {
  const core = getLegacyCORE();
  if (!core) return null;
  const gua = core.calcMingGua(year, gender);
  if (!gua || !gua.trigram) return null;
  return { trigram: gua.trigram, group: gua.group };
}

/** 八方向顺序（从北起顺时针，与 legacy fengshui.js DIR_NAMES 对齐） */
const EIGHT_DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const;

/** 返回八宅命盘完整数据（命卦 + 8 方向扇区），供 SVG 组件渲染；引擎未加载时返回 null。 */
export function getBazhaiGrid(year: number, gender: '男' | '女'): EightMansionsGrid | null {
  const core = getLegacyCORE();
  const fengshui = getLegacyFengshuiModule();
  if (!core || !fengshui) return null;
  const gua = core.calcMingGua(year, gender);
  if (!gua || !gua.trigram) return null;
  const masterTri = gua.trigram;
  const mansionMap = fengshui.eightMansionsData?.[masterTri];
  if (!mansionMap) return null;
  const symIdx = core.trigrams.indexOf(masterTri);
  const trigramSymbol = core.trigramsSymbol[symIdx] ?? '';
  const sectors: EightMansionSector[] = EIGHT_DIRECTIONS.map((dir) => {
    const star = mansionMap[dir] ?? '';
    const info = core.eightMansionStars[star] ?? { luck: '', meaning: '' };
    const dirInfo = core.trigramDirection
      ? Object.values(core.trigramDirection).find((d) => d.label === dir)
      : undefined;
    return { direction: dir, deg: dirInfo?.deg ?? 0, star, luck: info.luck, meaning: info.meaning };
  });
  return { trigram: masterTri, trigramSymbol, group: gua.group, sectors };
}
