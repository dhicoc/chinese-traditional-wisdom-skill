import { calculateBazi, type BaziBirth, type BaziInput } from './baziEngine';

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
type Shichen = typeof SHICHEN[number];

export interface BaziTimeSensitivityInput {
  birth: Omit<BaziBirth, 'hour' | 'minute'>;
  startHour: number;
  endHour: number;
  solar?: BaziInput['solar'];
}

export interface BaziTimeCandidate {
  hour: number;
  shichen: Shichen;
  pillars: { year: string; month: string; day: string; hour: string };
  dayMaster: string;
  elements: Record<'木' | '火' | '土' | '金' | '水', number>;
  strength: string;
  mode: 'local-exact' | 'local-approx';
}

export interface BaziTimeSensitivityResult {
  range: { startHour: number; endHour: number; wrapsMidnight: boolean };
  candidates: BaziTimeCandidate[];
  stableFacts: Array<{ field: string; label: string; value: string }>;
  variableFacts: Array<{ field: string; label: string; values: string[] }>;
  limitations: string[];
}

export function hourToShichen(hour: number): Shichen {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError('hour 必须是 0-23 的整数。');
  return SHICHEN[Math.floor(((hour + 1) % 24) / 2)];
}

function hoursInRange(startHour: number, endHour: number): number[] {
  if (![startHour, endHour].every((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)) throw new RangeError('startHour/endHour 必须是 0-23 的整数。');
  const hours = [];
  for (let offset = 0; offset < 24; offset++) {
    const hour = (startHour + offset) % 24;
    hours.push(hour);
    if (hour === endHour) return hours;
  }
  return hours;
}

const FACTS: Array<{ field: string; label: string; read: (candidate: BaziTimeCandidate) => string }> = [
  { field: 'yearPillar', label: '年柱', read: (item) => item.pillars.year },
  { field: 'monthPillar', label: '月柱', read: (item) => item.pillars.month },
  { field: 'dayPillar', label: '日柱', read: (item) => item.pillars.day },
  { field: 'hourPillar', label: '时柱', read: (item) => item.pillars.hour },
  { field: 'dayMaster', label: '日主', read: (item) => item.dayMaster },
  { field: 'strength', label: '日主强弱（传统术语）', read: (item) => item.strength },
  { field: 'elements', label: '五行计数', read: (item) => ['木', '火', '土', '金', '水'].map((key) => `${key}${item.elements[key as keyof typeof item.elements]}`).join('、') },
];

export function parseBaziTimeSensitivityInput(value: unknown): Omit<BaziTimeSensitivityInput, 'solar'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('输入必须是 JSON 对象。');
  const raw = value as Record<string, unknown>;
  if (!raw.birth || typeof raw.birth !== 'object' || Array.isArray(raw.birth)) throw new TypeError('birth 必须是对象。');
  const birth = raw.birth as Record<string, unknown>;
  const integer = (field: string, input: unknown, min: number, max: number) => {
    if (!Number.isInteger(input) || (input as number) < min || (input as number) > max) throw new TypeError(`${field} 必须是 ${min}-${max} 的整数。`);
    return input as number;
  };
  if (birth.gender !== '男' && birth.gender !== '女') throw new TypeError('birth.gender 必须是男或女。');
  return {
    birth: {
      year: integer('birth.year', birth.year, 1900, 2100),
      month: integer('birth.month', birth.month, 1, 12),
      day: integer('birth.day', birth.day, 1, 31),
      gender: birth.gender,
      isLunar: birth.isLunar === true,
    },
    startHour: integer('startHour', raw.startHour, 0, 23),
    endHour: integer('endHour', raw.endHour, 0, 23),
  };
}
export function analyzeBaziTimeSensitivity(input: BaziTimeSensitivityInput): BaziTimeSensitivityResult {
  const representativeHours = new Map<Shichen, number>();
  for (const hour of hoursInRange(input.startHour, input.endHour)) representativeHours.set(hourToShichen(hour), representativeHours.get(hourToShichen(hour)) ?? hour);
  const candidates = [...representativeHours.entries()].map(([shichen, hour]) => {
    const result = calculateBazi({ birth: { ...input.birth, hour, minute: 0 }, solar: input.solar });
    const pillar = (key: keyof typeof result.pillars) => `${result.pillars[key].stem}${result.pillars[key].branch}`;
    return {
      hour, shichen,
      pillars: { year: pillar('year'), month: pillar('month'), day: pillar('day'), hour: pillar('hour') },
      dayMaster: result.dayMaster,
      elements: result.elements,
      strength: result.advancedAnalysis.support.strength,
      mode: result.mode,
    } satisfies BaziTimeCandidate;
  });
  const stableFacts: BaziTimeSensitivityResult['stableFacts'] = [];
  const variableFacts: BaziTimeSensitivityResult['variableFacts'] = [];
  for (const fact of FACTS) {
    const values = [...new Set(candidates.map(fact.read))];
    if (values.length === 1) stableFacts.push({ field: fact.field, label: fact.label, value: values[0] });
    else variableFacts.push({ field: fact.field, label: fact.label, values });
  }
  return {
    range: { startHour: input.startHour, endHour: input.endHour, wrapsMidnight: input.startHour > input.endHour },
    candidates,
    stableFacts,
    variableFacts,
    limitations: [
      '本功能只比较候选时辰下哪些结构化字段稳定或变化，不校时、不反推、也不选择唯一出生时辰。',
      '候选时辰仍受民用时间、真太阳时和流派口径影响；需要真太阳时结论时必须先完成外部地点与历史时区核验。',
      '传统解释与现实人生事件不用于筛选候选时辰。',
    ],
  };
}
