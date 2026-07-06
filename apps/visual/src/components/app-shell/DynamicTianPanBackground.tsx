import type { CSSProperties } from 'react';

type TianPanStyle = CSSProperties & {
  '--tick-index'?: number;
  '--label-angle'?: string;
  '--star-index'?: number;
  '--star-x'?: string;
  '--star-y'?: string;
  '--star-size'?: string;
};

const TICKS = Array.from({ length: 24 }, (_, index) => index);
const STARS = Array.from({ length: 72 }, (_, index) => index);
const RUNE_ROWS = Array.from({ length: 8 }, (_, index) => index);

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

const TALISMANS = ['太一玄坛', '上清真炁', '北斗注生', '三元合真', '九天应元', '玉清敕令'];
const RUNE_TEXT = '乾坤震巽坎离艮兑';

/**
 * 动态天盘气场背景。
 * 设计目标：用玄黑、青绿、朱砂、鎏金和符箓光层表达道教神秘感，
 * 同时保持 Dashboard 的文字与 Canvas 可读性。所有动画均由 CSS 驱动，并在 reduced-motion 下静止。
 */
export function DynamicTianPanBackground() {
  return (
    <div className="dynamic-tianpan-background" aria-hidden="true">
      <div className="tianpan-aurora" />
      <div className="tianpan-veil" />
      <div className="tianpan-lightning tianpan-lightning-left" />
      <div className="tianpan-lightning tianpan-lightning-right" />
      <div className="tianpan-qi tianpan-qi-wood" />
      <div className="tianpan-qi tianpan-qi-fire" />
      <div className="tianpan-qi tianpan-qi-earth" />
      <div className="tianpan-qi tianpan-qi-metal" />
      <div className="tianpan-qi tianpan-qi-water" />
      <div className="tianpan-grid-field" />

      <div className="tianpan-starfield">
        {STARS.map((star) => (
          <span
            key={star}
            className="tianpan-star"
            style={{
              '--star-index': star,
              '--star-x': ((star * 37) % 100) + '%',
              '--star-y': ((star * 61) % 100) + '%',
              '--star-size': 1 + (star % 3) + 'px',
            } as TianPanStyle}
          />
        ))}
      </div>

      <div className="tianpan-rune-curtain">
        {RUNE_ROWS.map((row) => (
          <span key={row} style={{ '--star-index': row } as TianPanStyle}>{RUNE_TEXT}</span>
        ))}
      </div>

      <div className="tianpan-talisman-field">
        {TALISMANS.map((text) => (
          <span key={text} className="tianpan-talisman">{text}</span>
        ))}
      </div>

      <div className="tianpan-disc">
        <div className="tianpan-bagua-ring" />
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
              style={{ '--label-angle': item.angle + 'deg' } as TianPanStyle}
            >
              {item.label}
            </span>
          ))}
        </div>
        <div className="tianpan-trigram tianpan-trigram-1">☰</div>
        <div className="tianpan-trigram tianpan-trigram-2">☷</div>
        <div className="tianpan-trigram tianpan-trigram-3">☵</div>
        <div className="tianpan-trigram tianpan-trigram-4">☲</div>
        <div className="tianpan-seal">玄坛</div>
      </div>

      <div className="tianpan-noise" />
    </div>
  );
}
