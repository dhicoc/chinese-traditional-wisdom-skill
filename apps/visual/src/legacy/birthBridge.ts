/**
 * 全局出生资料类型 — 与旧 data-bridge.js 的 FORTUNE.getBirth() 对齐。
 */
export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  isLunar: boolean;
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
