/**
 * FengshuiCompass — 二十四山 SVG 罗盘（Phase 10 图表替换收官）
 *
 * 替代风水工作区的 legacy Canvas `renderCompass`。三环结构：
 * 外环二十四山（阳山暖色/阴山冷色）、中环八卦符号+卦名、内环八方向，
 * 中心十字（北红南黑）。方位与配色对齐 legacy `compassRender`。
 * 「子」居正北，每山 15°，24 山按 CORE.twentyFourMountains 顺序顺时针。
 */

interface FengshuiCompassProps {
  size?: number;
}

// 二十四山（对齐 legacy CORE.twentyFourMountains）
const MOUNTAINS = [
  '壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳',
  '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥',
];

// 阳山（暖色），其余为阴山（冷色）——对齐 legacy YANG_MOUNTAINS
const YANG_MOUNTAINS = new Set(['壬', '甲', '丙', '庚', '乾', '艮', '子', '寅', '辰', '午', '申', '戌']);

// 八卦方位（对齐 legacy CORE.trigramDirection），按 deg 升序
const TRIGRAMS: { tri: string; deg: number; label: string; symbol: string }[] = [
  { tri: '坎', deg: 0, label: '北', symbol: '☵' },
  { tri: '艮', deg: 45, label: '东北', symbol: '☶' },
  { tri: '震', deg: 90, label: '东', symbol: '☳' },
  { tri: '巽', deg: 135, label: '东南', symbol: '☴' },
  { tri: '离', deg: 180, label: '南', symbol: '☲' },
  { tri: '坤', deg: 225, label: '西南', symbol: '☷' },
  { tri: '兑', deg: 270, label: '西', symbol: '☱' },
  { tri: '乾', deg: 315, label: '西北', symbol: '☰' },
];

const DEG = Math.PI / 180;

/** 环形扇区 path（deg 为数学角度，北=0 顺时针；SVG y 向下需 -90） */
function sectorPath(cx: number, cy: number, rIn: number, rOut: number, deg: number, half: number): string {
  const startDeg = deg - half - 90;
  const endDeg = deg + half - 90;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + rOut * Math.cos(toRad(startDeg));
  const y1 = cy + rOut * Math.sin(toRad(startDeg));
  const x2 = cx + rOut * Math.cos(toRad(endDeg));
  const y2 = cy + rOut * Math.sin(toRad(endDeg));
  const x3 = cx + rIn * Math.cos(toRad(endDeg));
  const y3 = cy + rIn * Math.sin(toRad(endDeg));
  const x4 = cx + rIn * Math.cos(toRad(startDeg));
  const y4 = cy + rIn * Math.sin(toRad(startDeg));
  const largeArc = half * 2 > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** 径向文字定位：返回 x/y 与旋转角度（左侧翻转避免倒读） */
function radial(cx: number, cy: number, deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const flip = deg > 90 && deg < 270;
  const rotate = flip ? deg + 180 : deg;
  return { x, y, rotate, flip };
}

export function FengshuiCompass({ size = 500 }: FengshuiCompassProps) {
  const W = size;
  const H = size;
  const cx = W / 2;
  const cy = H / 2;

  // 环半径（从外到内，对齐 legacy compassRender）
  const R1 = 235;
  const R1i = 195;
  const R2 = 190;
  const R2i = 142;
  const R3 = 138;
  const R3i = 88;
  const RC = 38;

  const centerCross = [
    { label: '北', angle: -90, color: '#D32F2F' },
    { label: '南', angle: 90, color: '#cfe9dc' },
    { label: '东', angle: 0, color: '#cfe9dc' },
    { label: '西', angle: 180, color: '#cfe9dc' },
  ];
  const lineLen = RC * 0.72;

  return (
    <svg
      data-testid="fengshui-compass"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[520px]"
      role="img"
      aria-label="二十四山风水罗盘"
    >
      {/* 背景 */}
      <circle cx={cx} cy={cy} r={R1 + 4} fill="#0b1410" stroke="#2a4a3e" strokeWidth={1.5} />

      {/* 外环：二十四山 */}
      {MOUNTAINS.map((mtn, i) => {
        const isYang = YANG_MOUNTAINS.has(mtn);
        const centerDeg = (i - 1) * 15; // 子(i=1)居 0°
        const p = radial(cx, cy, centerDeg, (R1 + R1i) / 2);
        return (
          <g key={mtn}>
            <path
              d={sectorPath(cx, cy, R1i, R1, centerDeg, 7.5)}
              fill={isYang ? '#3a2818' : '#152a3a'}
              stroke="#3a4a3a"
              strokeWidth={0.6}
            />
            <g transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.rotate})`}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isYang ? '#FFB74D' : '#64B5F6'}
                style={{ fontSize: 12 }}
              >
                {p.flip ? mtn : mtn}
              </text>
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R1} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R1i} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />

      {/* 中环：八卦符号 + 卦名 */}
      {TRIGRAMS.map((t) => {
        const pSym = radial(cx, cy, t.deg, (R2 + R2i) / 2 + 6);
        const pName = radial(cx, cy, t.deg, (R2 + R2i) / 2 - 12);
        return (
          <g key={t.tri}>
            <path
              d={sectorPath(cx, cy, R2i, R2, t.deg, 22.5)}
              fill="#16241c"
              stroke="#3a4a3a"
              strokeWidth={0.6}
            />
            <g transform={`translate(${pSym.x.toFixed(2)} ${pSym.y.toFixed(2)}) rotate(${pSym.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill="#EAD7A4" style={{ fontSize: 17 }}>
                {pSym.flip ? t.symbol : t.symbol}
              </text>
            </g>
            <g transform={`translate(${pName.x.toFixed(2)} ${pName.y.toFixed(2)}) rotate(${pName.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill="#9a8a7a" style={{ fontSize: 11 }}>
                {pName.flip ? t.tri : t.tri}
              </text>
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R2} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R2i} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />

      {/* 内环：八方向 */}
      {TRIGRAMS.map((t) => {
        const p = radial(cx, cy, t.deg, (R3 + R3i) / 2);
        return (
          <g key={`dir-${t.tri}`}>
            <path
              d={sectorPath(cx, cy, R3i, R3, t.deg, 22.5)}
              fill="#101f18"
              stroke="#3a4a3a"
              strokeWidth={0.6}
            />
            <g transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill="#cfe9dc" style={{ fontSize: 13, fontWeight: 700 }}>
                {p.flip ? t.label : t.label}
              </text>
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R3} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R3i} fill="none" stroke="#5a6a5a" strokeWidth={1.5} />

      {/* 中心十字 */}
      <circle cx={cx} cy={cy} r={RC} fill="#0b1410" stroke="#5a6a5a" strokeWidth={1.5} />
      {centerCross.map((d) => {
        const rad = d.angle * DEG;
        const x2 = cx + lineLen * Math.cos(rad);
        const y2 = cy + lineLen * Math.sin(rad);
        const lr = RC * 0.9;
        const lx = cx + lr * Math.cos(rad);
        const ly = cy + lr * Math.sin(rad);
        return (
          <g key={d.label}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={d.color} strokeWidth={d.angle === -90 ? 2.5 : 1.5} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={d.color}
              style={{ fontSize: 11, fontWeight: d.angle === -90 ? 700 : 400 }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="#cfe9dc" />
    </svg>
  );
}
