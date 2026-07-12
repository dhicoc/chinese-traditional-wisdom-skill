import type { XingXiuEntry } from '@/legacy/xingxiuEngine';

/**
 * XingXiuChart — 二十八星宿四象方位 SVG 图
 *
 * 布局：朱雀（南/上）青龙（东/左）白虎（西/右）玄武（北/下）
 * 每象7宿沿方位排列，当日值宿金色高亮，本命星宿紫色标注。
 */

interface XingXiuChartProps {
  /** 二十八宿全表 */
  allXiu: XingXiuEntry[];
  /** 当日值宿名（单字） */
  zhiXiu: string;
  /** 本命星宿名（单字） */
  benMingXiu: string;
}

const XIANG_COLOR: Record<string, string> = {
  '东方青龙': '#2c9d8f',
  '南方朱雀': '#c6301f',
  '西方白虎': '#d4c8a0',
  '北方玄武': '#4a6fa5',
};

// 四象方位映射（SVG坐标系：上南/下北/左东/右西，对齐传统方位）
const XIANG_SIDE: Record<string, 'top' | 'left' | 'right' | 'bottom'> = {
  '南方朱雀': 'top',
  '东方青龙': 'left',
  '西方白虎': 'right',
  '北方玄武': 'bottom',
};

export function XingXiuChart({ allXiu, zhiXiu, benMingXiu }: XingXiuChartProps) {
  const SIZE = 400;
  const CENTER = SIZE / 2;
  const CELL_W = 48;
  const CELL_H = 32;

  // 按四象分组
  const groups: Record<string, XingXiuEntry[]> = {};
  for (const x of allXiu) (groups[x.xiang] ??= []).push(x);

  // 计算每宿在 SVG 上的位置
  function getPosition(xiang: string, index: number): { x: number; y: number } {
    const side = XIANG_SIDE[xiang];
    const totalWidth = 7 * CELL_W;
    const startX = CENTER - totalWidth / 2;
    const offsetX = startX + index * CELL_W + CELL_W / 2;

    switch (side) {
      case 'top': return { x: offsetX, y: 30 };
      case 'bottom': return { x: offsetX, y: SIZE - 30 };
      case 'left': return { x: 30, y: CENTER - totalWidth / 2 + index * CELL_W + CELL_W / 2 };
      case 'right': return { x: SIZE - 30, y: CENTER - totalWidth / 2 + index * CELL_W + CELL_W / 2 };
    }
  }

  return (
    <svg
      data-testid="xingxiu-chart"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-md"
      role="img"
      aria-label="二十八星宿四象方位图"
    >
      {/* 外框 */}
      <rect x="2" y="2" width={SIZE - 4} height={SIZE - 4} rx="12" fill="rgba(7,13,11,0.6)" stroke="rgba(44,159,132,0.15)" strokeWidth="1" />

      {/* 中心区域 */}
      <circle cx={CENTER} cy={CENTER} r="56" fill="rgba(7,13,11,0.8)" stroke="rgba(44,159,132,0.2)" strokeWidth="1" />
      <text x={CENTER} y={CENTER - 8} textAnchor="middle" className="fill-jade-100/40" fontSize="10">四象</text>
      <text x={CENTER} y={CENTER + 8} textAnchor="middle" className="fill-jade-100/60" fontSize="13" fontWeight="600">二十八宿</text>
      <text x={CENTER} y={CENTER + 24} textAnchor="middle" className="fill-gold-400/50" fontSize="9">值:{zhiXiu}</text>

      {/* 四象方位标注 */}
      <text x={CENTER} y={16} textAnchor="middle" fill={XIANG_COLOR['南方朱雀']} fontSize="11" fontWeight="600">南 · 朱雀</text>
      <text x={16} y={CENTER + 4} textAnchor="middle" fill={XIANG_COLOR['东方青龙']} fontSize="11" fontWeight="600" transform={`rotate(-90 16 ${CENTER})`}>东 · 青龙</text>
      <text x={SIZE - 16} y={CENTER + 4} textAnchor="middle" fill={XIANG_COLOR['西方白虎']} fontSize="11" fontWeight="600" transform={`rotate(90 ${SIZE - 16} ${CENTER})`}>西 · 白虎</text>
      <text x={CENTER} y={SIZE - 8} textAnchor="middle" fill={XIANG_COLOR['北方玄武']} fontSize="11" fontWeight="600">北 · 玄武</text>

      {/* 四象连线（菱形框） */}
      <polygon
        points={`${CENTER},28 ${SIZE-28},${CENTER} ${CENTER},${SIZE-28} 28,${CENTER}`}
        fill="none"
        stroke="rgba(44,159,132,0.1)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* 二十八宿 */}
      {Object.entries(groups).map(([xiang, xius]) => {
        const color = XIANG_COLOR[xiang] ?? '#888';
        return xius.map((x, i) => {
          const pos = getPosition(xiang, i);
          const isZhiXiu = x.name === zhiXiu;
          const isBenMing = x.name === benMingXiu && !isZhiXiu;
          const bgColor = isZhiXiu ? 'rgba(212,175,55,0.15)' : isBenMing ? 'rgba(157,122,214,0.12)' : 'rgba(7,13,11,0.5)';
          const borderColor = isZhiXiu ? 'rgba(212,175,55,0.5)' : isBenMing ? 'rgba(157,122,214,0.4)' : 'rgba(60,60,60,0.3)';
          const textColor = isZhiXiu ? '#d4af37' : isBenMing ? '#9d7ad6' : color;

          return (
            <g key={`${xiang}-${x.name}`}>
              {/* 宿格背景 */}
              <rect
                x={pos.x - CELL_W / 2 + 2}
                y={pos.y - CELL_H / 2}
                width={CELL_W - 4}
                height={CELL_H}
                rx="4"
                fill={bgColor}
                stroke={borderColor}
                strokeWidth="0.8"
              />
              {/* 禽星全称 */}
              <text
                x={pos.x}
                y={pos.y - 2}
                textAnchor="middle"
                fill={textColor}
                fontSize="9"
                fontWeight={isZhiXiu || isBenMing ? '700' : '400'}
              >
                {x.fullName}
              </text>
              {/* 曜 */}
              <text
                x={pos.x}
                y={pos.y + 9}
                textAnchor="middle"
                fill={color}
                fontSize="7"
                opacity="0.6"
              >
                {x.yao}曜
              </text>
              {/* 高亮标记 */}
              {isZhiXiu && (
                <text x={pos.x} y={pos.y - CELL_H / 2 - 3} textAnchor="middle" fill="#d4af37" fontSize="7">★值</text>
              )}
              {isBenMing && (
                <text x={pos.x} y={pos.y - CELL_H / 2 - 3} textAnchor="middle" fill="#9d7ad6" fontSize="7">◆命</text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}
