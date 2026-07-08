/**
 * BaziPillarsChart — 八字四柱 SVG 主盘（Phase 10，重设计 v2）
 *
 * 设计口径对齐 TASTE_SKILL_UI「Academic Dark Mode」与其它 SVG 组件
 * (RadarChart/ZiweiPalaceGrid)：暗色卡片底 + 低饱和五行色 + 衬线大字。
 *
 * 每柱结构：柱标签 → 天干格（衬线大字 + 左侧五行色竖条）→ 地支格
 * （同上）→ 藏干行（五行色点 + 小字）。日柱以金色竖条 + 柔和高亮边框
 * 标识。五行色采用 TASTE_SKILL_UI 低饱和 token，而非 Material 鲜艳色。
 */

import type { BaziPillars } from '@/legacy/canvasRenderers';

interface BaziPillarsChartProps {
  pillars: BaziPillars;
  size?: number;
}

// 天干 → 五行（对齐 legacy CORE.stemWuxing）
const STEM_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 地支 → 五行（对齐 legacy CORE.branchWuxing）
const BRANCH_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 五行低饱和色（对齐 TASTE_SKILL_UI 五行 token）
const WX_COLOR: Record<string, string> = {
  木: '#2a9d8f',
  火: '#e76f51',
  土: '#e9c46a',
  金: '#e5e5e5',
  水: '#264653',
};

// 五行浅色（用于极轻底纹，保持暗主题基调）
const WX_TINT: Record<string, string> = {
  木: 'rgba(42,157,143,0.10)',
  火: 'rgba(231,111,81,0.10)',
  土: 'rgba(233,196,106,0.10)',
  金: 'rgba(229,229,229,0.08)',
  水: 'rgba(38,70,83,0.18)',
};

function stemWuxing(stem: string): string {
  return STEM_WUXING[stem] ?? '';
}
function branchWuxing(branch: string): string {
  return BRANCH_WUXING[branch] ?? '';
}

const DAY_ACCENT = '#d6b760'; // 日柱金色点缀

export function BaziPillarsChart({ pillars, size = 620 }: BaziPillarsChartProps) {
  const W = size;
  const H = 460;

  const colCount = 4;
  const cellW = 132;
  const cellGap = 20;
  const stemH = 128;
  const branchH = 128;
  const colContentH = stemH + 10 + branchH;
  const totalW = colCount * cellW + (colCount - 1) * cellGap;
  const startX = (W - totalW) / 2;
  const startY = 64;

  const cols = [
    { label: '年柱', data: pillars.year },
    { label: '月柱', data: pillars.month },
    { label: '日柱', data: pillars.day, isDay: true },
    { label: '时柱', data: pillars.hour },
  ];

  return (
    <svg
      data-testid="bazi-pillars-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[660px]"
      role="img"
      aria-label="八字四柱主盘"
    >
      <defs>
        <linearGradient id="bazi-bg-v2" x1="0" y1="0" x2={0} y2={H}>
          <stop offset="0" stopColor="#0b1410" />
          <stop offset="1" stopColor="#0a120e" />
        </linearGradient>
        <linearGradient id="bazi-day-tint" x1="0" y1="0" x2={0} y2={1}>
          <stop offset="0" stopColor="rgba(214,183,96,0.14)" />
          <stop offset="1" stopColor="rgba(214,183,96,0.04)" />
        </linearGradient>
      </defs>

      {/* 背景 */}
      <rect x={0} y={0} width={W} height={H} rx={12} fill="url(#bazi-bg-v2)" stroke="rgba(44,159,132,0.16)" strokeWidth={1} />

      {/* 标题 */}
      <text x={W / 2} y={26} textAnchor="middle" dominantBaseline="middle" fill="#e6f2ec" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>
        八字四柱
      </text>
      <line x1={W / 2 - 40} y1={40} x2={W / 2 + 40} y2={40} stroke="rgba(44,159,132,0.35)" strokeWidth={1} />

      {/* 逐柱 */}
      {cols.map((col, i) => {
        const d = col.data;
        if (!d) return null;
        const x = startX + i * (cellW + cellGap);
        const stemWx = stemWuxing(d.stem);
        const branchWx = branchWuxing(d.branch);
        const stemColor = WX_COLOR[stemWx] ?? '#8a9a8a';
        const stemTint = WX_TINT[stemWx] ?? 'transparent';
        const branchColor = WX_COLOR[branchWx] ?? '#8a9a8a';
        const branchTint = WX_TINT[branchWx] ?? 'transparent';
        const accent = col.isDay ? DAY_ACCENT : null;

        const branchY = startY + stemH + 10;
        const hiddenY = branchY + branchH + 22;
        const hidden = d.hidden ?? [];
        const barW = 4;

        return (
          <g key={col.label}>
            {/* 柱标签 */}
            <text x={x + cellW / 2} y={startY - 16} textAnchor="middle" dominantBaseline="middle" fill={accent ?? '#7a8a7a'} style={{ fontSize: 11, fontWeight: accent ? 700 : 400, letterSpacing: 1 }}>
              {col.label}
            </text>

            {/* 天干格 */}
            <rect x={x} y={startY} width={cellW} height={stemH} rx={8} fill={accent ? 'url(#bazi-day-tint)' : stemTint} stroke={accent ?? 'rgba(44,159,132,0.22)'} strokeWidth={accent ? 1.5 : 1} />
            {/* 左侧五行色竖条 */}
            <rect x={x} y={startY + 8} width={barW} height={stemH - 16} rx={2} fill={stemColor} />
            {/* 五行小标（右上角） */}
            <text x={x + cellW - 10} y={startY + 12} textAnchor="end" dominantBaseline="middle" fill={stemColor} style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>
              {stemWx}
            </text>
            {/* 天干大字（衬线） */}
            <text x={x + cellW / 2 + 4} y={startY + stemH / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill="#e6f2ec" style={{ fontSize: 48, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {d.stem}
            </text>

            {/* 地支格 */}
            <rect x={x} y={branchY} width={cellW} height={branchH} rx={8} fill={branchTint} stroke={accent ?? 'rgba(44,159,132,0.22)'} strokeWidth={accent ? 1.5 : 1} />
            <rect x={x} y={branchY + 8} width={barW} height={branchH - 16} rx={2} fill={branchColor} />
            <text x={x + cellW - 10} y={branchY + 12} textAnchor="end" dominantBaseline="middle" fill={branchColor} style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>
              {branchWx}
            </text>
            <text x={x + cellW / 2 + 4} y={branchY + branchH / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill="#e6f2ec" style={{ fontSize: 48, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {d.branch}
            </text>

            {/* 藏干行：五行色点 + 小字横排 */}
            {hidden.length > 0 && (
              <g>
                {hidden.map((h, hi) => {
                  const hw = cellW - 16;
                  const slot = hw / hidden.length;
                  const hx = x + 8 + slot * hi + slot / 2;
                  const hwColor = WX_COLOR[stemWuxing(h)] ?? '#8a9a8a';
                  return (
                    <g key={hi}>
                      <circle cx={hx - slot / 2 + 4} cy={hiddenY + 8} r={3} fill={hwColor} />
                      <text x={hx + 2} y={hiddenY + 8} textAnchor="middle" dominantBaseline="middle" fill="#b6c9bf" style={{ fontSize: 11, fontFamily: '"Noto Serif SC","SimSun",serif' }}>
                        {h}
                      </text>
                    </g>
                  );
                })}
                <text x={x + cellW / 2} y={hiddenY + 24} textAnchor="middle" dominantBaseline="middle" fill="#5a6a5a" style={{ fontSize: 8 }}>
                  藏干
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
