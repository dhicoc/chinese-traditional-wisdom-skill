import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_BIRTH, type BirthData, type SolarBirth, toSolarBirth } from '@/legacy/birthBridge';
import {
  BIRTH_INTENT_EVENT,
  REFRESH_ALL_INTENT_EVENT,
  type BirthIntentDetail,
  type RefreshAllIntentDetail,
} from '@/lib/commandIntents';

/* ── Context 类型 ─────────────────────────────────────── */

interface BirthContextValue {
  /** 用户输入的生辰（可能是农历或公历） */
  birth: BirthData;
  /** 转换后的公历生辰（所有引擎统一用这个） */
  solarBirth: SolarBirth;
  /**
   * 引擎是否可用。
   * 拔除 visual/ 旧桥后纯 TS 引擎始终就绪；字段名保留以兼容既有 UI。
   */
  legacyReady: boolean;
  updateBirth: (patch: Partial<BirthData>) => void;
  resetBirth: () => void;
}

const BirthContext = createContext<BirthContextValue | null>(null);

/* ── Provider ────────────────────────────────────────── */

export function BirthProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState<BirthData>(DEFAULT_BIRTH);
  const birthRef = useRef<BirthData>(DEFAULT_BIRTH);

  useEffect(() => {
    birthRef.current = birth;
  }, [birth]);

  const updateBirth = useCallback((patch: Partial<BirthData>) => {
    setBirth((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetBirth = useCallback(() => {
    updateBirth(DEFAULT_BIRTH);
  }, [updateBirth]);

  useEffect(() => {
    function handleBirthIntent(event: Event) {
      const detail = (event as CustomEvent<BirthIntentDetail>).detail;
      if (!detail?.patch) return;
      updateBirth(detail.patch);
    }

    window.addEventListener(BIRTH_INTENT_EVENT, handleBirthIntent);
    return () => window.removeEventListener(BIRTH_INTENT_EVENT, handleBirthIntent);
  }, [updateBirth]);

  useEffect(() => {
    function handleRefreshAll(event: Event) {
      const detail = (event as CustomEvent<RefreshAllIntentDetail>).detail;
      void detail;
      // 强制触发依赖 solarBirth 的 useMemo 重算
      setBirth((prev) => ({ ...prev }));
    }

    window.addEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
    return () => window.removeEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
  }, []);

  const value = useMemo<BirthContextValue>(
    () => ({
      birth,
      solarBirth: toSolarBirth(birth),
      legacyReady: true,
      updateBirth,
      resetBirth,
    }),
    [birth, updateBirth, resetBirth],
  );

  return <BirthContext.Provider value={value}>{children}</BirthContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────── */

export function useBirth(): BirthContextValue {
  const ctx = useContext(BirthContext);
  if (!ctx) {
    throw new Error('useBirth must be used within BirthProvider');
  }
  return ctx;
}
