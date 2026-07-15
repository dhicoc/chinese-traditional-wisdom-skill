/**
 * 全局出生资料类型与公历转换（纯 TS，不依赖 window.FORTUNE / visual/ vendor）
 */

import { getLunarEntry } from './solarEntry';

export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  /** true=用户输入的是农历日期，false=公历 */
  isLunar: boolean;
  /** true=用 lunar-javascript 精确节气干支，false=本地近似 */
  useExactCalendar: boolean;
}

/** 公历生辰（已转历，不含 isLunar）；供所有引擎统一消费 */
export interface SolarBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  useExactCalendar: boolean;
}

export const DEFAULT_BIRTH: BirthData = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 0,
  gender: '男',
  isLunar: false,
  useExactCalendar: true,
};

/**
 * 把 BirthData 转成公历日期。
 * isLunar=true 时用 lunar-javascript Lunar.fromYmd 转公历。
 */
export function toSolarBirth(birth: BirthData): SolarBirth {
  if (!birth.isLunar) {
    return {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute,
      gender: birth.gender,
      useExactCalendar: birth.useExactCalendar,
    };
  }
  try {
    const Lunar = getLunarEntry();
    const solar = Lunar.fromYmd(birth.year, birth.month, birth.day).getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      hour: birth.hour,
      minute: birth.minute,
      gender: birth.gender,
      useExactCalendar: birth.useExactCalendar,
    };
  } catch {
    /* 转换失败时用原始值（可能不准但不崩溃） */
    return {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute,
      gender: birth.gender,
      useExactCalendar: birth.useExactCalendar,
    };
  }
}

/** @deprecated 旧 FORTUNE 全局已移除；保留 API 以免外部误调用崩溃 */
export function readFortuneBirth(): BirthData {
  return DEFAULT_BIRTH;
}

/** @deprecated 旧 FORTUNE 全局已移除；生辰仅由 React BirthContext 管理 */
export function writeFortuneBirth(_birth: Partial<BirthData>): void {
  void _birth;
}

/** @deprecated 旧 FORTUNE 全局已移除 */
export function onFortuneUpdate(_fn: (data: unknown) => void): () => void {
  void _fn;
  return () => undefined;
}
