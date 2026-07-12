/**
 * yunqiEngine — 五运六气纯 TS 推算引擎（C 类迁移第二步）
 *
 * 从 visual/js/engines/yunqi-engine.js 移植为纯 TS。原引擎本是纯查表 + 干支计算，
 * 无外部依赖，仅因挂在 window.YunqiEngine 被 `if (typeof window === "undefined") return`
 * 挡住。剥离后可在 Node/MCP 直接 import。
 *
 * engine-adapters.js 的 yunqi adapter 额外做了「大寒定年」（依赖 window.Solar），
 * 这里用参数化 Solar 入口处理（与 almanacData/meihuaEngine 同模式）：
 * 传入 solar 时按大寒边界修正运气年份（local-exact），未传时按公历年近似（local-approx）。
 *
 * 输出结构与旧 YunqiEngine.calculate 完全一致，YunqiData/baseTypes 可直接消费。
 * 旧 JS 保留作 EngineAdapterRegistry fallback，零回归。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

const TG = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 岁运表：甲己土 / 乙庚金 / 丙辛水 / 丁壬木 / 戊癸火（太过/不及按阳干阴干） */
const WUYUN_TABLE: Record<string, string> = {
  甲: '土运太过', 乙: '金运不及', 丙: '水运太过', 丁: '木运不及', 戊: '火运太过',
  己: '土运不及', 庚: '金运太过', 辛: '水运不及', 壬: '木运太过', 癸: '火运不及',
};

/** 司天表（按地支） */
const SITIAN_TABLE: Record<string, string> = {
  子: '少阴君火', 午: '少阴君火',
  丑: '太阴湿土', 未: '太阴湿土',
  寅: '少阳相火', 申: '少阳相火',
  卯: '阳明燥金', 酉: '阳明燥金',
  辰: '太阳寒水', 戌: '太阳寒水',
  巳: '厥阴风木', 亥: '厥阴风木',
};

/** 在泉表（司天→在泉，阴阳相对） */
const ZAIQUAN_TABLE: Record<string, string> = {
  少阴君火: '阳明燥金', 太阴湿土: '太阳寒水', 少阳相火: '厥阴风木',
  阳明燥金: '少阴君火', 太阳寒水: '太阴湿土', 厥阴风木: '少阳相火',
};

/** 六客气步序 */
const LIUQI_ORDER = ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'];

/** 疾病倾向 */
const DISEASE_MAP: Record<string, string> = {
  土运太过: '脾湿、腹泻、四肢沉重',
  土运不及: '消化不良、胃胀、肌肉酸痛',
  金运太过: '皮肤干燥、咳嗽、便秘',
  金运不及: '免疫力下降、气喘、皮肤过敏',
  水运太过: '水肿、肾虚、腰膝酸软、畏寒',
  水运不及: '尿频、耳鸣、骨质疏松',
  木运太过: '肝火旺、头痛、眼疾、易怒',
  木运不及: '疲劳、抑郁、筋骨不利',
  火运太过: '心火旺、失眠、高血压、口腔溃疡',
  火运不及: '心悸、怕冷、循环不良',
  少阴君火: '心脑血管疾病、热证',
  太阴湿土: '脾胃失调、水肿、湿证',
  少阳相火: '肝胆热证、炎症、上火',
  阳明燥金: '肺燥、便秘、皮肤干燥',
  太阳寒水: '风寒感冒、关节痛、寒证',
  厥阴风木: '肝风、头痛、过敏、眩晕',
};

// ── lunar-javascript Solar 入口类型（大寒定年用，参数化）──

interface LunarLike {
  getJieQiTable?: () => Record<string, { getYear?: () => number; getMonth?: () => number; getDay?: () => number } | string>;
}
interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
}

/** 从岁运串提取五行 */
function extractWuxing(dayun: string): string {
  const chars = ['金', '木', '水', '火', '土'];
  for (const c of chars) {
    if (dayun.indexOf(c) !== -1) return c;
  }
  return '土';
}

/** 主气六步（固定：初之气厥阴→六之气太阳） */
const ZHUQI_ORDER = ['厥阴风木', '少阴君火', '少阳相火', '太阴湿土', '阳明燥金', '太阳寒水'];

/**
 * 取当前客气步（含主气）。
 * @param year 年份（用于判断当前月是否落在该年）
 * @param zhuke 客气六步
 * @param currentMonth 可选当前月（1-12）；未传时用 new Date() 取当前月
 */
function getCurrentStep(
  year: number,
  zhuke: Array<{ step: string; qi: string; start: string; end: string }>,
  currentMonth?: number,
): { step: string; qi: string; start: string; end: string; zhuqi: string } | null {
  const mo = currentMonth ?? (() => {
    const now = new Date();
    return now.getFullYear() === year ? now.getMonth() + 1 : 1;
  })();
  const idx = Math.min(5, Math.max(0, Math.floor((mo - 1) / 2)));
  return { ...zhuke[idx], zhuqi: ZHUQI_ORDER[idx] };
}

/** 客主加临关系 */
function getKeZhuJiaLin(keqi: string, zhuqi: string): string {
  if (!keqi || !zhuqi) return '未知';
  if (keqi === zhuqi) return '同气';
  const wx: Record<string, string> = { 厥阴风木: '木', 少阴君火: '火', 少阳相火: '火', 太阴湿土: '土', 阳明燥金: '金', 太阳寒水: '水' };
  const cycle = ['木', '火', '土', '金', '水'];
  const k = cycle.indexOf(wx[keqi]);
  const z = cycle.indexOf(wx[zhuqi]);
  if (k < 0 || z < 0) return '未知';
  if ((k + 1) % 5 === z) return '客生主';
  if ((z + 1) % 5 === k) return '主生客';
  if ((k + 2) % 5 === z) return '客克主';
  if ((z + 2) % 5 === k) return '主克客';
  return '同类';
}

// ── 结果类型（与旧 YunqiEngine.calculate 输出一致，对齐 baseTypes YunqiData）──

export interface YunqiResult {
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  confidenceNote: string;
  year: number;
  tiangan: string;
  dizhi: string;
  yearBoundary: string;
  wuyun: {
    dayun: string;
    zhuyun: string[];
    keyun: string[];
  };
  liuqi: {
    sitian: string;
    zaiquan: string;
    zhuke: Array<{ step: string; qi: string; start: string; end: string }>;
    current_step: { step: string; qi: string; start: string; end: string; zhuqi: string } | null;
    kezhujialin: string;
  };
  disease_tendency: string;
}

/**
 * 取大寒日期（用于大寒定年）。传入 solar 时走精确节气表，未传返回 null。
 */
function getDaHanDate(year: number, solar?: SolarLike | null): { year: number; month: number; day: number } | null {
  if (!solar) return null;
  try {
    const s = solar.fromYmdHms
      ? solar.fromYmdHms(year, 1, 15, 0, 0, 0)
      : solar.fromYmd?.(year, 1, 15);
    const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
    const table = lunar && typeof lunar.getJieQiTable === 'function' ? lunar.getJieQiTable() : null;
    if (!table) return null;
    const dahan = table['大寒'] || table.DA_HAN || table['Dahan'] || table['daHan'];
    if (!dahan || typeof dahan === 'string') return null;
    const dy = typeof dahan.getYear === 'function' ? dahan.getYear() : null;
    const dm = typeof dahan.getMonth === 'function' ? dahan.getMonth() : null;
    const dd = typeof dahan.getDay === 'function' ? dahan.getDay() : null;
    if (dy && dm && dd) return { year: Number(dy), month: Number(dm), day: Number(dd) };
    return null;
  } catch {
    return null;
  }
}

export interface YunqiInput {
  /** 公历年/生辰年 */
  year: number;
  /** 生辰月（大寒定年用，判断该年生辰在大寒前还是后），可选 */
  birthMonth?: number;
  /** 生辰日，可选 */
  birthDay?: number;
  /** 可选 lunar-javascript Solar 入口，传入走精确大寒定年 */
  solar?: SolarLike | null;
  /** 可选当前月（1-12），用于 current_step；未传用 new Date() */
  currentMonth?: number;
}

/**
 * 五运六气计算 —— 纯 TS 版。
 * 传入 solar 时按大寒边界修正运气年份（local-exact），否则按公历年近似（local-approx）。
 */
export function calculateYunqi(input: YunqiInput): YunqiResult {
  const { year, solar } = input;

  // 大寒定年：生辰在大寒前 → 用上一年运气
  let effectiveYear = year;
  let yearBoundary = '近似按公历年处理，未接入精确大寒节气表';
  let mode: 'local-exact' | 'local-approx' = 'local-approx';
  let confidenceNote = '按公历年份干支推算岁运、司天在泉与客气六步；大寒定年和节气日为近似处理。';

  const dahan = getDaHanDate(year, solar);
  if (dahan) {
    const bm = input.birthMonth ?? 6;
    const bd = input.birthDay ?? 15;
    const beforeDahan = bm < dahan.month || (bm === dahan.month && bd < dahan.day);
    effectiveYear = beforeDahan ? year - 1 : year;
    yearBoundary = `大寒定年：${year}年大寒为${dahan.month}月${dahan.day}日，当前使用${effectiveYear}年运气。`;
    mode = 'local-exact';
    confidenceNote = '已通过 lunar-javascript/Solar 全局对象修正大寒定年；五运六气规则仍由本地表推算。';
  }

  const tgIndex = (effectiveYear - 4) % 10;
  const dzIndex = (effectiveYear - 4) % 12;
  const tiangan = TG[tgIndex >= 0 ? tgIndex : tgIndex + 10];
  const dizhi = DZ[dzIndex >= 0 ? dzIndex : dzIndex + 12];

  const dayun = WUYUN_TABLE[tiangan] || '';
  const sitian = SITIAN_TABLE[dizhi] || '';
  const zaiquan = ZAIQUAN_TABLE[sitian] || '';

  const zhuyun = ['木', '火', '土', '金', '水'];
  const dayunWx = extractWuxing(dayun);
  const wxCycle = ['木', '火', '土', '金', '水'];
  const startIdx = wxCycle.indexOf(dayunWx);
  const keyun: string[] = [];
  for (let i = 0; i < 5; i++) {
    keyun.push(wxCycle[(startIdx + i) % 5]);
  }

  const sitianIdx = LIUQI_ORDER.indexOf(sitian);
  const stepNames = ['初之气', '二之气', '三之气', '四之气', '五之气', '六之气'];
  const termPairs = [
    ['大寒', '春分'], ['春分', '小满'], ['小满', '大暑'],
    ['大暑', '秋分'], ['秋分', '小雪'], ['小雪', '大寒'],
  ];
  const zhuke: Array<{ step: string; qi: string; start: string; end: string }> = [];
  for (let i = 0; i < 6; i++) {
    const qiIdx = (sitianIdx - 2 + i + 6) % 6;
    zhuke.push({ step: stepNames[i], qi: LIUQI_ORDER[qiIdx], start: termPairs[i][0], end: termPairs[i][1] });
  }

  const tendencies: string[] = [];
  if (dayun) tendencies.push(dayun);
  if (sitian) tendencies.push(sitian);
  const disease_tendency = tendencies.map((t) => DISEASE_MAP[t] || '').filter(Boolean).join('，') || '无明显特殊倾向';

  const currentStep = getCurrentStep(effectiveYear, zhuke, input.currentMonth);
  const kezhujialin = getKeZhuJiaLin(currentStep ? currentStep.qi : '', currentStep ? currentStep.zhuqi : '');

  return {
    engineName: 'YunqiEngine',
    mode,
    confidenceNote,
    year: effectiveYear,
    tiangan,
    dizhi,
    yearBoundary,
    wuyun: { dayun, zhuyun, keyun },
    liuqi: { sitian, zaiquan, zhuke, current_step: currentStep, kezhujialin },
    disease_tendency,
  };
}

// ── ToolEnvelope 适配 ─────────────────────────────────────

export interface YunqiData extends YunqiResult {
  export_snapshot: ExportSnapshot;
}

/**
 * 五运六气 —— ToolEnvelope 版本。
 * 未来 MCP：import { calcYunqiEnveloped }; server.tool('yunqi', {year:z.number()}, async (i) => calcYunqiEnveloped(i))
 */
export function calcYunqiEnveloped(input: YunqiInput): ToolEnvelope<YunqiData> {
  const result = calculateYunqi(input);
  const y = result.year;
  const tg = result.tiangan;
  const dz = result.dizhi;
  const dayun = result.wuyun.dayun;
  const sitian = result.liuqi.sitian;
  const zaiquan = result.liuqi.zaiquan;
  const tendency = result.disease_tendency;

  const snapshot: ExportSnapshot = {
    summary: `${y}年(${tg}${dz})岁运${dayun}，司天${sitian}，在泉${zaiquan}。疾病倾向：${tendency}。`,
    tags: ['五运六气', tg + dz + '年', dayun, sitian, result.mode === 'local-exact' ? '精确历法' : '近似历法'],
    sections: [
      { heading: '岁运', body: `${tg}年岁运为${dayun}，主全年气候与体质基本倾向。客运：${result.wuyun.keyun.join('→')}。` },
      { heading: '司天在泉', body: `司天${sitian}主上半年气候，在泉${zaiquan}主下半年气候。` },
      { heading: '客气六步', body: result.liuqi.zhuke.map((s) => `${s.step}(${s.start}~${s.end}):${s.qi}`).join('；') + '。' },
      { heading: '客主加临', body: result.liuqi.kezhujialin ? `当前${result.liuqi.current_step?.step ?? ''}客主加临：${result.liuqi.kezhujialin}。` : '未知。' },
      { heading: '疾病倾向', body: tendency + '。以上为运气推算的文化参考，不作为诊疗建议。' },
      { heading: '年份边界', body: result.yearBoundary },
    ],
    sourceNotes: result.confidenceNote,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote, result.mode === 'local-approx' ? '未传入精确历法入口，按公历年近似' : ''].filter(Boolean),
  };
}
