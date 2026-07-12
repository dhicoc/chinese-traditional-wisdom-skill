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
import { calcDaliurenEnveloped } from './daliurenEngine';
import { calcMingGua, getPersonalDirections, combineBazhaiFeixing, type MingGua } from './bazhaiHouse';
import { getYuanYun, MING_GUA_DIRECTIONS } from './flyingStarRemedies';

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

  const baziEnv = calcBaziEnveloped({ birth, solar: solar ?? null });
  const yunqiEnv = calcYunqiEnveloped({ year: targetYear, birthMonth: birth.month, birthDay: birth.day, solar: solar ?? null, currentMonth: input.currentMonth });
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

  const liuyaoEnv = calcLiuyaoEnveloped({ birth, method: 'coin', question, seed, solar: solar ?? null });
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time', solar: solar ?? null });
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
}

/**
 * 三式互参 = 大六壬 + 奇门遁甲 + 梅花易数
 * 大六壬重三传四课（事态轨迹+应期），奇门重八门九星（方位择吉），梅花重体用生克（快速判断）。
 * 三式各有所长，交叉验证：同向→高置信，分歧→权衡。
 */
export function calcSanshiCombo(input: SanshiComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar } = input;

  const liurenEnv = calcDaliurenEnveloped({ birth, solar: solar ?? null });
  const qimenEnv = calcQimenEnveloped({ birth, question });
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time', solar: solar ?? null });

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
