import { useMemo } from 'react';

/**
 * RadarChart — 可复用 SVG 雷达图（Phase 10）
 *
 * 替代体质辨识等场景的 legacy Canvas 雷达图。
 * 纯 React + SVG，无外部依赖，确定性渲染。
 */

export interface RadarAxis {
  label: string;
  value: number;
  max?: number;
}

interface RadarChartProps {
  axes: RadarAxis[];
  /** 0..1 的整体缩放，默认 1 */
  size?: number;
  /** 同心环数量 */
  rings?: number;
  /** 高亮轴索引（主要体质等），可选 */
  highlightIndex?: number;
  /** 整体标题 */
  title?: string;
}

const DEFAULT_SIZE = 380;
const DEFAULT_RINGS = 5;
const LABEL_RADIUS_FACTOR = 1.18;

export function RadarChart({
  axes,
  size = DEFAULT_SIZE,
  rings = DEFAULT_RINGS,
  highlightIndex,
  title,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 48;

  const n = axes.length;
  const angleStep = (Math.PI * 2) / n;

  // 每个轴的顶点角度（从正上方开始，顺时针）
  const points = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const max = axis.max ?? 100;
      const ratio = Math.max(0, Math.min(1, axis.value / max));
      const r = radius * ratio;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        labelX: cx + radius * LABEL_RADIUS_FACTOR * Math.cos(angle),
        labelY: cy + radius * LABEL_RADIUS_FACTOR * Math.sin(angle),
        axisX: cx + radius * Math.cos(angle),
        axisY: cy + radius * Math.sin(angle),
        angle,
        ratio,
      };
    });
  }, [axes, angleStep, cx, cy, radius]);

  const polygonPoints = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  const ringRadii = useMemo(
    () => Array.from({ length: rings }, (_, i) => radius * ((i + 1) / rings)),
    [radius, rings],
  );

  return (
    <svg
      data-testid="radar-chart"
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block w-full max-w-[420px]"
      role="img"
      aria-label={title ?? '雷达图'}
    >
      {/* 同心环 */}
      {ringRadii.map((r, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill={i === 0 ? 'rgba(44,159,132,0.04)' : 'none'}
          stroke="rgba(44,159,132,0.18)"
          strokeWidth={1}
          strokeDasharray={i === rings - 1 ? '0' : '2 3'}
        />
      ))}

      {/* 轴线 */}
      {points.map((p, i) => (
        <line
          key={`axis-${i}`}
          x1={cx}
          y1={cy}
          x2={p.axisX}
          y2={p.axisY}
          stroke="rgba(44,159,132,0.22)"
          strokeWidth={1}
        />
      ))}

      {/* 数据多边形 */}
      <polygon
        data-testid="radar-polygon"
        points={polygonPoints}
        fill="rgba(44,159,132,0.22)"
        stroke="rgb(44,159,132)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* 数据点 */}
      {points.map((p, i) => (
        <circle
          key={`point-${i}`}
          cx={p.x}
          cy={p.y}
          r={highlightIndex === i ? 5 : 3}
          fill={highlightIndex === i ? 'rgb(214,183,96)' : 'rgb(158,240,214)'}
          stroke={highlightIndex === i ? 'rgb(214,183,96)' : 'rgb(44,159,132)'}
          strokeWidth={1.5}
        />
      ))}

      {/* 轴标签 */}
      {points.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.labelX}
          y={p.labelY}
          textAnchor={Math.abs(p.labelX - cx) < 8 ? 'middle' : p.labelX > cx ? 'start' : 'end'}
          dominantBaseline="middle"
          className="fill-jade-100/70"
          style={{ fontSize: 11, fontWeight: highlightIndex === i ? 600 : 400 }}
        >
          {axes[i].label}
        </text>
      ))}

      {/* 中心点 */}
      <circle cx={cx} cy={cy} r={2} fill="rgba(44,159,132,0.5)" />
    </svg>
  );
}
