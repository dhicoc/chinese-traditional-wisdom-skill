import type { BaziBirth } from './baziEngine';
import type { BazhaiInput } from './bazhaiEngine';
import type { FeixingInput } from './feixingEngine';
import type { VerifiedBirthLocation } from './trueSolarTime';
import type { ZiweiInput } from './ziweiEngine';

export interface TrueSolarTimeToolInput {
  birth: BaziBirth;
  location: VerifiedBirthLocation;
}

export interface BaziToolInput {
  birth: BaziBirth;
  timeBasis: 'true-solar-verified' | 'civil-unverified';
  civilFallbackConfirmed?: boolean;
  trueSolarBirth?: BaziBirth;
  trueSolarResolution?: { trueSolarBirth: BaziBirth };
  shenShaTrineSource?: 'year' | 'day';
}

export interface DivinationBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: '男' | '女';
}

export interface LiuyaoToolInput {
  birth: DivinationBirth;
  method?: 'coin' | 'time' | 'manual' | 'yarrow';
  yaoValues?: string;
  question?: string;
  seed?: number;
}

export interface QimenToolInput {
  birth: DivinationBirth;
  question?: string;
}

export interface DaliurenToolInput {
  birth: DivinationBirth;
  school?: 'classic' | 'gufa' | 'daxquan';
}

export interface TaiyiToolInput {
  birth: DivinationBirth;
  jiStyle?: 0 | 1 | 2 | 3 | 4;
  acumYear?: 0 | 1 | 2 | 3;
}

export interface MeihuaToolInput {
  birth: DivinationBirth;
  method?: 'time' | 'number' | 'yarrow';
  numberA?: number;
  numberB?: number;
}

export type LocalToolContractInput =
  | TrueSolarTimeToolInput
  | BaziToolInput
  | ZiweiInput
  | FeixingInput
  | BazhaiInput
  | LiuyaoToolInput
  | QimenToolInput
  | DaliurenToolInput
  | TaiyiToolInput
  | MeihuaToolInput;

type Input = Record<string, unknown>;

const DIRECTIONS = new Set(['东', '东南', '南', '西南', '西', '西北', '北', '东北']);

function object(value: unknown, label: string): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}必须是 JSON 对象。`);
  return value as Input;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${label}必须是 ${min}-${max} 的整数。`);
  }
  return value as number;
}

function birth(value: unknown, label: string): BaziBirth {
  const input = object(value, label);
  const year = integer(input.year, `${label}.year`, 1, 9999);
  const month = integer(input.month, `${label}.month`, 1, 12);
  const day = integer(input.day, `${label}.day`, 1, 31);
  const hour = integer(input.hour, `${label}.hour`, 0, 23);
  const minute = input.minute === undefined ? 0 : integer(input.minute, `${label}.minute`, 0, 59);
  const gender = input.gender;
  if (gender !== '男' && gender !== '女') throw new Error(`${label}.gender 必须是“男”或“女”。`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label}不是有效公历日期。`);
  }
  return { year, month, day, hour, minute, gender, isLunar: input.isLunar === true, useExactCalendar: input.useExactCalendar !== false };
}

function divinationBirth(value: unknown): DivinationBirth {
  const input = object(value, 'birth');
  const yearValue = integer(input.year, 'birth.year', 1, 9999);
  const month = integer(input.month, 'birth.month', 1, 12);
  const day = integer(input.day, 'birth.day', 1, 31);
  const hour = integer(input.hour, 'birth.hour', 0, 23);
  const minute = input.minute === undefined ? 0 : integer(input.minute, 'birth.minute', 0, 59);
  const date = new Date(Date.UTC(yearValue, month - 1, day));
  if (date.getUTCFullYear() !== yearValue || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('birth不是有效公历日期。');
  }
  if (input.gender !== undefined && input.gender !== '男' && input.gender !== '女') throw new Error('birth.gender 必须是“男”或“女”。');
  return { year: yearValue, month, day, hour, minute, gender: input.gender as DivinationBirth['gender'] };
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}必须是有限数字。`);
  return value;
}

function year(value: unknown, label: string): number {
  return integer(value, label, 1, 9999);
}

function direction(value: unknown, label: string): string {
  if (typeof value !== 'string' || !DIRECTIONS.has(value)) throw new Error(`${label}必须是八方位之一。`);
  return value;
}

export function parseLocalToolInput(tool: string, rawInput: unknown): LocalToolContractInput | null {
  const input = object(rawInput, '工具输入');

  switch (tool) {
    case 'resolve_true_solar_time': {
      const location = object(input.location, 'location');
      if (typeof location.displayName !== 'string' || !location.displayName.trim()) throw new Error('location.displayName 必须是非空字符串。');
      if (typeof location.longitude !== 'number' || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) throw new Error('location.longitude 必须是 -180 至 180 的数字。');
      if (typeof location.ianaTimeZone !== 'string' || !location.ianaTimeZone.includes('/')) throw new Error('location.ianaTimeZone 必须是 IANA 时区。');
      integer(location.utcOffsetMinutes, 'location.utcOffsetMinutes', -840, 840);
      if (typeof location.utcOffsetEvidence !== 'string' || !location.utcOffsetEvidence.trim()) throw new Error('location.utcOffsetEvidence 必须是非空字符串。');
      return { birth: birth(input.birth, 'birth'), location: location as unknown as VerifiedBirthLocation };
    }
    case 'bazi_calculate': {
      const timeBasis = input.timeBasis;
      if (timeBasis !== 'true-solar-verified' && timeBasis !== 'civil-unverified') throw new Error('timeBasis 必须是 true-solar-verified 或 civil-unverified。');
      if (input.shenShaTrineSource !== undefined && input.shenShaTrineSource !== 'year' && input.shenShaTrineSource !== 'day') throw new Error('shenShaTrineSource 必须是 year 或 day。');
      return { ...input, birth: birth(input.birth, 'birth'), timeBasis } as BaziToolInput;
    }
    case 'ziwei_chart': {
      const transit = input.transit === undefined ? undefined : object(input.transit, 'transit');
      if (transit) {
        year(transit.year, 'transit.year');
        integer(transit.month, 'transit.month', 1, 12);
      }
      return { ...input, birth: birth(input.birth, 'birth'), transit } as ZiweiInput;
    }
    case 'calc_feixing': {
      if (input.year !== undefined) year(input.year, 'year');
      if (input.birthYear !== undefined) year(input.birthYear, 'birthYear');
      if (input.gender !== undefined && input.gender !== '男' && input.gender !== '女') throw new Error('gender 必须是“男”或“女”。');
      return input as FeixingInput;
    }
    case 'calc_bazhai': {
      year(input.birthYear, 'birthYear');
      if (input.gender !== '男' && input.gender !== '女') throw new Error('gender 必须是“男”或“女”。');
      if (input.year !== undefined) year(input.year, 'year');
      for (const key of ['door', 'bedroom', 'kitchen'] as const) {
        if (input[key] !== undefined) direction(input[key], key);
      }
      return input as unknown as BazhaiInput;
    }
    case 'cast_liuyao': {
      const method = input.method ?? 'coin';
      if (!['coin', 'time', 'manual', 'yarrow'].includes(method as string)) throw new Error('method 必须是 coin、time、manual 或 yarrow。');
      if (method === 'manual' && (typeof input.yaoValues !== 'string' || !/^[6-9]{6}$/.test(input.yaoValues))) {
        throw new Error('method=manual 必须提供 6 位 6-9 的 yaoValues。');
      }
      if (input.seed !== undefined) finiteNumber(input.seed, 'seed');
      if (input.question !== undefined && typeof input.question !== 'string') throw new Error('question 必须是字符串。');
      return { ...input, birth: divinationBirth(input.birth), method } as LiuyaoToolInput;
    }
    case 'arrange_qimen': {
      if (input.question !== undefined && typeof input.question !== 'string') throw new Error('question 必须是字符串。');
      return { ...input, birth: divinationBirth(input.birth) } as QimenToolInput;
    }
    case 'liuren_calculate': {
      const school = input.school ?? 'classic';
      if (!['classic', 'gufa', 'daxquan'].includes(school as string)) throw new Error('school 必须是 classic、gufa 或 daxquan。');
      return { ...input, birth: divinationBirth(input.birth), school } as DaliurenToolInput;
    }
    case 'taiyi_calculate': {
      const jiStyle = input.jiStyle ?? 0;
      const acumYear = input.acumYear ?? 0;
      if (!Number.isInteger(jiStyle) || ![0, 1, 2, 3, 4].includes(jiStyle as number)) throw new Error('jiStyle 必须是 0-4 的整数。');
      if (!Number.isInteger(acumYear) || ![0, 1, 2, 3].includes(acumYear as number)) throw new Error('acumYear 必须是 0-3 的整数。');
      return { ...input, birth: divinationBirth(input.birth), jiStyle, acumYear } as TaiyiToolInput;
    }
    case 'cast_meihua': {
      const method = input.method ?? 'time';
      if (!['time', 'number', 'yarrow'].includes(method as string)) throw new Error('method 必须是 time、number 或 yarrow。');
      if (method === 'number') {
        finiteNumber(input.numberA, 'numberA');
        finiteNumber(input.numberB, 'numberB');
      }
      return { ...input, birth: divinationBirth(input.birth), method } as MeihuaToolInput;
    }
    default:
      return null;
  }
}
