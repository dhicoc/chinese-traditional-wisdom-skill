import type { TianDiPanInfo, SiKeInfo, SanChuanInfo } from '@/legacy/daliurenEngine';

/**
 * DaliurenChart — 大六壬天地盘 SVG 式盘
 *
 * 布局：4×3 方阵（12宫），每宫显示 天将/天盘地支/地盘地支，
 * 中心区域显示三传四课，三传宫位金色高亮。
 *
 * 参考来源：kinliuren 式盘结构（MIT License），按本项目 SVG 模式重写。
 */

interface DaliurenChartProps {
  tianDiPan: TianDiPanInfo;
  siKe: SiKeInfo;
  sanChuan: SanChuanInfo;
  hourZhi: string;
  yueJiangName: string;
  geJu: string;
  geJuDetail: string;
  dayNight: string;
}

const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 12宫在4×3方阵中的位置（row, col），对齐传统方位：上南/下北/左东/右西 */
const PALACE_POS: Record<string, [number, number]> = {
  '巳': [0, 0], '午': [0, 1], '未': [0, 2], '申': [0, 3],
  '辰': [1, 0],                         '酉': [1, 3],
  '卯': [2, 0],                         '戌': [2, 3],
  '寅': [3, 0], '丑': [3, 1], '子': [3, 2], '亥': [3, 3],
};

const JIANG_FULL: Record<string, string> = {
  '贵': '贵人', '蛇': '螣蛇', '雀': '朱雀', '合': '六合',
  '勾': '勾陈', '龙': '青龙', '空': '天空', '虎': '白虎',
  '常': '太常', '玄': '玄武', '阴': '太阴', '后': '天后',
};

const RELATION_COLOR: Record<string, string> = {
  '上克下': '#e0504a',
  '下贼上': '#e0504a',
  '比和': '#888',
  '上生下': '#3cb4a0',
  '下生上': '#3cb4a0',
};

export function DaliurenChart({
  tianDiPan, siKe, sanChuan, hourZhi, yueJiangName, geJu, geJuDetail, dayNight,
}: DaliurenChartProps) {
  const SIZE = 520;
  const CELL = 100;
  const GAP = 4;
  const CENTER_X = SIZE / 2;
  const PAD = 10;

  // 12宫中心坐标
  function cellCenter(dz: string): { x: number; y: number } {
    const [row, col] = PALACE_POS[dz] ?? [0, 0];
    const x = PAD + col * (CELL + GAP) + CELL / 2;
    const y = PAD + row * (CELL + GAP) + CELL / 2;
    return { x, y };
  }

  // 中心区域（2×2 格的位置）
  const centerX = PAD + 1 * (CELL + GAP) + CELL;
  const centerY = PAD + 1 * (CELL + GAP) + CELL;
  const centerW = 2 * CELL + GAP;
  const centerH = 2 * CELL + GAP;

  // 三传地支集合
  const chuanZhi = [sanChuan.chuChuan.diZhi, sanChuan.zhongChuan.diZhi, sanChuan.moChuan.diZhi];

  return (
    <svg
      data-testid="daliuren-chart"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full"
      role="img"
      aria-label="大六壬天地盘"
    >
      {/* 背景 */}
      <rect x="0" y="0" width={SIZE} height={SIZE} rx="12" fill="rgba(5,10,8,0.7)" />

      {/* 12宫 */}
      {DI_ZHI.map((dz) => {
        const { x, y } = cellCenter(dz);
        const tp = tianDiPan.diToTian[dz] ?? '';
        const jiang = tianDiPan.diToJiang[dz] ?? '';
        const isChuan = chuanZhi.includes(dz);
        const bg = isChuan ? 'rgba(212,175,55,0.15)' : 'rgba(10,18,15,0.6)';
        const border = isChuan ? '#d4af37' : 'rgba(60,70,65,0.4)';

        return (
          <g key={dz}>
            <rect
              x={x - CELL / 2}
              y={y - CELL / 2}
              width={CELL}
              height={CELL}
              rx="6"
              fill={bg}
              stroke={border}
              strokeWidth={isChuan ? 1.5 : 0.8}
            />
            {/* 天将（上） */}
            <text
              x={x}
              y={y - 22}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(44,159,132,0.5)"
              fontSize="10"
            >
              {JIANG_FULL[jiang] ?? jiang}
            </text>
            {/* 天盘地支（中大字） */}
            <text
              x={x}
              y={y - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isChuan ? '#e8c547' : '#c8d8d0'}
              fontSize="18"
              fontWeight="700"
              fontFamily="'Noto Serif CJK SC', serif"
            >
              {tp}
            </text>
            {/* 地盘地支（下小字） */}
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(44,159,132,0.35)"
              fontSize="11"
            >
              {dz}
            </text>
            {/* 三传标记 */}
            {isChuan && (
              <text x={x} y={y - CELL / 2 - 2} textAnchor="middle" fill="#e8c547" fontSize="8" fontWeight="700">
                {sanChuan.chuChuan.diZhi === dz ? '★初传' : sanChuan.zhongChuan.diZhi === dz ? '★中传' : '★末传'}
              </text>
            )}
          </g>
        );
      })}

      {/* 中心区域：三传四课 */}
      <rect
        x={centerX - centerW / 2}
        y={centerY - centerH / 2}
        width={centerW}
        height={centerH}
        rx="8"
        fill="rgba(5,10,8,0.9)"
        stroke="rgba(212,175,55,0.3)"
        strokeWidth="1"
      />

      {/* 格局标题 */}
      <text x={centerX} y={centerY - centerH / 2 + 14} textAnchor="middle" fill="#d4af37" fontSize="11" fontWeight="700">
        {geJu}·{geJuDetail}
      </text>

      {/* 四课（横排，从右到左：一课→四课，传统顺序） */}
      {siKe.list.slice().reverse().map((ke, i) => {
        const keX = centerX - centerW / 2 + 18 + i * 48;
        const keY = centerY - 16;
        const relColor = RELATION_COLOR[ke.relation] ?? '#888';
        return (
          <g key={ke.position}>
            <text x={keX} y={keY - 10} textAnchor="middle" fill="rgba(44,159,132,0.4)" fontSize="7">{ke.position}课</text>
            <text x={keX} y={keY + 2} textAnchor="middle" fill="#c8d8d0" fontSize="11" fontWeight="600">{ke.shangShen}</text>
            <text x={keX} y={keY + 14} textAnchor="middle" fill="rgba(200,216,208,0.6)" fontSize="9">{ke.xiaShen}</text>
            <text x={keX} y={keY + 24} textAnchor="middle" fill={relColor} fontSize="7">{ke.relation}</text>
          </g>
        );
      })}

      {/* 三传（横排） */}
      {[
        { label: '初传', chuan: sanChuan.chuChuan },
        { label: '中传', chuan: sanChuan.zhongChuan },
        { label: '末传', chuan: sanChuan.moChuan },
      ].map(({ label, chuan }, i) => {
        const cx = centerX - centerW / 2 + 24 + i * 70;
        const cy = centerY + 20;
        return (
          <g key={label}>
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#d4af37" fontSize="8">{label}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="#e8c547" fontSize="14" fontWeight="700" fontFamily="'Noto Serif CJK SC', serif">
              {chuan.diZhi}
            </text>
            <text x={cx} y={cy + 20} textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="7">{chuan.liuQin}</text>
            {chuan.xunKong && (
              <text x={cx} y={cy + 30} textAnchor="middle" fill="#e0504a" fontSize="7">空</text>
            )}
          </g>
        );
      })}

      {/* 底部标注 */}
      <text x={CENTER_X} y={SIZE - 6} textAnchor="middle" fill="rgba(44,159,132,0.3)" fontSize="9">
        {yueJiangName}加{hourZhi}时 · {dayNight}占
      </text>
    </svg>
  );
}
