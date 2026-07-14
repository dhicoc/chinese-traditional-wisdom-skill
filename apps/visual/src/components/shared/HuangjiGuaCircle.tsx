import { useState } from 'react';

/**
 * HuangjiGuaCircle — 皇极经世先天六十四卦圆图 SVG
 *
 * 邵雍先天六十四卦圆图：64卦围成一圈，每卦6爻（阳实阴虚），
 * 当前正卦（金色）、世卦（玉色）、年卦（朱砂色）高亮，其余淡显。
 * 中心显示会/运/世 + 积年 + 选中卦名。点击卦位切换详情。
 *
 * 数据自包含：先天64卦序 + 6位7/8爻码（与 huangjiEngine GUA_CODE 对齐）。
 */

// 先天六十四卦序（邵雍圆图顺序，乾起逆时针）
const XIANTIAN_64: string[] =
  '乾,夬,大有,大壯,小畜,需,大畜,泰,履,兌,睽,歸妹,中孚,節,損,臨,同人,革,離,豐,家人,既濟,賁,明夷,无妄,隨,噬嗑,震,益,屯,頤,復,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,坎,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝,坤'.split(',');

// 64卦6位爻码（7阳8阴，从下到上）——与 huangjiEngine GUA_CODE 同源
const GUA_CODE: Record<string, string> = {
  '乾': '777777', '坤': '888888', '屯': '787877', '蒙': '778787',
  '需': '777787', '訟': '787777', '師': '888787', '比': '787888',
  '小畜': '788777', '履': '777887', '泰': '888777', '否': '777888',
  '同人': '777878', '大有': '878777', '謙': '888778', '豫': '877888',
  '隨': '887877', '蠱': '778788', '臨': '888887', '觀': '788888',
  '噬嗑': '878877', '賁': '778878', '剝': '888778', '復': '877888',
  '无妄': '777877', '大畜': '778777', '頤': '778877', '大過': '887788',
  '坎': '787787', '離': '878878', '咸': '887778', '恆': '788877',
  '遯': '777778', '大壯': '877777', '晉': '888878', '明夷': '878888',
  '家人': '788878', '睽': '878887', '蹇': '787778', '解': '877787',
  '損': '778887', '益': '788877', '夬': '887777', '姤': '777788',
  '萃': '888887', '升': '788888', '困': '787887', '井': '788787',
  '革': '878887', '鼎': '788878', '震': '877877', '艮': '778778',
  '漸': '788778', '歸妹': '887877', '豐': '878877', '旅': '778878',
  '巽': '788788', '兌': '887887', '渙': '788787', '節': '787887',
  '中孚': '887788', '小過': '778877', '既濟': '787878', '未濟': '878787',
};

export interface HuangjiGuaCircleProps {
  /** 当前正卦（金色高亮） */
  zhengGua: string;
  /** 当前世卦（玉色高亮） */
  shiGua: string;
  /** 当前年卦（朱砂色高亮） */
  yearGua: string;
  /** 会/运/世（中心显示） */
  hui: number;
  yun: number;
  shi: number;
  /** 积年（中心显示） */
  acumYear: number;
  /** viewBox 尺寸，默认 420 */
  size?: number;
}

// 高亮类型配色
const HIGHLIGHT: Record<string, { ring: string; label: string; text: string }> = {
  zheng: { ring: '#d4a857', label: '正卦', text: '#e8b988' },   // 金
  shi: { ring: '#5fb8a8', label: '世卦', text: '#7fd0c0' },      // 玉
  year: { ring: '#c95a4a', label: '年卦', text: '#d97565' },     // 朱砂
};

export function HuangjiGuaCircle({ zhengGua, shiGua, yearGua, hui, yun, shi, acumYear, size = 420 }: HuangjiGuaCircleProps) {
  const [selected, setSelected] = useState<string>(zhengGua);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;       // 卦象中心圆半径
  const innerRadius = radius - 38;     // 内圈（爻象内沿）

  // 卦的高亮类型
  const highlightOf = (name: string): keyof typeof HIGHLIGHT | null => {
    if (name === zhengGua) return 'zheng';
    if (name === shiGua) return 'shi';
    if (name === yearGua) return 'year';
    return null;
  };

  const selectedHL = highlightOf(selected);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full select-none"
      data-testid="huangji-gua-circle"
      role="img"
      aria-label="皇极经世先天六十四卦圆图"
    >
      {/* 外圈装饰环 */}
      <circle cx={cx} cy={cy} r={radius + 18} fill="none" stroke="#b87a4a" strokeWidth={0.6} strokeOpacity={0.25} />
      <circle cx={cx} cy={cy} r={radius + 6} fill="none" stroke="#b87a4a" strokeWidth={0.4} strokeOpacity={0.15} />

      {/* 64卦围圈 */}
      {XIANTIAN_64.map((name, i) => {
        const angle = (i / 64) * 2 * Math.PI - Math.PI / 2; // 乾在正上
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const hl = highlightOf(name);
        const isSel = name === selected;
        const code = GUA_CODE[name] ?? '777777';
        const dim = hl ? 1 : 0.4;
        // 爻象小条：6爻从下到上，垂直排列在卦位处
        const yaoW = 10;
        const yaoH = 1.8;
        const yaoGap = 0.8;
        const yaoStartY = y - (6 * yaoH + 5 * yaoGap) / 2;
        return (
          <g
            key={name}
            transform={`translate(${x} ${y})`}
            className="cursor-pointer"
            onClick={() => setSelected(name)}
          >
            {/* 高亮环 */}
            {hl && (
              <circle r={15} fill="none" stroke={HIGHLIGHT[hl].ring} strokeWidth={1.5} strokeOpacity={0.9} />
            )}
            {isSel && !hl && (
              <circle r={14} fill="none" stroke="#9d7ad6" strokeWidth={1} strokeOpacity={0.6} />
            )}
            {/* 6爻 */}
            {code.split('').map((c, yi) => {
              const yy = yaoStartY + yi * (yaoH + yaoGap) - y;
              const isYang = c === '7';
              return isYang ? (
                <rect
                  key={yi}
                  x={-yaoW / 2}
                  y={yy}
                  width={yaoW}
                  height={yaoH}
                  fill={hl ? HIGHLIGHT[hl].ring : '#7a8a7e'}
                  fillOpacity={dim}
                />
              ) : (
                <g key={yi} fillOpacity={dim} fill={hl ? HIGHLIGHT[hl].ring : '#7a8a7e'}>
                  <rect x={-yaoW / 2} y={yy} width={yaoW * 0.42} height={yaoH} />
                  <rect x={yaoW * 0.08} y={yy} width={yaoW * 0.42} height={yaoH} />
                </g>
              );
            })}
            {/* 卦名（仅高亮/选中显示，避免拥挤） */}
            {(hl || isSel) && (
              <text
                y={20}
                textAnchor="middle"
                fontSize={7.5}
                fill={hl ? HIGHLIGHT[hl].text : '#c9b2d6'}
                fontWeight={hl ? 600 : 400}
              >
                {name}
              </text>
            )}
          </g>
        );
      })}

      {/* 中心信息圆 */}
      <circle cx={cx} cy={cy} r={innerRadius - 6} fill="#0d1410" stroke="#b87a4a" strokeWidth={0.8} strokeOpacity={0.3} />
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize={11} fill="#d9a574" fontWeight={600}>皇极经世</text>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill="#9fb0a4">
        第{hui}会 · 第{yun}运 · 第{shi}世
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={8} fill="#7a8a7e">积年 {acumYear}</text>
      {/* 选中卦名 */}
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily="serif"
        fill={selectedHL ? HIGHLIGHT[selectedHL].text : '#c9b2d6'}>
        {selected}
      </text>
      {selectedHL && (
        <text x={cx} y={cy + 46} textAnchor="middle" fontSize={7.5} fill={HIGHLIGHT[selectedHL].ring}>
          {HIGHLIGHT[selectedHL].label}
        </text>
      )}

      {/* 图例 */}
      <g transform={`translate(${cx - 60} ${size - 12})`} fontSize={7} fill="#7a8a7e">
        <circle cx={0} cy={0} r={4} fill="none" stroke="#d4a857" strokeWidth={1.2} /><text x={8} y={2.5}>正卦·主运</text>
        <circle cx={50} cy={0} r={4} fill="none" stroke="#5fb8a8" strokeWidth={1.2} /><text x={58} y={2.5}>世卦·主世</text>
        <circle cx={100} cy={0} r={4} fill="none" stroke="#c95a4a" strokeWidth={1.2} /><text x={108} y={2.5}>年卦·本年</text>
      </g>
    </svg>
  );
}
