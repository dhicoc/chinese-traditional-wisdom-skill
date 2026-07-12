import type { XingXiuEntry } from '@/legacy/xingxiuEngine';

/**
 * XingXiuChart — 二十八星宿四象方位 SVG 图（重新设计）
 *
 * 设计原则：
 * - 文字可读性优先：禽星全称 11px、曜 8px，不小于可读阈值
 * - 排版整齐：每象7宿等间距排列，统一格子尺寸
 * - 四象分四区：上南朱雀 / 下北玄武 / 左东青龙 / 右西白虎
 * - 当日值宿金色高亮，本命星宿紫色标注
 * - 足够大的画布（560×560），不挤
 */

interface XingXiuChartProps {
  allXiu: XingXiuEntry[];
  zhiXiu: string;
  benMingXiu: string;
}

const XIANG_COLOR: Record<string, string> = {
  '东方青龙': '#3cb4a0',
  '南方朱雀': '#e0504a',
  '西方白虎': '#d4c8a0',
  '北方玄武': '#5a82b8',
};

const XIANG_LABEL: Record<string, string> = {
  '南方朱雀': '南 · 朱雀',
  '东方青龙': '东 · 青龙',
  '西方白虎': '西 · 白虎',
  '北方玄武': '北 · 玄武',
};

// 四象 → 方位边
const XIANG_SIDE: Record<string, 'top' | 'left' | 'right' | 'bottom'> = {
  '南方朱雀': 'top',
  '东方青龙': 'left',
  '西方白虎': 'right',
  '北方玄武': 'bottom',
};

export function XingXiuChart({ allXiu, zhiXiu, benMingXiu }: XingXiuChartProps) {
  const SIZE = 560;
  const CENTER = SIZE / 2;
  // 每个宿格尺寸
  const CELL = 64;
  const CELL_GAP = 4;
  const TOTAL = 7 * CELL + 6 * CELL_GAP; // 7格总宽度
  const START = CENTER - TOTAL / 2;

  // 按四象分组
  const groups: Record<string, XingXiuEntry[]> = {};
  for (const x of allXiu) (groups[x.xiang] ??= []).push(x);

  // 每宿位置（格中心）
  function getCellCenter(xiang: string, i: number): { x: number; y: number } {
    const offset = START + i * (CELL + CELL_GAP) + CELL / 2;
    switch (XIANG_SIDE[xiang]) {
      case 'top': return { x: offset, y: CELL / 2 + 28 };
      case 'bottom': return { x: offset, y: SIZE - CELL / 2 - 28 };
      case 'left': return { x: CELL / 2 + 28, y: offset };
      case 'right': return { x: SIZE - CELL / 2 - 28, y: offset };
    }
  }

  // 宿格渲染
  function renderCell(x: XingXiuEntry, cx: number, cy: number, color: string, vertical: boolean) {
    const isZhi = x.name === zhiXiu;
    const isMing = x.name === benMingXiu && !isZhi;
    const bg = isZhi ? 'rgba(212,175,55,0.18)' : isMing ? 'rgba(157,122,214,0.15)' : 'rgba(10,18,15,0.7)';
    const border = isZhi ? '#d4af37' : isMing ? '#9d7ad6' : 'rgba(60,70,65,0.4)';
    const textColor = isZhi ? '#e8c547' : isMing ? '#b88df0' : color;
    const w = vertical ? CELL - 8 : CELL;
    const h = vertical ? CELL : CELL - 8;

    return (
      <g key={x.name}>
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx="6"
          fill={bg}
          stroke={border}
          strokeWidth={isZhi || isMing ? 1.5 : 0.8}
        />
        {/* 禽星全称 */}
        <text
          x={cx}
          y={cy - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize="11"
          fontWeight={isZhi || isMing ? 700 : 500}
          fontFamily="'Noto Serif CJK SC', serif"
        >
          {x.fullName}
        </text>
        {/* 七曜 */}
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="8"
          opacity="0.55"
        >
          {x.yao}
        </text>
        {/* 标记 */}
        {isZhi && (
          <text x={cx} y={cy - h / 2 - 4} textAnchor="middle" fill="#e8c547" fontSize="8" fontWeight="700">★ 值日</text>
        )}
        {isMing && (
          <text x={cx} y={cy - h / 2 - 4} textAnchor="middle" fill="#b88df0" fontSize="8" fontWeight="700">◆ 本命</text>
        )}
      </g>
    );
  }

  return (
    <svg
      data-testid="xingxiu-chart"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full"
      role="img"
      aria-label="二十八星宿四象方位图"
    >
      {/* 背景 */}
      <rect x="0" y="0" width={SIZE} height={SIZE} rx="16" fill="rgba(5,10,8,0.7)" />

      {/* 四象分区色块（淡） */}
      <polygon points={`${CENTER},52 ${SIZE-52},${CENTER} ${CENTER},${SIZE-52} 52,${CENTER}`} fill="none" stroke="rgba(44,159,132,0.08)" strokeWidth="1" strokeDasharray="6 6" />

      {/* 方位标注 */}
      <text x={CENTER} y="20" textAnchor="middle" fill={XIANG_COLOR['南方朱雀']} fontSize="13" fontWeight="700" fontFamily="'Noto Serif CJK SC', serif">{XIANG_LABEL['南方朱雀']}</text>
      <text x="20" y={CENTER} textAnchor="middle" fill={XIANG_COLOR['东方青龙']} fontSize="13" fontWeight="700" transform={`rotate(-90 20 ${CENTER})`} fontFamily="'Noto Serif CJK SC', serif">{XIANG_LABEL['东方青龙']}</text>
      <text x={SIZE - 20} y={CENTER} textAnchor="middle" fill={XIANG_COLOR['西方白虎']} fontSize="13" fontWeight="700" transform={`rotate(90 ${SIZE - 20} ${CENTER})`} fontFamily="'Noto Serif CJK SC', serif">{XIANG_LABEL['西方白虎']}</text>
      <text x={CENTER} y={SIZE - 12} textAnchor="middle" fill={XIANG_COLOR['北方玄武']} fontSize="13" fontWeight="700" fontFamily="'Noto Serif CJK SC', serif">{XIANG_LABEL['北方玄武']}</text>

      {/* 中心圆 */}
      <circle cx={CENTER} cy={CENTER} r="68" fill="rgba(5,10,8,0.9)" stroke="rgba(44,159,132,0.2)" strokeWidth="1.2" />
      <text x={CENTER} y={CENTER - 22} textAnchor="middle" fill="rgba(44,159,132,0.5)" fontSize="10">二十八宿</text>
      <text x={CENTER} y={CENTER - 4} textAnchor="middle" fill="rgba(44,159,132,0.7)" fontSize="11" fontWeight="600">值日 · {zhiXiu}</text>
      {benMingXiu !== zhiXiu && (
        <text x={CENTER} y={CENTER + 14} textAnchor="middle" fill="rgba(157,122,214,0.7)" fontSize="11" fontWeight="600">本命 · {benMingXiu}</text>
      )}
      <text x={CENTER} y={CENTER + 32} textAnchor="middle" fill="rgba(44,159,132,0.3)" fontSize="8">四象七宿</text>

      {/* 四象宿格 */}
      {Object.entries(groups).map(([xiang, xius]) => {
        const color = XIANG_COLOR[xiang] ?? '#888';
        const side = XIANG_SIDE[xiang];
        const vertical = side === 'left' || side === 'right';
        return xius.map((x, i) => {
          const { x: cx, y: cy } = getCellCenter(xiang, i);
          return renderCell(x, cx, cy, color, vertical);
        });
      })}
    </svg>
  );
}
