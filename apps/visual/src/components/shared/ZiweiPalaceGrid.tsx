import { useMemo } from 'react';

/**
 * ZiweiPalaceGrid — 紫微斗数十二宫 SVG 命盘（Phase 10 图表替换）
 *
 * 用 React + SVG 取代 legacy Canvas ziwei renderer，消除 Canvas 文字
 * 测量/换行的脆弱性：SVG 文字天然响应式、可选中、可访问。布局对齐刚
 * 修复的 4x4 环形十二宫（外环 12 地支各居一格，中心 2x2 信息区）。
 *
 * 数据契约与 ZiweiIztroAdapter 输出一致：palaces 按 position(地支) 定位。
 */

export interface ZiweiPalaceGridData {
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string };
  mingGua: { trigram: string; group: string };
  palaces: Record<string, { stars: string[]; position: string; miaoxian: string }>;
  sihua: Record<string, string>;
  mainStars?: string[];
}

interface ZiweiPalaceGridProps {
  data: ZiweiPalaceGridData;
  /** viewBox 尺寸（方形），默认 640 */
  size?: number;
}

// 经典紫微 4x4 环形布局：外环 12 地支顺时针，中心 2x2 为信息区。
// 顺时针：巳→午→未→申→酉→戌→亥→子→丑→寅→卯→辰→巳
const BRANCH_TO_GRID: Record<string, { col: number; row: number }> = {
  巳: { col: 0, row: 0 },
  午: { col: 1, row: 0 },
  未: { col: 2, row: 0 },
  申: { col: 3, row: 0 },
  辰: { col: 0, row: 1 },
  酉: { col: 3, row: 1 },
  卯: { col: 0, row: 2 },
  戌: { col: 3, row: 2 },
  寅: { col: 0, row: 3 },
  丑: { col: 1, row: 3 },
  子: { col: 2, row: 3 },
  亥: { col: 3, row: 3 },
};

const COLS = 4;
const ROWS = 4;

// 四化配色（与 legacy Canvas COLORS.sihua 对齐）
const SIHUA_COLOR: Record<string, string> = {
  禄: '#e76f51', // 朱砂红
  权: '#e9c46a', // 土黄
  科: '#2a9d8f', // 碧玉青
  忌: '#8d99ae', // 灰青
};

// 确定性星曜色值（HSL），同一星名始终同色——与 legacy starColor 算法一致
function starColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, 55%, 62%)`;
}

export function ZiweiPalaceGrid({ data, size = 640 }: ZiweiPalaceGridProps) {
  const cell = size / COLS;

  // 地支 → 宫位信息
  const branchToPalace = useMemo(() => {
    const map: Record<string, { name: string; stars: string[]; miaoxian: string; branch: string }> = {};
    const palaces = data.palaces || {};
    for (const pName of Object.keys(palaces)) {
      const p = palaces[pName];
      const branch = p.position || '';
      if (branch) {
        map[branch] = { name: pName, stars: p.stars || [], miaoxian: p.miaoxian || '', branch };
      }
    }
    return map;
  }, [data.palaces]);

  const sihua = data.sihua || {};

  // 中心 2x2 信息区分四象限中心点
  const center = {
    x: cell,
    y: cell,
    w: cell * 2,
    h: cell * 2,
  };
  const tlCX = center.x + center.w * 0.25;
  const trCX = center.x + center.w * 0.75;
  const blCX = center.x + center.w * 0.25;
  const brCX = center.x + center.w * 0.75;
  const tlCY = center.y + center.h * 0.25;
  const trCY = center.y + center.h * 0.25;
  const blCY = center.y + center.h * 0.75;
  const brCY = center.y + center.h * 0.75;

  const bi = data.birthInfo || ({} as ZiweiPalaceGridData['birthInfo']);
  const mingGua = data.mingGua || ({} as ZiweiPalaceGridData['mingGua']);
  const mainStars = data.mainStars || [];
  const sihuaKeys = Object.keys(sihua);

  return (
    <svg
      data-testid="ziwei-palace-grid"
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block h-auto w-full max-w-[680px]"
      role="img"
      aria-label="紫微斗数十二宫命盘"
    >
      {/* 全盘背景 */}
      <rect x={0} y={0} width={size} height={size} rx={10} fill="#0b1410" stroke="#1f3a32" strokeWidth={2} />

      {/* 外环 12 宫 */}
      {Object.entries(BRANCH_TO_GRID).map(([branch, { col, row }]) => {
        const x = col * cell;
        const y = row * cell;
        const info = branchToPalace[branch] || { name: '', stars: [], miaoxian: '', branch };
        const isAlt = (col + row) % 2 === 0;
        const maxStars = 5;
        const stars = info.stars.slice(0, maxStars);
        const starLineH = 18;
        const starStartY = y + 34;

        return (
          <g key={branch}>
            <rect
              x={x}
              y={y}
              width={cell}
              height={cell}
              fill={isAlt ? '#0f1c16' : '#0d1813'}
              stroke="#1f3a32"
              strokeWidth={0.75}
            />
            {/* 宫名（左上） */}
            <text
              x={x + 9}
              y={y + 16}
              textAnchor="start"
              dominantBaseline="middle"
              fill="#d6f5e6"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {info.name}
            </text>
            {/* 地支（右上） */}
            <text
              x={x + cell - 9}
              y={y + 16}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#5f8a7a"
              style={{ fontSize: 11 }}
            >
              {branch}
            </text>
            {/* 星曜列表 */}
            {stars.map((star, i) => {
              const sy = starStartY + i * starLineH;
              if (sy + starLineH > y + cell - 18) return null;
              const sColor = starColor(star);
              const sType = sihua[star];
              const sColorTag = sType ? SIHUA_COLOR[sType] : null;
              return (
                <g key={`${star}-${i}`}>
                  <circle cx={x + 12} cy={sy + 8} r={3.5} fill={sColor} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
                  <text
                    x={x + 21}
                    y={sy + 8}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fill="#cfe9dc"
                    style={{ fontSize: 11 }}
                  >
                    {star}
                  </text>
                  {sColorTag && (
                    <g>
                      <rect x={x + cell - 24} y={sy + 2} width={16} height={13} rx={3} fill={sColorTag} />
                      <text
                        x={x + cell - 16}
                        y={sy + 9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#0b1410"
                        style={{ fontSize: 9, fontWeight: 700 }}
                      >
                        {sType}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {/* 庙旺利得（右下） */}
            {info.miaoxian && (
              <text
                x={x + cell - 9}
                y={y + cell - 9}
                textAnchor="end"
                dominantBaseline="auto"
                fill="#7a6a52"
                style={{ fontSize: 10 }}
              >
                （{info.miaoxian}）
              </text>
            )}
          </g>
        );
      })}

      {/* 中心 2x2 信息区背景 */}
      <rect
        x={center.x}
        y={center.y}
        width={center.w}
        height={center.h}
        fill="#101f18"
        stroke="#2a4a3e"
        strokeWidth={1}
      />
      {/* 中心十字分隔 */}
      <line
        x1={center.x + center.w / 2}
        y1={center.y + 8}
        x2={center.x + center.w / 2}
        y2={center.y + center.h - 8}
        stroke="#1f3a32"
        strokeWidth={0.5}
        strokeDasharray="3 3"
      />
      <line
        x1={center.x + 8}
        y1={center.y + center.h / 2}
        x2={center.x + center.w - 8}
        y2={center.y + center.h / 2}
        stroke="#1f3a32"
        strokeWidth={0.5}
        strokeDasharray="3 3"
      />

      {/* 左上：命卦 */}
      <text x={tlCX} y={tlCY - 28} textAnchor="middle" dominantBaseline="middle" fill="#5f8a7a" style={{ fontSize: 12, fontWeight: 600 }}>
        命 卦
      </text>
      <text x={tlCX} y={tlCY} textAnchor="middle" dominantBaseline="middle" fill="#e76f51" style={{ fontSize: 24, fontWeight: 700 }}>
        {mingGua.trigram || '?'}卦
      </text>
      {mingGua.group && (
        <text x={tlCX} y={tlCY + 24} textAnchor="middle" dominantBaseline="middle" fill="#7a8a7a" style={{ fontSize: 12 }}>
          {mingGua.group}
        </text>
      )}

      {/* 右上：四化 */}
      <text x={trCX} y={trCY - 34} textAnchor="middle" dominantBaseline="middle" fill="#5f8a7a" style={{ fontSize: 12, fontWeight: 600 }}>
        四 化
      </text>
      {sihuaKeys.map((star, j) => {
        const type = sihua[star];
        const sy = trCY - 14 + j * 20;
        const tagColor = SIHUA_COLOR[type] || '#8d99ae';
        return (
          <g key={`sihua-${star}`}>
            <circle cx={trCX - 32} cy={sy} r={3.5} fill={starColor(star)} />
            <text x={trCX - 24} y={sy} textAnchor="start" dominantBaseline="middle" fill="#cfe9dc" style={{ fontSize: 11 }}>
              {star} 化{type}
            </text>
            <rect x={trCX + 22} y={sy - 7} width={15} height={13} rx={3} fill={tagColor} />
          </g>
        );
      })}

      {/* 左下：生辰 */}
      <text x={blCX} y={blCY - 28} textAnchor="middle" dominantBaseline="middle" fill="#5f8a7a" style={{ fontSize: 12, fontWeight: 600 }}>
        生 辰
      </text>
      {bi.year ? (
        <text x={blCX} y={blCY - 4} textAnchor="middle" dominantBaseline="middle" fill="#9ec9b8" style={{ fontSize: 12 }}>
          {bi.year}年{bi.month}月{bi.day}日
        </text>
      ) : null}
      {bi.hour !== undefined && (
        <text x={blCX} y={blCY + 16} textAnchor="middle" dominantBaseline="middle" fill="#7a8a7a" style={{ fontSize: 11 }}>
          {bi.hour}时 {bi.gender === '男' ? '男命' : '女命'}
        </text>
      )}

      {/* 右下：主星概览 */}
      <text x={brCX} y={brCY - 28} textAnchor="middle" dominantBaseline="middle" fill="#5f8a7a" style={{ fontSize: 12, fontWeight: 600 }}>
        主 星
      </text>
      {mainStars.slice(0, 5).map((star, ms) => (
        <text
          key={`ms-${star}-${ms}`}
          x={brCX}
          y={brCY - 10 + ms * 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#cfe9dc"
          style={{ fontSize: 11 }}
        >
          {star}
        </text>
      ))}
      {mainStars.length === 0 && (
        <text x={brCX} y={brCY} textAnchor="middle" dominantBaseline="middle" fill="#7a8a7a" style={{ fontSize: 11 }}>
          —
        </text>
      )}
    </svg>
  );
}
