import type { TianDiPanInfo, SiKeInfo, SanChuanInfo } from '@/legacy/daliurenEngine';

/**
 * DaliurenChart — 大六壬天地盘 SVG 式盘（重新设计）
 *
 * 设计原则：
 * - 画布够大（680×720），中心区域不挤四课三传
 * - 12宫只放天地盘，中心放格局+月将信息（不放四课三传，避免拥挤）
 * - 四课三传放天地盘下方独立区域，字号够大可读
 * - 衬线字体 + dominantBaseline 居中
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

/** 12宫在4×4方阵中的位置（row, col），中心2×2留空 */
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

const SERIF = "'Noto Serif CJK SC', serif";

export function DaliurenChart({
  tianDiPan, siKe, sanChuan, hourZhi, yueJiangName, geJu, geJuDetail, dayNight,
}: DaliurenChartProps) {
  // 天地盘区域
  const PAN_SIZE = 480;
  const CELL = 112;
  const GAP = 4;
  const PAN_PAD = 8;
  const PAN_CENTER = PAN_SIZE / 2;

  // 下方四课三传区域
  const SECTION_Y = PAN_SIZE + 16;
  const TOTAL_H = SECTION_Y + 200;

  function cellCenter(dz: string): { x: number; y: number } {
    const [row, col] = PALACE_POS[dz] ?? [0, 0];
    const x = PAN_PAD + col * (CELL + GAP) + CELL / 2;
    const y = PAN_PAD + row * (CELL + GAP) + CELL / 2;
    return { x, y };
  }

  const centerBoxX = PAN_PAD + 1 * (CELL + GAP);
  const centerBoxY = PAN_PAD + 1 * (CELL + GAP);
  const centerBoxW = 2 * CELL + GAP;
  const centerBoxH = 2 * CELL + GAP;

  const chuanZhi = [sanChuan.chuChuan.diZhi, sanChuan.zhongChuan.diZhi, sanChuan.moChuan.diZhi];

  return (
    <svg
      data-testid="daliuren-chart"
      viewBox={`0 0 ${PAN_SIZE} ${TOTAL_H}`}
      className="w-full"
      role="img"
      aria-label="大六壬天地盘"
    >
      {/* ── 天地盘区域 ── */}
      <rect x="0" y="0" width={PAN_SIZE} height={PAN_SIZE} rx="12" fill="rgba(5,10,8,0.7)" />

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
              rx="8"
              fill={bg}
              stroke={border}
              strokeWidth={isChuan ? 1.8 : 0.8}
            />
            {/* 天将全称（上） */}
            <text
              x={x}
              y={y - 28}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(60,140,120,0.6)"
              fontSize="11"
              fontFamily={SERIF}
            >
              {JIANG_FULL[jiang] ?? jiang}
            </text>
            {/* 天盘地支（中大字） */}
            <text
              x={x}
              y={y - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isChuan ? '#e8c547' : '#d0e0d8'}
              fontSize="22"
              fontWeight="700"
              fontFamily={SERIF}
            >
              {tp}
            </text>
            {/* 分隔线 */}
            <line x1={x - 24} y1={y + 10} x2={x + 24} y2={y + 10} stroke="rgba(60,70,65,0.3)" strokeWidth="0.5" />
            {/* 地盘地支（下） */}
            <text
              x={x}
              y={y + 24}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(44,159,132,0.4)"
              fontSize="13"
              fontFamily={SERIF}
            >
              {dz}
            </text>
            {/* 三传标记 */}
            {isChuan && (
              <text x={x} y={y - CELL / 2 + 4} textAnchor="middle" fill="#e8c547" fontSize="9" fontWeight="700">
                {sanChuan.chuChuan.diZhi === dz ? '★ 初传' : sanChuan.zhongChuan.diZhi === dz ? '★ 中传' : '★ 末传'}
              </text>
            )}
          </g>
        );
      })}

      {/* 中心区域：格局 + 月将 + 昼夜 */}
      <rect
        x={centerBoxX}
        y={centerBoxY}
        width={centerBoxW}
        height={centerBoxH}
        rx="10"
        fill="rgba(5,10,8,0.92)"
        stroke="rgba(212,175,55,0.25)"
        strokeWidth="1.2"
      />
      <text x={PAN_CENTER} y={centerBoxY + 32} textAnchor="middle" fill="#d4af37" fontSize="14" fontWeight="700" fontFamily={SERIF}>
        {geJu}·{geJuDetail}
      </text>
      <line x1={centerBoxX + 30} y1={centerBoxY + 48} x2={centerBoxX + centerBoxW - 30} y2={centerBoxY + 48} stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" />
      <text x={PAN_CENTER} y={centerBoxY + 68} textAnchor="middle" fill="rgba(44,159,132,0.5)" fontSize="12" fontFamily={SERIF}>
        {yueJiangName}加{hourZhi}时
      </text>
      <text x={PAN_CENTER} y={centerBoxY + 88} textAnchor="middle" fill="rgba(44,159,132,0.4)" fontSize="11">
        {dayNight}占 · 日{siKe.dayGan}{siKe.dayZhi} · 时{siKe.dayGan}寄{siKe.dayGanJiGong}
      </text>
      {/* 三传摘要 */}
      <line x1={centerBoxX + 30} y1={centerBoxY + 104} x2={centerBoxX + centerBoxW - 30} y2={centerBoxY + 104} stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" />
      <text x={PAN_CENTER} y={centerBoxY + 124} textAnchor="middle" fill="#e8c547" fontSize="13" fontWeight="600" fontFamily={SERIF}>
        {sanChuan.chuChuan.diZhi}→{sanChuan.zhongChuan.diZhi}→{sanChuan.moChuan.diZhi}
      </text>
      <text x={PAN_CENTER} y={centerBoxY + 142} textAnchor="middle" fill="rgba(212,175,55,0.45)" fontSize="10">
        初·中·末传
      </text>

      {/* ── 四课区域 ── */}
      <text x={PAN_CENTER} y={SECTION_Y + 10} textAnchor="middle" fill="rgba(44,159,132,0.5)" fontSize="12" fontWeight="600" fontFamily={SERIF}>
        四课
      </text>
      {siKe.list.map((ke, i) => {
        const keW = 96;
        const keGap = 8;
        const keTotalW = 4 * keW + 3 * keGap;
        const keX = PAN_CENTER - keTotalW / 2 + i * (keW + keGap) + keW / 2;
        const keY = SECTION_Y + 28;
        const relColor = RELATION_COLOR[ke.relation] ?? '#888';

        return (
          <g key={ke.position}>
            <rect
              x={keX - keW / 2}
              y={keY}
              width={keW}
              height={72}
              rx="6"
              fill="rgba(10,18,15,0.6)"
              stroke="rgba(60,70,65,0.4)"
              strokeWidth="0.8"
            />
            <text x={keX} y={keY + 14} textAnchor="middle" fill="rgba(44,159,132,0.4)" fontSize="9">第{ke.position}课</text>
            <text x={keX} y={keY + 32} textAnchor="middle" fill="#d0e0d8" fontSize="14" fontWeight="700" fontFamily={SERIF}>{ke.shangShen}</text>
            <text x={keX} y={keY + 48} textAnchor="middle" fill="rgba(200,216,208,0.55)" fontSize="12" fontFamily={SERIF}>{ke.xiaShen}</text>
            <text x={keX} y={keY + 62} textAnchor="middle" fill={relColor} fontSize="9">{ke.relation}</text>
          </g>
        );
      })}

      {/* ── 三传区域 ── */}
      <text x={PAN_CENTER} y={SECTION_Y + 120} textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="12" fontWeight="600" fontFamily={SERIF}>
        三传
      </text>
      {[
        { label: '初传', chuan: sanChuan.chuChuan },
        { label: '中传', chuan: sanChuan.zhongChuan },
        { label: '末传', chuan: sanChuan.moChuan },
      ].map(({ label, chuan }, i) => {
        const chW = 120;
        const chGap = 12;
        const chTotalW = 3 * chW + 2 * chGap;
        const cx = PAN_CENTER - chTotalW / 2 + i * (chW + chGap) + chW / 2;
        const cy = SECTION_Y + 138;

        return (
          <g key={label}>
            <rect
              x={cx - chW / 2}
              y={cy}
              width={chW}
              height={56}
              rx="6"
              fill="rgba(212,175,55,0.08)"
              stroke="rgba(212,175,55,0.25)"
              strokeWidth="0.8"
            />
            <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="10">{label}</text>
            <text x={cx - 20} y={cy + 34} textAnchor="middle" fill="#e8c547" fontSize="16" fontWeight="700" fontFamily={SERIF}>{chuan.diZhi}</text>
            <text x={cx + 8} y={cy + 30} textAnchor="middle" fill="rgba(60,140,120,0.5)" fontSize="9">{JIANG_FULL[chuan.tianJiang] ?? chuan.tianJiang}</text>
            <text x={cx + 8} y={cy + 42} textAnchor="middle" fill="rgba(200,216,208,0.4)" fontSize="9">{chuan.liuQin}</text>
            {chuan.xunKong && (
              <text x={cx + 28} y={cy + 34} textAnchor="middle" fill="#e0504a" fontSize="9">空</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
