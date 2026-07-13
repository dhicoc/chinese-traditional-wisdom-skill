/**
 * QimenChart — 奇门遁甲九宫 SVG 式盘
 *
 * 洛书九宫 3×3 方位排布（上南下北）：
 *   上排：巽4  离9  坤2
 *   中排：震3  中5  兑7
 *   下排：艮8  坎1  乾6
 * 每宫显示：宫名+宫数 / 八门(吉凶色) / 九星 / 八神 / 天盘·地盘干
 * 值符宫玉色边框、值使宫金色边框、马星朱砂点、空亡灰点
 * 吉格★绿 / 凶格✗红 标在宫角
 */

export interface QimenPalaceLite {
  position: number;
  trigram: string;
  gate: string;
  gateLuck: string;
  star: string;
  starLuck: string;
  deity: string;
  heavenlyStem: string;
  earthlyStem: string;
  isZhiFu: boolean;
  isZhiShi: boolean;
  horse: boolean;
  voidness: { hasVoidness: boolean } | null;
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
}

export interface QimenChartProps {
  palaces: QimenPalaceLite[];
  /** 遁式（阳遁/阴遁）+ 局数，标题用 */
  dunJu: string;
}

/** 洛书 3×3 方位：position→[row,col]（行0=上南，行2=下北） */
const POS_GRID: Record<number, [number, number]> = {
  4: [0, 0], 9: [0, 1], 2: [0, 2],
  3: [1, 0], 5: [1, 1], 7: [1, 2],
  8: [2, 0], 1: [2, 1], 6: [2, 2],
};

/** 吉凶→色 */
const LUCK_COLOR: Record<string, string> = {
  大吉: '#3cb4a0', 吉: '#3cb4a0',
  大凶: '#e0504a', 凶: '#e0504a',
  中: '#c9b27a', 平: '#9a8a7a',
};

function luckColor(luck: string): string {
  return LUCK_COLOR[luck] ?? '#7a8a8a';
}

export function QimenChart({ palaces, dunJu }: QimenChartProps) {
  const W = 460;
  const H = 500;
  const titleH = 36;
  const footerH = 60;
  const gridAreaH = H - titleH - footerH;
  const cell = Math.floor(gridAreaH / 3);
  const gap = 3;
  const totalW = cell * 3 + gap * 2;
  const gridX = Math.floor((W - totalW) / 2);
  const gridY = titleH + Math.floor((gridAreaH - totalW) / 2);

  const palaceByPos: Record<number, QimenPalaceLite> = Object.fromEntries(palaces.map((p) => [p.position, p]));

  return (
    <svg
      data-testid="qimen-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto w-full max-w-[460px]"
      role="img"
      aria-label="奇门九宫式盘"
    >
      {/* 标题 */}
      <text x={W / 2} y={22} textAnchor="middle" className="fill-jade-50" style={{ fontSize: 14, fontWeight: 600, fontFamily: 'serif' }}>
        奇门九宫式盘 · {dunJu}
      </text>

      {/* 九宫 */}
      {Object.entries(POS_GRID).map(([posStr, [row, col]]) => {
        const pos = Number(posStr);
        const p = palaceByPos[pos];
        const x = gridX + col * (cell + gap);
        const y = gridY + row * (cell + gap);
        if (!p) {
          return (
            <g key={posStr}>
              <rect x={x} y={y} width={cell} height={cell} rx={10} fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            </g>
          );
        }
        const isCenter = pos === 5;
        const borderColor = p.isZhiFu ? '#3cb4a0' : p.isZhiShi ? '#e8c668' : 'rgba(255,255,255,0.12)';
        const bgColor = p.isZhiFu ? 'rgba(60,180,160,0.10)' : p.isZhiShi ? 'rgba(232,198,104,0.10)' : isCenter ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.25)';
        const borderW = p.isZhiFu || p.isZhiShi ? 2 : 1;

        // 吉格/凶格计数
        const auspCount = p.auspiciousPatterns.length;
        const inauspCount = p.inauspiciousPatterns.length;

        return (
          <g key={posStr}>
            <rect x={x} y={y} width={cell} height={cell} rx={10} fill={bgColor} stroke={borderColor} strokeWidth={borderW} />
            {/* 宫名+宫数（左上） */}
            <text x={x + 12} y={y + 20} className="fill-jade-100" style={{ fontSize: 15, fontWeight: 600, fontFamily: 'serif', opacity: 0.92 }}>
              {p.trigram}
            </text>
            <text x={x + cell - 10} y={y + 18} textAnchor="end" className="fill-jade-100" style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.35 }}>
              {pos}
            </text>

            {/* 八门（中上，门色） */}
            <text x={x + cell / 2} y={y + cell * 0.42} textAnchor="middle" style={{ fontSize: 14, fontWeight: 600, fontFamily: 'serif', fill: luckColor(p.gateLuck), opacity: 0.85 }}>
              {p.gate}
            </text>
            {/* 九星（中下） */}
            <text x={x + cell / 2} y={y + cell * 0.6} textAnchor="middle" style={{ fontSize: 12, fontFamily: 'serif', fill: luckColor(p.starLuck), opacity: 0.8 }}>
              {p.star}
            </text>
            {/* 八神（小字） */}
            <text x={x + cell / 2} y={y + cell * 0.74} textAnchor="middle" style={{ fontSize: 10, fontFamily: 'serif', fill: '#c9b27a', opacity: 0.7 }}>
              {p.deity}
            </text>
            {/* 天盘·地盘干（底部） */}
            <text x={x + cell / 2} y={y + cell * 0.88} textAnchor="middle" style={{ fontSize: 10, fontFamily: 'monospace', fill: '#7fb8d4', opacity: 0.85 }}>
              {p.heavenlyStem}{p.earthlyStem ? `·${p.earthlyStem}` : ''}
            </text>

            {/* 左上角标记：符/使/马/空 */}
            <g>
              {p.isZhiFu && <circle cx={x + 8} cy={y + cell - 8} r={3} fill="#3cb4a0" />}
              {p.isZhiShi && <circle cx={x + 16} cy={y + cell - 8} r={3} fill="#e8c668" />}
              {p.horse && <circle cx={x + 24} cy={y + cell - 8} r={3} fill="#e0504a" />}
              {p.voidness?.hasVoidness && <circle cx={x + 32} cy={y + cell - 8} r={3} fill="rgba(255,255,255,0.35)" />}
            </g>
            {/* 右下角吉凶格计数 */}
            {(auspCount > 0 || inauspCount > 0) && (
              <text x={x + cell - 8} y={y + cell - 6} textAnchor="end" style={{ fontSize: 9, fontFamily: 'serif' }}>
                {auspCount > 0 && <tspan fill="#3cb4a0">★{auspCount} </tspan>}
                {inauspCount > 0 && <tspan fill="#e0504a">✗{inauspCount}</tspan>}
              </text>
            )}
          </g>
        );
      })}

      {/* 底部图例 */}
      <g>
        <text x={gridX} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: '#3cb4a0' }}>●值符</text>
        <text x={gridX + 50} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: '#e8c668' }}>●值使</text>
        <text x={gridX + 100} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: '#e0504a' }}>●马星</text>
        <text x={gridX + 150} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: 'rgba(255,255,255,0.5)' }}>●空亡</text>
        <text x={gridX + 210} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: '#3cb4a0' }}>★吉格</text>
        <text x={gridX + 260} y={H - footerH + 18} style={{ fontSize: 10, fontFamily: 'serif', fill: '#e0504a' }}>✗凶格</text>
        <text x={gridX} y={H - footerH + 38} style={{ fontSize: 10, fontFamily: 'serif', fill: 'rgba(255,255,255,0.45)' }}>
          每宫：八卦·宫数 / 八门 / 九星 / 八神 / 天盘·地盘干
        </text>
      </g>
    </svg>
  );
}
