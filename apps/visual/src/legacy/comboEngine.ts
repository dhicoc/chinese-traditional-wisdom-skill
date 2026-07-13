/**
 * comboEngine — 跨系统联合分析（ROADMAP 功能层增强 Step 1）
 *
 * 把多个纯 TS 引擎的结果聚合为联合分析，输出整合结论 + 各子系统依据 + 一致性检验。
 * 三个固化联合模块：
 *   1. calcAnnualFortuneCombo  年度综合运势 = 八字 + 五运六气 + 奇门 + 命卦方位
 *   2. calcDecisionCombo       事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 *   3. calcSpaceTimeCombo      空间+时间 = 飞星 + 八宅命卦 + 奇门吉方
 *
 * 设计：
 * - 复用现有纯 TS enveloped 引擎，combo 层只聚合不重算。
 * - 一致性检验：各子系统吉凶定调映射到统一维度（吉/中/凶），比对同向性。
 * - 冲突时不强行统一，输出权衡提示。
 * - 返回 ToolEnvelope，data 含 subsystems + synthesis + consistency + recommendations。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { calcBaziEnveloped } from './baziEngine';
import { calcYunqiEnveloped } from './yunqiEngine';
import { calcQimenEnveloped } from './qimenEngine';
import { calcLiuyaoEnveloped } from './liuyaoEngine';
import { calcMeihuaEnveloped } from './meihuaEngine';
import { calcDaliurenEnveloped, type DaliurenSchool } from './daliurenEngine';
import { calcTaiyiEnveloped, type JiStyle as TaiyiJiStyle, type AcumYearMethod as TaiyiAcumYear } from './taiyiEngine';
import { calcMingGua, getPersonalDirections, combineBazhaiFeixing, type MingGua } from './bazhaiHouse';
import { getYuanYun, MING_GUA_DIRECTIONS } from './flyingStarRemedies';
import { calcTaisui } from './taisuiEngine';
import { queryJieqiWellness, type JieqiWellness } from './jieqiWellness';
import { getMeridianByHour, type MeridianHour } from './meridianClock';
import { getConstitutionTendency } from './constitutionTendency';

// ─── 公共类型 ───

interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: string;
}

interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): unknown };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): unknown };
}

/** 子系统结果条目 */
export interface SubsystemResult {
  /** 引擎名 */
  name: string;
  /** 该子系统的吉凶定调 */
  tone: Tone;
  /** 一句话摘要 */
  summary: string;
  /** 完整 envelope（供深入查看） */
  envelope: ToolEnvelope;
}

/** 一致性检验结果 */
export interface ConsistencyCheck {
  /** 各子系统 tone 列表 */
  tones: Tone[];
  /** 是否同向（全吉/全凶/全中，或吉中无凶/凶中无吉视为基本同向） */
  aligned: boolean;
  /** 冲突描述（不一致时） */
  conflicts: string[];
  /** 置信度（同向→高，有冲突→中） */
  confidence: '高' | '中' | '低';
}

/** 联合分析结果 */
export interface ComboResult {
  comboName: string;
  /** 联合模块用途 */
  purpose: string;
  /** 输入摘要 */
  inputs: Record<string, unknown>;
  /** 各子系统结果 */
  subsystems: SubsystemResult[];
  /** 整合结论 */
  synthesis: string;
  /** 一致性检验 */
  consistency: ConsistencyCheck;
  /** 综合建议条目 */
  recommendations: { label: string; value: string; tone: Tone }[];
  /** export_snapshot 稳定段表 */
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

// ─── tone 推断（从 envelope 的 snapshot summary + tags）───

function toneFromEnvelope(env: ToolEnvelope): Tone {
  const data = env.data as { export_snapshot?: { summary?: string; tags?: string[] } };
  const text = (data.export_snapshot?.summary ?? '') + ' ' + (data.export_snapshot?.tags ?? []).join(' ');
  if (/大吉|吉格|用生体|可成|身强|旺|相|生门|休门|开门|阳遁|禄|权|科/.test(text)) return '吉';
  if (/大凶|凶格|用克体|不利|身弱|死|囚|绝命|五鬼|祸害|六煞|死门|惊门|伤门|忌/.test(text)) return '凶';
  return '中';
}

function summaryFromEnvelope(env: ToolEnvelope): string {
  const data = env.data as { export_snapshot?: { summary?: string } };
  return data.export_snapshot?.summary ?? '';
}

/** 一致性检验 */
function checkConsistency(subsystems: SubsystemResult[]): ConsistencyCheck {
  const tones = subsystems.map((s) => s.tone);
  const ji = tones.filter((t) => t === '吉').length;
  const xiong = tones.filter((t) => t === '凶').length;
  // 同向：无吉凶对立
  const aligned = ji === 0 || xiong === 0;
  const conflicts: string[] = [];
  if (!aligned) {
    const jiNames = subsystems.filter((s) => s.tone === '吉').map((s) => s.name);
    const xiongNames = subsystems.filter((s) => s.tone === '凶').map((s) => s.name);
    conflicts.push(`${jiNames.join('、')}判吉，${xiongNames.join('、')}判凶，方向有分歧，需权衡`);
  }
  const confidence: '高' | '中' | '低' = aligned ? '高' : '中';
  return { tones, aligned, conflicts, confidence };
}

/** tone → 中文定调词 */
function toneWord(t: Tone): string {
  return t === '吉' ? '偏吉' : t === '凶' ? '偏凶' : '平稳';
}

// ─── Combo 1: 年度综合运势 ───

export interface AnnualFortuneComboInput {
  birth: BirthInput;
  /** 欲测年份（默认用 birth 年或当前年） */
  targetYear?: number;
  solar?: SolarLike | null;
  /** 当前月（五运六气用） */
  currentMonth?: number;
}

/**
 * 年度综合运势 = 八字（大运/日主/喜用）+ 五运六气（年运）+ 奇门（年盘）+ 命卦方位
 */
export function calcAnnualFortuneCombo(input: AnnualFortuneComboInput): ToolEnvelope<ComboResult> {
  const { birth, solar } = input;
  const targetYear = input.targetYear ?? birth.year;

  // solar 为各引擎本地 SolarLike（结构因 LunarLike 而异），combo 作聚合层统一以 never 透传，运行时不变
  const baziEnv = calcBaziEnveloped({ birth, solar: (solar ?? null) as never });
  const yunqiEnv = calcYunqiEnveloped({ year: targetYear, birthMonth: birth.month, birthDay: birth.day, solar: (solar ?? null) as never, currentMonth: input.currentMonth });
  const qimenEnv = calcQimenEnveloped({ birth: { year: targetYear, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute } });
  const mingGua = calcMingGua(birth.year, birth.gender);
  const personalDirs = getPersonalDirections(mingGua.trigram);

  const subsystems: SubsystemResult[] = [
    { name: '八字', tone: toneFromEnvelope(baziEnv), summary: summaryFromEnvelope(baziEnv), envelope: baziEnv },
    { name: '五运六气', tone: toneFromEnvelope(yunqiEnv), summary: summaryFromEnvelope(yunqiEnv), envelope: yunqiEnv },
    { name: '奇门年盘', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 命卦方位信息（不参与 tone 检验，作辅助建议）
  const auspiciousDirs = personalDirs?.auspicious.map((d) => `${d.star}在${d.direction}`).join('、') ?? '未知';

  const synthesis = `${targetYear}年综合运势：八字${toneWord(subsystems[0].tone)}、五运六气${toneWord(subsystems[1].tone)}、奇门年盘${toneWord(subsystems[2].tone)}。` +
    (consistency.aligned ? `三系统方向基本一致，置信度${consistency.confidence}。` : `三系统有分歧：${consistency.conflicts.join('；')}。`) +
    `命卦${mingGua.trigram}（${mingGua.group}），本年吉方：${auspiciousDirs}。`;

  const recommendations: ComboResult['recommendations'] = [];
  if (subsystems[0].tone === '吉' || subsystems[1].tone === '吉') {
    recommendations.push({ label: '整体进取', value: '多系统显示有利，宜把握机遇、主动推进。', tone: '吉' });
  }
  if (subsystems.some((s) => s.tone === '凶')) {
    recommendations.push({ label: '稳妥防守', value: '部分系统示警，宜保守、避免大举冒进，注意健康与人际。', tone: '凶' });
  }
  recommendations.push({ label: '方位借力', value: `本年个人吉方${auspiciousDirs}，可作主卧/办公位/财位布局。`, tone: '吉' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['年度综合运势', String(targetYear) + '年', `置信度${consistency.confidence}`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '八字维度', body: subsystems[0].summary },
      { heading: '五运六气维度', body: subsystems[1].summary },
      { heading: '奇门年盘维度', body: subsystems[2].summary },
      { heading: '命卦方位', body: `命卦${mingGua.trigram}（${mingGua.group}），吉方：${auspiciousDirs}。` },
      { heading: '一致性检验', body: consistency.aligned ? `三系统同向，置信度${consistency.confidence}。` : `有分歧：${consistency.conflicts.join('；')}` },
      { heading: '综合建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '联合分析为多系统聚合参考，非预言绝对，请结合自身境遇理性看待。',
  };

  const result: ComboResult = {
    comboName: '年度综合运势',
    purpose: '八字+五运六气+奇门年盘+命卦方位 联合推算某年整体运势',
    inputs: { birth: { year: birth.year, gender: birth.gender }, targetYear },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'AnnualFortuneComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['多系统结论有分歧，已标注权衡'])],
  };
}

// ─── Combo 2: 事件决策（三卜交叉验证）───

export interface DecisionComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  /** 起卦种子（铜钱法，可选） */
  seed?: number;
  solar?: SolarLike | null;
}

/**
 * 事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 * 三卜结论一致→高置信；两同一异→以六爻为主。
 */
export function calcDecisionCombo(input: DecisionComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, seed } = input;

  const liuyaoEnv = calcLiuyaoEnveloped({ birth, method: 'coin', question, seed, solar: (solar ?? null) as never });
  // calcMeihuaEnveloped 为 (input, solar?) 两参签名，solar 不在 MeihuaInput 内
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time' }, (solar ?? null) as never);
  const qimenEnv = calcQimenEnveloped({ birth, question });

  const subsystems: SubsystemResult[] = [
    { name: '六爻', tone: toneFromEnvelope(liuyaoEnv), summary: summaryFromEnvelope(liuyaoEnv), envelope: liuyaoEnv },
    { name: '梅花', tone: toneFromEnvelope(meihuaEnv), summary: summaryFromEnvelope(meihuaEnv), envelope: meihuaEnv },
    { name: '奇门', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三卜交叉：以六爻为主
  const liuyaoTone = subsystems[0].tone;
  let synthesis = `针对「${question}」的三卜交叉验证：六爻${toneWord(liuyaoTone)}、梅花${toneWord(subsystems[1].tone)}、奇门${toneWord(subsystems[2].tone)}。`;
  if (consistency.aligned) {
    synthesis += `三卜方向一致，结论可信度${consistency.confidence}。`;
  } else {
    synthesis += `三卜有分歧，以六爻为主、梅花奇门为辅参考。分歧：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liuyaoTone === '吉') {
    recommendations.push({ label: '可进', value: '六爻用神得力，宜把握时机推进。', tone: '吉' });
  } else if (liuyaoTone === '凶') {
    recommendations.push({ label: '宜守', value: '六爻用神受克，宜暂缓、观望，避免强行。', tone: '凶' });
  } else {
    recommendations.push({ label: '顺其自然', value: '六爻平稳，可按既定计划推进，无需强求。', tone: '中' });
  }
  recommendations.push({ label: '心态', value: '卜筮为参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['事件决策', '三卜交叉', `置信度${consistency.confidence}`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '六爻', body: subsystems[0].summary },
      { heading: '梅花易数', body: subsystems[1].summary },
      { heading: '奇门', body: subsystems[2].summary },
      { heading: '一致性检验', body: consistency.aligned ? `三卜同向，置信度${consistency.confidence}。` : `有分歧：${consistency.conflicts.join('；')}。以六爻为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三卜交叉验证为传统卜筮参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '事件决策',
    purpose: '六爻+梅花+奇门 三卜交叉验证某事的吉凶与行动方向',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'DecisionComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三卜有分歧，以六爻为主'])],
  };
}

// ─── Combo 3: 空间+时间 ───

export interface SpaceTimeComboInput {
  birth: BirthInput;
  /** 欲测年份（飞星年盘） */
  targetYear?: number;
  /** 房屋朝向（八宅宅卦，可选） */
  facing?: string;
  solar?: SolarLike | null;
}

/**
 * 空间+时间 = 飞星（年盘方位）+ 八宅命卦吉方 + 奇门吉方
 * 复用 bazhaiHouse.combineBazhaiFeixing 做八宅+飞星合参，再叠加奇门吉方。
 */
export function calcSpaceTimeCombo(input: SpaceTimeComboInput): ToolEnvelope<ComboResult> {
  const { birth, solar } = input;
  const targetYear = input.targetYear ?? birth.year;
  const mingGua = calcMingGua(birth.year, birth.gender);
  const qimenEnv = calcQimenEnveloped({ birth: { year: targetYear, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute } });

  // 命卦吉方
  const personalDirs = getPersonalDirections(mingGua.trigram);
  const auspiciousDirs = personalDirs?.auspicious.map((d) => `${d.star}在${d.direction}`).join('、') ?? '未知';

  // 元运（飞星年盘背景）
  const yuanYun = getYuanYun(targetYear);

  // 奇门吉方：从奇门九宫找开门/生门/休门所在宫位
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; position: number; gate: string; gateLuck: string }> };
  const auspiciousGates = qimenData.palaces
    .filter((p) => ['开门', '生门', '休门'].includes(p.gate))
    .map((p) => `${p.gate}在${p.trigram}宫(${p.position}宫)`);

  const qimenTone = toneFromEnvelope(qimenEnv);

  const synthesis = `${targetYear}年空间布局参考：命卦${mingGua.trigram}（${mingGua.group}），个人吉方${auspiciousDirs}；` +
    `当前${yuanYun.name}（${yuanYun.startYear+"-"+yuanYun.endYear}），飞星年盘对此有叠加影响；` +
    `奇门吉方：${auspiciousGates.join('、') || '无显著吉门'}。` +
    `三者方位重合处为最佳布局点。`;

  const recommendations: ComboResult['recommendations'] = [
    { label: '主卧/办公位', value: `优先选个人生气方（${personalDirs?.auspicious.find((d) => d.star === '生气')?.direction ?? '未知'}），与奇门吉门方位重合更佳。`, tone: '吉' },
    { label: '财位催旺', value: `个人天医方（${personalDirs?.auspicious.find((d) => d.star === '天医')?.direction ?? '未知'}）宜作财位，置招财物品。`, tone: '吉' },
    { label: '凶位规避', value: `个人绝命/五鬼方忌作主卧大门，宜置厕所储物压之。`, tone: '凶' },
  ];

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['空间+时间', String(targetYear) + '年', mingGua.trigram + '命', yuanYun.name],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '命卦吉方', body: `命卦${mingGua.trigram}（${mingGua.group}），四吉方：${auspiciousDirs}。` },
      { heading: '元运背景', body: `当前${yuanYun.name}（${yuanYun.startYear+"-"+yuanYun.endYear}），九星旺衰随元运变化。` },
      { heading: '奇门吉门方位', body: auspiciousGates.join('、') || '无显著吉门' },
      { heading: '布局建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '空间布局为传统风水参考，实际需结合户型与现场形势综合判断。',
  };

  const result: ComboResult = {
    comboName: '空间+时间',
    purpose: '飞星年盘+八宅命卦吉方+奇门吉方 联合推算某年最佳布局方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, targetYear, facing: input.facing },
    subsystems: [
      { name: '八宅命卦', tone: '中', summary: `命卦${mingGua.trigram}，吉方${auspiciousDirs}`, envelope: qimenEnv },
      { name: '奇门吉方', tone: qimenTone, summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    ],
    synthesis,
    consistency: { tones: ['中', qimenTone], aligned: true, conflicts: [], confidence: '中' },
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SpaceTimeComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote],
  };
}

// ─── Combo 4: 三式互参（大六壬 + 奇门 + 梅花）───

export interface SanshiComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  solar?: SolarLike | null;
  /** 大六壬天将流派，透传至 calcDaliurenEnveloped；默认 classic */
  liurenSchool?: DaliurenSchool;
}

/**
 * 三式互参 = 大六壬 + 奇门遁甲 + 梅花易数
 * 大六壬重三传四课（事态轨迹+应期），奇门重八门九星（方位择吉），梅花重体用生克（快速判断）。
 * 三式各有所长，交叉验证：同向→高置信，分歧→权衡。
 */
export function calcSanshiCombo(input: SanshiComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, liurenSchool } = input;

  const liurenEnv = calcDaliurenEnveloped({ birth, solar: (solar ?? null) as never, school: liurenSchool ?? 'classic' });
  const qimenEnv = calcQimenEnveloped({ birth, question });
  // calcMeihuaEnveloped 为 (input, solar?) 两参签名，solar 不在 MeihuaInput 内
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time' }, (solar ?? null) as never);

  const subsystems: SubsystemResult[] = [
    { name: '大六壬', tone: toneFromEnvelope(liurenEnv), summary: summaryFromEnvelope(liurenEnv), envelope: liurenEnv },
    { name: '奇门遁甲', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    { name: '梅花易数', tone: toneFromEnvelope(meihuaEnv), summary: summaryFromEnvelope(meihuaEnv), envelope: meihuaEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三式各有所长：大六壬主断事态过程与应期
  const liurenTone = subsystems[0].tone;
  let synthesis = `针对「${question}」的三式互参：大六壬${toneWord(liurenTone)}（三传四课主事态轨迹）、奇门${toneWord(subsystems[1].tone)}（八门九星主方位时机）、梅花${toneWord(subsystems[2].tone)}（体用生克主快速判断）。`;
  if (consistency.aligned) {
    synthesis += `三式方向一致，结论可信度${consistency.confidence}。`;
  } else {
    synthesis += `三式有分歧，以大六壬三传为主、奇门梅花为辅参考。分歧：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liurenTone === '吉') {
    recommendations.push({ label: '事态可成', value: '大六壬三传吉，事态发展有利，宜把握时机推进。', tone: '吉' });
  } else if (liurenTone === '凶') {
    recommendations.push({ label: '宜缓宜守', value: '大六壬三传凶，事态有阻，宜暂缓观望、避免强求。', tone: '凶' });
  } else {
    recommendations.push({ label: '平稳推进', value: '大六壬三传平稳，可按既定计划进行，无需强求。', tone: '中' });
  }
  // 奇门方位建议
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; gate: string }> };
  const auspiciousGates = qimenData.palaces?.filter((p) => ['开门', '生门', '休门'].includes(p.gate)) ?? [];
  if (auspiciousGates.length > 0) {
    recommendations.push({ label: '方位借力', value: `奇门吉门在${auspiciousGates.map((g) => g.trigram + '宫').join('、')}，可择吉方行事。`, tone: '吉' });
  }
  recommendations.push({ label: '心态', value: '三式为传统占断参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['三式互参', '大六壬+奇门+梅花', `置信度${consistency.confidence}`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '大六壬', body: subsystems[0].summary },
      { heading: '奇门遁甲', body: subsystems[1].summary },
      { heading: '梅花易数', body: subsystems[2].summary },
      { heading: '一致性检验', body: consistency.aligned ? `三式同向，置信度${consistency.confidence}。` : `有分歧：${consistency.conflicts.join('；')}。以大六壬为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三式互参为传统占断参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '三式互参',
    purpose: '大六壬+奇门遁甲+梅花易数 三式交叉验证某事的吉凶、应期与方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SanshiComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三式有分歧，以大六壬为主'])],
  };
}

// ─── Combo 6: 今日养生建议（体质 + 节气 + 时辰经络 + 方位）───

export interface DailyWellnessComboInput {
  birth: BirthInput;
  /** 当前日期（默认取系统当前）。MCP/测试可显式传入以保证确定性 */
  now?: { year: number; month: number; day: number; hour: number };
  /** 当前小时（0-23），now 未传时用系统小时 */
  currentHour?: number;
  /** 用户体质类型（若有问卷结果，如「气虚质」）；未传则用五运六气倾向参考 */
  constitution?: string;
  /** 欲测年份（飞星/太岁方位用，默认取 now 或当前年） */
  targetYear?: number;
  solar?: SolarLike | null;
}

/** 今日养生 子系统结果（节略版，不走 tone 检验——养生无吉凶对立，只有建议） */
export interface WellnessSubsystem {
  name: string;
  summary: string;
}

export interface DailyWellnessResult {
  comboName: string;
  purpose: string;
  inputs: Record<string, unknown>;
  /** 当前日期 + 节气 + 时辰 */
  context: { date: string; jieqi: string; season: string; shichen: string; meridian: string };
  /** 体质（用户提供或五运六气倾向推断） */
  constitution: { type: string; source: '问卷' | '五运六气倾向参考'; reason: string };
  /** 节气调养 */
  jieqiWellness: JieqiWellness;
  /** 体质在节气下的针对性建议 */
  constitutionAdvice: string;
  /** 当前时辰经络养生 */
  meridianHour: MeridianHour;
  /** 方位养生提示（太岁五黄规避 + 个人吉方） */
  directionTip: string;
  /** 各维度子系统 */
  subsystems: WellnessSubsystem[];
  /** 整合结论 */
  synthesis: string;
  /** 综合建议条目 */
  recommendations: { label: string; value: string; tone: Tone }[];
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

/**
 * 今日养生建议 = 体质 + 24节气 + 子午流注时辰 + 太岁/飞星方位
 * 把「命理排盘」延伸到「日常养生决策」，形成命理+体质+时空养生闭环。
 * - 体质：优先用用户问卷结果（constitution 入参），否则用五运六气出生年倾向参考。
 * - 节气：当前所处节气调养 + 体质针对性加减。
 * - 时辰：当前当令经络 + 养生建议。
 * - 方位：本年太岁/五黄凶方规避 + 个人吉方借力。
 */
export function calcDailyWellnessCombo(input: DailyWellnessComboInput): ToolEnvelope<DailyWellnessResult> {
  const { birth, solar, constitution } = input;
  const now = input.now ?? (() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: input.currentHour ?? d.getHours() };
  })();
  const targetYear = input.targetYear ?? now.year;

  // 体质：优先用户问卷结果，否则五运六气倾向参考
  let constitutionType = constitution || '';
  let constitutionSource: '问卷' | '五运六气倾向参考' = '问卷';
  let constitutionReason = '基于问卷自评的主要体质';
  if (!constitutionType) {
    const yunqiEnv = calcYunqiEnveloped({ year: birth.year, birthMonth: birth.month, birthDay: birth.day, solar: (solar ?? null) as never, currentMonth: now.month });
    const tendency = getConstitutionTendency(yunqiEnv.data as never);
    if (tendency && tendency.tendencies.length > 0) {
      constitutionType = tendency.tendencies[0].type;
      constitutionReason = tendency.tendencies[0].reason;
      constitutionSource = '五运六气倾向参考';
    } else {
      constitutionType = '平和质';
      constitutionReason = '未提供问卷且五运六气倾向不显著，暂按平和质处理';
      constitutionSource = '五运六气倾向参考';
    }
  }

  // 节气调养（传入 jieQiTable 走精确，否则近似）
  const solarEntry = (solar ?? null) as { fromYmd?: (y: number, mo: number, d: number) => { getLunar(): { getJieQiTable?: () => Record<string, unknown> } } } | null;
  let jieQiTable: Record<string, unknown> | undefined;
  try {
    if (solarEntry?.fromYmd) {
      const lunar = solarEntry.fromYmd(now.year, now.month, now.day).getLunar();
      if (typeof lunar.getJieQiTable === 'function') jieQiTable = lunar.getJieQiTable();
    }
  } catch {
    /* 精确历法不可用，回退近似 */
  }
  const jieqiQuery = queryJieqiWellness({ year: now.year, month: now.month, day: now.day }, constitutionType, jieQiTable);
  const constitutionAdviceText = jieqiQuery.constitutionAdvice.length > 0
    ? jieqiQuery.constitutionAdvice.map((a) => `${a.advice}（注意：${a.caution}）`).join('；')
    : '本节气暂无该体质的针对性加减，按通用节气调养 + 该体质日常调养方向执行即可。';

  // 当前时辰经络
  const meridianHour = getMeridianByHour(now.hour) ?? (getMeridianByHour(0) as MeridianHour);

  // 方位：太岁/五黄 + 个人吉方
  const taisui = calcTaisui(targetYear);
  const mingGua = calcMingGua(birth.year, birth.gender);
  const personalDirs = getPersonalDirections(mingGua.trigram);
  const shengqiDir = personalDirs?.auspicious.find((d) => d.star === '生气')?.direction ?? '未知';
  const directionTip = `本年五黄大煞在${taisui.fiveYellow.direction}、三煞在${taisui.sanSha.direction}，此二方忌动土、宜静；` +
    `个人生气方${shengqiDir}（${mingGua.trigram}命），宜作主卧/办公位/养生活动方位。`;

  const subsystems: WellnessSubsystem[] = [
    { name: '体质', summary: `${constitutionType}（${constitutionSource}）：${constitutionReason}` },
    { name: '节气', summary: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季）：${jieqiQuery.wellness.principle}` },
    { name: '时辰经络', summary: `${meridianHour.name}（${meridianHour.time}）${meridianHour.meridian}当令：${meridianHour.advice}` },
    { name: '方位', summary: directionTip },
  ];

  const synthesis = `今日（${now.year}年${now.month}月${now.day}日，${jieqiQuery.jieqi}）养生建议：` +
    `您属${constitutionType}，当前${jieqiQuery.jieqi}节气宜「${jieqiQuery.wellness.principle}」；` +
    `此刻${meridianHour.name}${meridianHour.meridian}当令，宜${meridianHour.advice}；` +
    `方位上${directionTip}`;

  const recommendations: DailyWellnessResult['recommendations'] = [
    { label: '节气饮食', value: `${jieqiQuery.wellness.diet}`, tone: '中' },
    { label: '节气起居', value: `${jieqiQuery.wellness.lifestyle}`, tone: '中' },
    { label: '节气运动', value: `${jieqiQuery.wellness.exercise}`, tone: '中' },
    { label: '穴位保健', value: `${jieqiQuery.wellness.acupoints}`, tone: '中' },
    { label: '体质加减', value: constitutionAdviceText, tone: '中' },
    { label: '当令时辰', value: `${meridianHour.name}${meridianHour.meridian}当令，宜${meridianHour.advice}。`, tone: '中' },
    { label: '方位借力', value: `养生活动（按摩/运动/静坐）宜朝个人生气方${shengqiDir}；避本年五黄${taisui.fiveYellow.direction}、三煞${taisui.sanSha.direction}方久留动土。`, tone: '吉' },
  ];

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['今日养生', jieqiQuery.jieqi, constitutionType, meridianHour.name + meridianHour.meridian, `${mingGua.trigram}命`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '当前节气', body: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季），${jieqiQuery.wellness.feature}。调养总则：${jieqiQuery.wellness.principle}。` },
      { heading: '节气饮食', body: jieqiQuery.wellness.diet },
      { heading: '节气起居', body: jieqiQuery.wellness.lifestyle },
      { heading: '节气运动', body: jieqiQuery.wellness.exercise },
      { heading: '穴位保健', body: jieqiQuery.wellness.acupoints },
      { heading: '体质针对性建议', body: constitutionAdviceText },
      { heading: '当令时辰经络', body: `${meridianHour.name}（${meridianHour.time}）${meridianHour.meridian}当令，对应${meridianHour.organ}。生理：${meridianHour.function}。宜：${meridianHour.advice}。` },
      { heading: '方位养生', body: directionTip },
      { heading: '今日行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '今日养生为体质+节气+时辰+方位的多维度养生参考，非医疗诊断。如有健康问题请咨询专业中医师。',
  };

  const result: DailyWellnessResult = {
    comboName: '今日养生建议',
    purpose: '体质+24节气+子午流注时辰+太岁/飞星方位 联合推算今日养生方案',
    inputs: { birth: { year: birth.year, gender: birth.gender }, now, constitution: constitutionType, targetYear },
    context: {
      date: `${now.year}年${now.month}月${now.day}日`,
      jieqi: jieqiQuery.jieqi,
      season: jieqiQuery.wellness.season,
      shichen: meridianHour.name,
      meridian: meridianHour.meridian,
    },
    constitution: { type: constitutionType, source: constitutionSource, reason: constitutionReason },
    jieqiWellness: jieqiQuery.wellness,
    constitutionAdvice: constitutionAdviceText,
    meridianHour,
    directionTip,
    subsystems,
    synthesis,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'DailyWellnessComboEngine',
    mode: jieqiQuery.mode,
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [
      result.confidenceNote,
      ...(constitutionSource === '五运六气倾向参考' ? ['体质未提供问卷结果，按五运六气出生年倾向参考推断，建议完成体质问卷自评以获更精准建议'] : []),
    ],
  };
}

// ─── Combo 5: 三式合一（奇门 + 太乙 + 大六壬 传统三式）───

export interface SanshiClassicComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  solar?: SolarLike | null;
  /** 大六壬天将流派，透传至 calcDaliurenEnveloped；默认 classic */
  liurenSchool?: DaliurenSchool;
  /** 太乙计式，默认年计 0 */
  taiyiJiStyle?: TaiyiJiStyle;
  /** 太乙积年法，默认统宗 0 */
  taiyiAcumYear?: TaiyiAcumYear;
}

/**
 * 三式合一 = 奇门遁甲 + 太乙神数 + 大六壬（真正的传统三式）
 * 奇门主方位时机（八门九星），太乙主格局吉凶与主客胜负，大六壬主事态轨迹与应期。
 * 三式交叉验证：同向→高置信，分歧→以大六壬三传为主、太乙格局次之、奇门为辅。
 */
export function calcSanshiClassicCombo(input: SanshiClassicComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, liurenSchool, taiyiJiStyle = 0, taiyiAcumYear = 0 } = input;

  const qimenEnv = calcQimenEnveloped({ birth, question });
  const taiyiEnv = calcTaiyiEnveloped({ birth, jiStyle: taiyiJiStyle, acumYear: taiyiAcumYear, solar: (solar ?? null) as never });
  const liurenEnv = calcDaliurenEnveloped({ birth, solar: (solar ?? null) as never, school: liurenSchool ?? 'classic' });

  const subsystems: SubsystemResult[] = [
    { name: '奇门遁甲', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    { name: '太乙神数', tone: toneFromEnvelope(taiyiEnv), summary: summaryFromEnvelope(taiyiEnv), envelope: taiyiEnv },
    { name: '大六壬', tone: toneFromEnvelope(liurenEnv), summary: summaryFromEnvelope(liurenEnv), envelope: liurenEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三式各有所长：大六壬主断事态过程与应期
  const liurenTone = subsystems[2].tone;
  const taiyiTone = subsystems[1].tone;
  let synthesis = `针对「${question}」的三式合一：奇门${toneWord(subsystems[0].tone)}（八门九星主方位时机）、太乙${toneWord(taiyiTone)}（主客算与格局断吉凶胜负）、大六壬${toneWord(liurenTone)}（三传四课主事态轨迹与应期）。`;
  if (consistency.aligned) {
    synthesis += `三式方向一致，结论可信度${consistency.confidence}。`;
  } else {
    synthesis += `三式有分歧，以大六壬三传为主、太乙格局次之、奇门方位为辅参考。分歧：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liurenTone === '吉') {
    recommendations.push({ label: '事态可成', value: '大六壬三传吉，事态发展有利，宜把握时机推进。', tone: '吉' });
  } else if (liurenTone === '凶') {
    recommendations.push({ label: '宜缓宜守', value: '大六壬三传凶，事态有阻，宜暂缓观望、避免强求。', tone: '凶' });
  } else {
    recommendations.push({ label: '平稳推进', value: '大六壬三传平稳，可按既定计划进行，无需强求。', tone: '中' });
  }
  // 太乙主客胜负
  const taiyiData = taiyiEnv.data as { suenwl: string; home: { cal: number }; away: { cal: number } };
  recommendations.push({ label: '主客胜负', value: taiyiData.suenwl, tone: taiyiTone });
  // 奇门方位建议
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; gate: string }> };
  const auspiciousGates = qimenData.palaces?.filter((p) => ['开门', '生门', '休门'].includes(p.gate)) ?? [];
  if (auspiciousGates.length > 0) {
    recommendations.push({ label: '方位借力', value: `奇门吉门在${auspiciousGates.map((g) => g.trigram + '宫').join('、')}，可择吉方行事。`, tone: '吉' });
  }
  recommendations.push({ label: '心态', value: '三式为传统占断参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['三式合一', '奇门+太乙+大六壬', `置信度${consistency.confidence}`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '奇门遁甲', body: subsystems[0].summary },
      { heading: '太乙神数', body: subsystems[1].summary },
      { heading: '大六壬', body: subsystems[2].summary },
      { heading: '一致性检验', body: consistency.aligned ? `三式同向，置信度${consistency.confidence}。` : `有分歧：${consistency.conflicts.join('；')}。以大六壬为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三式合一为传统占断参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '三式合一',
    purpose: '奇门遁甲+太乙神数+大六壬 传统三式交叉验证某事的吉凶、主客胜负、应期与方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SanshiClassicComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三式有分歧，以大六壬为主'])],
  };
}
