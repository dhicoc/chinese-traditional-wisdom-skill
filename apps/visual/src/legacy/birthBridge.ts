/**
 * 全局出生资料类型 — 与旧 data-bridge.js 的 FORTUNE.getBirth() 对齐。
 *
 * 历法设计：
 * - isLunar: 用户输入的是农历还是公历（二选一）
 * - useExactCalendar: 计算精度开关（用不用 lunar-javascript 精确节气），和历法类型正交
 * - 内部统一用公历计算：如果 isLunar=true，用 toSolarBirth() 转公历后所有引擎统一用公历
 */
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
 * 如果 isLunar=true，用 lunar-javascript Lunar.fromYmd 转公历；
 * 如果 isLunar=false，直接返回原值。
 * 所有引擎统一用这个函数拿公历日期，确保农历输入时结果正确。
 */
export function toSolarBirth(birth: BirthData): SolarBirth {
  if (!birth.isLunar) {
    return { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute, gender: birth.gender, useExactCalendar: birth.useExactCalendar };
  }
  // 农历转公历
  try {
    const w = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
      Lunar?: {
        fromYmd: (y: number, m: number, d: number) => {
          getSolar: () => { getYear: () => number; getMonth: () => number; getDay: () => number };
        };
      };
    };
    if (w.Lunar) {
      const solar = w.Lunar.fromYmd(birth.year, birth.month, birth.day).getSolar();
      return {
        year: solar.getYear(),
        month: solar.getMonth(),
        day: solar.getDay(),
        hour: birth.hour,
        minute: birth.minute,
        gender: birth.gender,
        useExactCalendar: birth.useExactCalendar,
      };
    }
  } catch {
    /* lunar-javascript 未加载，用原始值 */
  }
  // 兜底：lunar-javascript 不可用时用原始值（可能不准但不崩溃）
  return { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute, gender: birth.gender, useExactCalendar: birth.useExactCalendar };
}

/**
 * 旧 FORTUNE 全局对象的类型声明（data-bridge.js 桥接后存在）。
 */
interface FortuneWindow extends Window {
  FORTUNE?: {
    getBirth?: () => BirthData;
    getData?: () => unknown;
    onUpdate?: (fn: (data: unknown) => void) => void;
    update?: (birth: Partial<BirthData>) => void;
    getBaziRender?: () => unknown;
    getYunqi?: () => unknown;
    getConstitution?: () => unknown;
    getFengshui?: () => unknown;
    getCapabilities?: () => unknown;
    exportReportData?: () => unknown;
  };
}

function fortuneWindow(): FortuneWindow {
  return window as FortuneWindow;
}

/**
 * 从旧 FORTUNE 读取当前出生资料；未加载时返回默认值。
 */
export function readFortuneBirth(): BirthData {
  return fortuneWindow().FORTUNE?.getBirth?.() ?? DEFAULT_BIRTH;
}

/**
 * 通过旧 FORTUNE 更新出生资料并触发全局刷新。
 */
export function writeFortuneBirth(birth: Partial<BirthData>): void {
  fortuneWindow().FORTUNE?.update?.(birth);
}

/**
 * 注册 FORTUNE 数据变更回调，返回取消注册的函数。
 */
export function onFortuneUpdate(fn: (data: unknown) => void): () => void {
  const w = fortuneWindow();
  w.FORTUNE?.onUpdate?.(fn);
  return () => {
    // 旧 FORTUNE 没有 unsubscribe，但 React 侧通过 mounted 标志忽略后续调用
  };
}
