import { useMemo } from 'react';
import type { YunqiData } from '@/legacy/canvasRenderers';

/**
 * YunqiChart — 五运六气 SVG 综合图（Phase 10 图表替换）
 *
 * 替代五运六气工作区的 legacy Canvas `yunqiRender`。包含标题栏、干支大字、
 * 岁运胶囊、司天/在泉、客气六步时间线、病势倾向、五行图例。
 * 病势倾向按「，」断点换行，根治 legacy Canvas 文字溢出问题。
 */

interface YunqiChartProps {
  data: YunqiData;
  size?: number;
}

// 六气 → 颜色（对齐 legacy health.js QI_COLORS / QI_COLORS_LIGHT）
const QI_COLORS: Record<string, string> = {
  厥阴风木: '#4CAF50',
  少阴君火: '#F44336',
  少阳相火: '#B71C1C',
  太阴湿土: '#FF9800',
  阳明燥金: '#9E9E9E',
  太阳寒水: '#2196F3',
};
const QI_COLORS_LIGHT: Record<string, string> = {
  厥阴风木: '#E8F5E9',
  少阴君火: '#FFEBEE',
  少阳相火: '#FFCDD2',
  太阴湿土: '#FFF3E0',
  阳明燥金: '#F5F5F5',
  太阳寒水: '#E3F2FD',
};

// 六气 → 五行归类（图例）
const QI_WUXING_MAP: Record<string, string> = {
  厥阴风木: '木',
  少阴君火: '火',
  少阳相火: '火',
  太阴湿土: '土',
  阳明燥金: '金',
  太阳寒水: '水',
};

// 五行图例顺序与配色（对齐 legacy QI_WUXING_ORDER / QI_WUXING_COLORS）
const QI_WUXING_ORDER = ['风', '寒', '暑', '湿', '燥', '火'];
const QI_WUXING_COLORS: Record<string, string> = {
  风: '#4CAF50',
  寒: '#2196F3',
  暑: '#F44336',
  湿: '#FF9800',
  燥: '#9E9E9E',
  火: '#B71C1C',
};

/** 从岁运名提取五行（如 "水运太过" → "水"） */
function extractWuxing(dayun: string): string {
  const chars = ['金', '木', '水', '火', '土'];
  for (const c of chars) {
    if (dayun.indexOf(c) !== -1) return c;
  }
  return '土';
}

const WX_COLOR: Record<string, string> = { 金: '#F5D742', 木: '#4CAF50', 水: '#2196F3', 火: '#F44336', 土: '#FF9800' };
const WX_COLOR_LIGHT: Record<string, string> = { 金: '#FFF8E1', 木: '#E8F5E9', 水: '#E3F2FD', 火: '#FFEBEE', 土: '#FFF3E0' };

/** 病势倾向按「，」断点换行，每行不超过 maxChars 字符 */
function wrapTendency(text: string, maxChars: number): string[] {
  const segs = text.split('，');
  const lines: string[] = [];
  let cur = '';
  for (const seg of segs) {
    const candidate = cur ? cur + '，' + seg : seg;
    if (candidate.length <= maxChars || !cur) {
      cur = candidate;
    } else {
      lines.push(cur);
      cur = seg;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function YunqiChart({ data, size = 550 }: YunqiChartProps) {
  const W = size;
  const H = 460;

  const year = data.year;
  const tiangan = data.tiangan;
  const dizhi = data.dizhi;
  const wuyun = data.wuyun;
  const liuqi = data.liuqi;
  const diseaseTendency = data.disease_tendency || '';

  const yearChars = tiangan + dizhi;
  const dayunWx = extractWuxing(wuyun.dayun);
  const wxColor = WX_COLOR[dayunWx] ?? '#888';
  const wxLight = WX_COLOR_LIGHT[dayunWx] ?? '#222';

  const steps = liuqi.zhuke || [];
  const segGap = 4;
  const segTotalW = W - 40;
  const segCount = steps.length || 1;
  const segW = (segTotalW - (segCount - 1) * segGap) / segCount;
  const segX0 = 20;
  const segY = 258;
  const segH = 115;

  const legendY = 420;
  const legendSpacing = 62;
  const legendCount = QI_WUXING_ORDER.length;
  const legendTotalW = legendCount * legendSpacing;
  const legendStartX = (W - legendTotalW) / 2 + legendSpacing / 2;

  // 病势倾向换行
  const tendencyLines = useMemo(() => (diseaseTendency ? wrapTendency(diseaseTendency, 14) : []), [diseaseTendency]);
  const tendY = 388;
  const tendLineH = 14;

  return (
    <svg
      data-testid="yunqi-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[580px]"
      role="img"
      aria-label={`五运六气 ${year}年 ${yearChars}`}
    >
      {/* 背景 */}
      <defs>
        <linearGradient id="yunqi-bg" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0" stopColor="#0b1410" />
          <stop offset="0.5" stopColor="#0f1c16" />
          <stop offset="1" stopColor="#0b1410" />
        </linearGradient>
      </defs>
      <rect x={3} y={3} width={W - 6} height={H - 6} rx={10} fill="url(#yunqi-bg)" stroke="#2a4a3e" strokeWidth={1} />

      {/* 标题栏 */}
      <rect x={3} y={3} width={W - 6} height={34} rx={10} fill="#1a2a22" />
      <text x={W / 2} y={20} textAnchor="middle" dominantBaseline="middle" fill="#EAD7A4" style={{ fontSize: 15, fontWeight: 700 }}>
        五运六气 · {year}年
      </text>

      {/* 干支大字 */}
      <text x={W / 2} y={70} textAnchor="middle" dominantBaseline="middle" fill="#cfe9dc" style={{ fontSize: 42, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun",serif' }}>
        {yearChars}
      </text>

      {/* 岁运胶囊 */}
      <rect x={(W - 210) / 2} y={90} width={210} height={30} rx={15} fill={wxLight} stroke={wxColor} strokeWidth={1.5} />
      <text x={W / 2} y={105} textAnchor="middle" dominantBaseline="middle" fill={wxColor} style={{ fontSize: 13, fontWeight: 700 }}>
        {yearChars}　{wuyun.dayun}
      </text>

      {/* 分隔虚线 1 */}
      <line x1={30} y1={126} x2={W - 30} y2={126} stroke="#2a4a3e" strokeWidth={0.5} strokeDasharray="3 3" />
      <text x={W / 2} y={138} textAnchor="middle" dominantBaseline="middle" fill="#7a8a7a" style={{ fontSize: 10 }}>
        司天 · 在泉
      </text>

      {/* 司天 */}
      <rect x={W / 2 - 90} y={150} width={180} height={28} rx={6} fill="#1a1212" stroke="#E53935" strokeWidth={1.5} />
      <text x={W / 2} y={164} textAnchor="middle" dominantBaseline="middle" fill="#ef5350" style={{ fontSize: 12, fontWeight: 700 }}>
        司天　{liuqi.sitian}
      </text>
      {/* 箭头 */}
      <line x1={W / 2} y1={180} x2={W / 2} y2={196} stroke="#E53935" strokeWidth={1.5} markerEnd="url(#yunqi-arrow)" />
      {/* 在泉 */}
      <rect x={W / 2 - 90} y={198} width={180} height={28} rx={6} fill="#1a1410" stroke="#F57C00" strokeWidth={1.5} />
      <text x={W / 2} y={212} textAnchor="middle" dominantBaseline="middle" fill="#FF9800" style={{ fontSize: 12, fontWeight: 700 }}>
        在泉　{liuqi.zaiquan}
      </text>

      {/* 分隔虚线 2 */}
      <line x1={30} y1={234} x2={W - 30} y2={234} stroke="#2a4a3e" strokeWidth={0.5} strokeDasharray="3 3" />
      <text x={W / 2} y={246} textAnchor="middle" dominantBaseline="middle" fill="#7a8a7a" style={{ fontSize: 10 }}>
        客气六步
      </text>

      {/* 客气六步时间线 */}
      {steps.map((step, i) => {
        const sX = segX0 + i * (segW + segGap);
        const qiName = step.qi;
        const fullColor = QI_COLORS[qiName] ?? '#9E9E9E';
        const lightColor = QI_COLORS_LIGHT[qiName] ?? '#222';
        const wxLabel = QI_WUXING_MAP[qiName] ?? '';
        return (
          <g key={i}>
            <rect x={sX} y={segY} width={segW} height={segH} rx={6} fill={lightColor} stroke={fullColor} strokeWidth={1.5} />
            {/* 顶部彩条 */}
            <rect x={sX + 1} y={segY + 1} width={segW - 2} height={6} rx={3} fill={fullColor} />
            {/* 六气名 */}
            <text x={sX + segW / 2} y={segY + 32} textAnchor="middle" dominantBaseline="middle" fill={fullColor} style={{ fontSize: 11, fontWeight: 700 }}>
              {qiName}
            </text>
            {/* 五行标 */}
            {wxLabel && (
              <text x={sX + segW / 2} y={segY + 48} textAnchor="middle" dominantBaseline="middle" fill={fullColor} style={{ fontSize: 8 }}>
                [{wxLabel}]
              </text>
            )}
            {/* 步名 */}
            <text x={sX + segW / 2} y={segY + 64} textAnchor="middle" dominantBaseline="middle" fill="#8a9a8a" style={{ fontSize: 10 }}>
              {step.step}
            </text>
            {/* 节气范围 */}
            <text x={sX + segW / 2} y={segY + 80} textAnchor="middle" dominantBaseline="middle" fill="#6a7a6a" style={{ fontSize: 8 }}>
              {step.start}→{step.end}
            </text>
            {/* 底部圆点 */}
            <circle cx={sX + segW / 2} cy={segY + segH - 12} r={3} fill={fullColor} />
          </g>
        );
      })}

      {/* 病势倾向 */}
      {tendencyLines.length > 0 && (
        <g>
          <rect
            x={(W - Math.min(W - 40, 200)) / 2}
            y={tendY}
            width={Math.min(W - 40, 200)}
            height={tendencyLines.length * tendLineH + 10}
            rx={11}
            fill="#2a1610"
            stroke="#E65100"
            strokeWidth={1}
          />
          {tendencyLines.map((line, li) => (
            <text
              key={li}
              x={W / 2}
              y={tendY + 10 + li * tendLineH}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FFAB91"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {li === 0 ? `病势倾向  ${line}` : line}
            </text>
          ))}
        </g>
      )}

      {/* 图例 */}
      {QI_WUXING_ORDER.map((label, li) => {
        const lx = legendStartX + li * legendSpacing;
        const lColor = QI_WUXING_COLORS[label];
        return (
          <g key={label}>
            <circle cx={lx - 14} cy={legendY} r={4} fill={lColor} />
            <text x={lx} y={legendY} textAnchor="middle" dominantBaseline="middle" fill="#6a7a6a" style={{ fontSize: 9 }}>
              {label}
            </text>
          </g>
        );
      })}

      <defs>
        <marker id="yunqi-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,4 L0,8 Z" fill="#E53935" />
        </marker>
      </defs>
    </svg>
  );
}
