/**
 * BaziPillarsChart — 八字四柱 SVG 主盘（Phase 10 图表替换）
 *
 * 替代八字工作区的 legacy Canvas `bazi.render`。四柱(年/月/日/时)横排，
 * 每柱天干格 + 地支格，按五行配色；日柱高亮；藏干与天干/地支五行微标。
 * 五行映射与配色对齐 legacy `CORE.stemWuxing/branchWuxing/wuxingColor`。
 */

import type { BaziPillars } from '@/legacy/canvasRenderers';

interface BaziPillarsChartProps {
  pillars: BaziPillars;
  size?: number;
}

// 天干 → 五行（对齐 legacy CORE.heavenlyStems / heavenlyStemsWuxing）
const STEM_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 地支 → 五行（对齐 legacy CORE.earthlyBranches / earthlyBranchesWuxing）
const BRANCH_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 五行配色（对齐 legacy CORE.wuxingColor / wuxingColorLight）
const WX_COLOR: Record<string, string> = { 金: '#F5D742', 木: '#4CAF50', 水: '#2196F3', 火: '#F44336', 土: '#FF9800' };
const WX_COLOR_LIGHT: Record<string, string> = { 金: '#FFF8E1', 木: '#E8F5E9', 水: '#E3F2FD', 火: '#FFEBEE', 土: '#FFF3E0' };

function stemWuxing(stem: string): string {
  return STEM_WUXING[stem] ?? '';
}
function branchWuxing(branch: string): string {
  return BRANCH_WUXING[branch] ?? '';
}

export function BaziPillarsChart({ pillars, size = 600 }: BaziPillarsChartProps) {
  const W = size;
  const H = 400;

  const cellW = 108;
  const cellGap = 14;
  const stemH = 56;
  const branchH = 56;
  const hiddenH = 34;
  const colCount = 4;
  const totalW = colCount * cellW + (colCount - 1) * cellGap;
  const startX = (W - totalW) / 2;
  const startY = 38;

  const cols = [
    { label: '年', data: pillars.year },
    { label: '月', data: pillars.month },
    { label: '日', data: pillars.day, isDay: true },
    { label: '时', data: pillars.hour },
  ];

  return (
    <svg
      data-testid="bazi-pillars-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[620px]"
      role="img"
      aria-label="八字四柱主盘"
    >
      <defs>
        <linearGradient id="bazi-bg" x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#050806" />
          <stop offset="0.55" stopColor="#0B1510" />
          <stop offset="1" stopColor="#160908" />
        </linearGradient>
        <linearGradient id="bazi-day" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,236,179,0.25)" />
          <stop offset="0.5" stopColor="rgba(255,224,130,0.40)" />
          <stop offset="1" stopColor="rgba(255,236,179,0.25)" />
        </linearGradient>
      </defs>

      {/* 背景 */}
      <rect x={0} y={0} width={W} height={H} fill="url(#bazi-bg)" stroke="rgba(219,176,83,0.22)" strokeWidth={1} />

      {/* 标题 */}
      <text x={W / 2} y={16} textAnchor="middle" dominantBaseline="middle" fill="#EAD7A4" style={{ fontSize: 18, fontWeight: 700 }}>
        八字四柱
      </text>

      {/* 逐柱 */}
      {cols.map((col, i) => {
        const d = col.data;
        if (!d) return null;
        const x = startX + i * (cellW + cellGap);
        const stemWx = stemWuxing(d.stem);
        const branchWx = branchWuxing(d.branch);
        const stemColor = WX_COLOR[stemWx] ?? '#888';
        const stemLight = WX_COLOR_LIGHT[stemWx] ?? '#222';
        const branchColor = WX_COLOR[branchWx] ?? '#888';
        const branchLight = WX_COLOR_LIGHT[branchWx] ?? '#222';

        let colH = stemH + branchH + 4;
        const hasHidden = !!(d.hidden && d.hidden.length);
        if (hasHidden) colH += hiddenH + 4;

        const branchY = startY + stemH + 4;
        const hiddenY = branchY + branchH + 18;
        const hiddenHActual = hasHidden ? Math.max(hiddenH, 18 + (d.hidden?.length ?? 0) * 2) : 0;

        return (
          <g key={col.label}>
            {/* 日柱高亮 */}
            {col.isDay && (
              <rect
                x={x - 6}
                y={startY - 6}
                width={cellW + 12}
                height={colH + 12}
                rx={10}
                fill="url(#bazi-day)"
                stroke="#D4A017"
                strokeWidth={1.5}
              />
            )}

            {/* 柱标签 */}
            <text x={x + cellW / 2} y={startY - 18} textAnchor="middle" dominantBaseline="middle" fill="#9CA39C" style={{ fontSize: 12 }}>
              {col.label}柱
            </text>

            {/* 天干 */}
            <rect x={x} y={startY} width={cellW} height={stemH} rx={6} fill={stemLight} stroke={stemColor} strokeWidth={1.5} />
            <text x={x + cellW / 2} y={startY + stemH / 2} textAnchor="middle" dominantBaseline="middle" fill={stemColor} style={{ fontSize: 30, fontWeight: 700 }}>
              {d.stem}
            </text>

            {/* 地支 */}
            <rect x={x} y={branchY} width={cellW} height={branchH} rx={6} fill={branchLight} stroke={branchColor} strokeWidth={1.5} />
            <text x={x + cellW / 2} y={branchY + branchH / 2} textAnchor="middle" dominantBaseline="middle" fill={branchColor} style={{ fontSize: 30, fontWeight: 700 }}>
              {d.branch}
            </text>

            {/* 五行微标 */}
            <text x={x + cellW / 2} y={startY + stemH + branchH + 16} textAnchor="middle" dominantBaseline="middle" fill="#8E958F" style={{ fontSize: 9 }}>
              {stemWx} / {branchWx}
            </text>

            {/* 藏干 */}
            {hasHidden && (
              <>
                <rect x={x} y={hiddenY} width={cellW} height={hiddenHActual} rx={4} fill="rgba(5,8,6,0.72)" stroke="rgba(219,176,83,0.22)" strokeWidth={1} />
                <text x={x + cellW / 2} y={hiddenY + hiddenHActual / 2} textAnchor="middle" dominantBaseline="middle" fill="#D8D0AD" style={{ fontSize: 12 }}>
                  {d.hidden?.join(' ')}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
