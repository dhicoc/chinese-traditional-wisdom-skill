import type { CSSProperties } from 'react';

type TianPanStyle = CSSProperties & {
  '--tick-index'?: number;
  '--label-angle'?: string;
};

const TICKS = Array.from({ length: 24 }, (_, index) => index);

const DIRECTION_LABELS = [
  { label: '子', angle: 0 },
  { label: '艮', angle: 45 },
  { label: '卯', angle: 90 },
  { label: '巽', angle: 135 },
  { label: '午', angle: 180 },
  { label: '坤', angle: 225 },
  { label: '酉', angle: 270 },
  { label: '乾', angle: 315 },
];

/**
 * 动态天盘气场背景。
 * 设计目标：用低亮度天盘刻度、五行气机和仪器网格表达“天人合一”和本地确定性排盘，
 * 同时保持 Dashboard 的可读性。所有动画均由 CSS 驱动，并在 reduced-motion 下静止。
 */
export function DynamicTianPanBackground() {
  return (
    <div className="dynamic-tianpan-background" aria-hidden="true">
      <div className="tianpan-qi tianpan-qi-wood" />
      <div className="tianpan-qi tianpan-qi-fire" />
      <div className="tianpan-qi tianpan-qi-earth" />
      <div className="tianpan-qi tianpan-qi-metal" />
      <div className="tianpan-qi tianpan-qi-water" />
      <div className="tianpan-grid-field" />

      <div className="tianpan-disc">
        <div className="tianpan-ring tianpan-ring-outer" />
        <div className="tianpan-ring tianpan-ring-middle" />
        <div className="tianpan-ring tianpan-ring-inner" />
        <div className="tianpan-crosshair" />
        <div className="tianpan-ticks">
          {TICKS.map((tick) => (
            <span key={tick} className="tianpan-tick" style={{ '--tick-index': tick } as TianPanStyle} />
          ))}
        </div>
        <div className="tianpan-labels">
          {DIRECTION_LABELS.map((item) => (
            <span
              key={item.label}
              className="tianpan-label"
              style={{ '--label-angle': `${item.angle}deg` } as TianPanStyle}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="tianpan-noise" />
    </div>
  );
}

