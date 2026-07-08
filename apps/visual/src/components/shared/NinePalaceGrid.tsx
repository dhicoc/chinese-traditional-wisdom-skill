import { useMemo } from 'react';
import type { FlyingStarGrid } from '@/legacy/canvasRenderers';

/**
 * NinePalaceGrid — 九宫飞星 SVG 图（Phase 10 图表替换）
 *
 * 替代飞星工作区的 legacy Canvas `renderFlyingStars`。3×3 洛书九宫，
 * 每格显示宫位名 + 飞星编号与星名，吉凶配色对齐 legacy
 * `STAR_LUCK_COLORS`。中心格高亮，底部标注五黄/二黑煞入宫方位。
 */

interface NinePalaceGridProps {
  grid: FlyingStarGrid;
  year: number;
  /** viewBox 尺寸（方形），默认 350 */
  size?: number;
}

// 吉凶背景色（对齐 legacy fengshui.js STAR_LUCK_COLORS）
const STAR_LUCK_COLORS: Record<string, string> = {
  大凶: '#D32F2F',
  凶: '#F48FB1',
  吉: '#A5D6A7',
  大吉: '#388E3C',
  中性: '#FFD54F',
  次凶: '#FFAB91',
};

// 深色吉凶用白字，浅色用深字（对齐 legacy luckTextColor）
const DARK_LUCK = new Set(['大凶', '大吉']);

function textColor(luck: string): string {
  return DARK_LUCK.has(luck) ? '#FFFFFF' : '#1a2a22';
}

/** 颜色与白色混合，模拟 legacy lighten() */
function lighten(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * alpha);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function NinePalaceGrid({ grid, year, size = 350 }: NinePalaceGridProps) {
  const W = size;
  const H = size;

  // 网格区
  const gridAreaTop = 34;
  const gridAreaBot = 40;
  const gridAreaH = H - gridAreaTop - gridAreaBot;
  const cell = Math.floor(gridAreaH / 3);
  const gap = 2;
  const totalW = cell * 3 + gap * 2;
  const gridX = Math.floor((W - totalW) / 2);
  const gridY = gridAreaTop + Math.floor((gridAreaH - totalW) / 2);

  // 五黄 / 二黑 所在宫位
  const { wuHuang, erHei } = useMemo(() => {
    let wu = '';
    let er = '';
    for (const row of grid) {
      for (const c of row) {
        if (c.starNum === 5) wu = c.palace;
        if (c.starNum === 2) er = c.palace;
      }
    }
    return { wuHuang: wu, erHei: er };
  }, [grid]);

  return (
    <svg
      data-testid="nine-palace-grid"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[380px]"
      role="img"
      aria-label={`公元 ${year} 年 九宫飞星图`}
    >
      {/* 标题 */}
      <text x={W / 2} y={18} textAnchor="middle" dominantBaseline="middle" fill="#cfe9dc" style={{ fontSize: 14, fontWeight: 700 }}>
        公元 {year} 年 九宫飞星图
      </text>

      {/* 九宫格 */}
      {grid.map((row, ri) =>
        row.map((c, ci) => {
          const x = gridX + ci * (cell + gap);
          const y = gridY + ri * (cell + gap);
          const isCenter = ri === 1 && ci === 1;
          const bgHex = STAR_LUCK_COLORS[c.luck] || '#FFFFFF';
          const bg = isCenter ? lighten(bgHex, 0.35) : bgHex;
          const tColor = textColor(c.luck);
          const starLabel = `${c.starNum}${c.starName}`;
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={x} y={y} width={cell} height={cell} rx={4} fill={bg} stroke="#5a4a3a" strokeWidth={isCenter ? 2 : 0.8} />
              {/* 宫位名 */}
              <text
                x={x + cell / 2}
                y={y + cell * 0.32}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={tColor}
                style={{ fontSize: isCenter ? 18 : 15, fontWeight: isCenter ? 700 : 400 }}
              >
                {c.palace}
              </text>
              {/* 星号+星名 */}
              <text
                x={x + cell / 2}
                y={y + cell * 0.66}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={tColor}
                style={{ fontSize: isCenter ? 15 : 12, fontWeight: 700 }}
              >
                {starLabel}
              </text>
              {/* 中心格高亮外框 */}
              {isCenter && (
                <rect x={x + 1.5} y={y + 1.5} width={cell - 3} height={cell - 3} fill="none" stroke="#E65100" strokeWidth={3} />
              )}
            </g>
          );
        }),
      )}

      {/* 五黄煞 / 二黑煞 警告 */}
      <text x={W / 2} y={H - 22} textAnchor="middle" dominantBaseline="middle" fill="#ef5350" style={{ fontSize: 11 }}>
        五黄杀入{wuHuang}宫（大凶）─ 宜静不宜动
      </text>
      <text x={W / 2} y={H - 8} textAnchor="middle" dominantBaseline="middle" fill="#F48FB1" style={{ fontSize: 11 }}>
        二黑杀入{erHei}宫（病符星）─ 注意健康
      </text>
    </svg>
  );
}
