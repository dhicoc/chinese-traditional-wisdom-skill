import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_BIRTH, type BirthData, readFortuneBirth, writeFortuneBirth, toSolarBirth } from '@/legacy/birthBridge';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
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
  solarBirth: { year: number; month: number; day: number; hour: number; minute: number; gender: string; useExactCalendar: boolean };
  legacyReady: boolean;
  updateBirth: (patch: Partial<BirthData>) => void;
  resetBirth: () => void;
}

const BirthContext = createContext<BirthContextValue | null>(null);

/* ── Provider ────────────────────────────────────────── */

export function BirthProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState<BirthData>(DEFAULT_BIRTH);
  const [legacyReady, setLegacyReady] = useState(false);
  const birthRef = useRef<BirthData>(DEFAULT_BIRTH);
  const userBirthOverrideRef = useRef(false);

  useEffect(() => {
    birthRef.current = birth;
  }, [birth]);

  // 加载旧引擎后从 FORTUNE 读取当前出生资料
  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      if (state.mode === 'ready') {
        setLegacyReady(true);
        if (userBirthOverrideRef.current) {
          writeFortuneBirth(birthRef.current);
        } else {
          const currentBirth = readFortuneBirth();
          writeFortuneBirth(currentBirth);
          setBirth(currentBirth);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateBirth = useCallback(
    (patch: Partial<BirthData>) => {
      userBirthOverrideRef.current = true;
      setBirth((prev) => {
        const next = { ...prev, ...patch };
        // 同步到旧 FORTUNE（如果已加载）
        if (legacyReady) {
          writeFortuneBirth(next);
        }
        return next;
      });
    },
    [legacyReady],
  );

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
      if (legacyReady) {
        writeFortuneBirth(birthRef.current);
      }
      setBirth((prev) => ({ ...prev }));
    }

    window.addEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
    return () => window.removeEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
  }, [legacyReady]);

  const value = useMemo<BirthContextValue>(
    () => ({ birth, solarBirth: toSolarBirth(birth), legacyReady, updateBirth, resetBirth }),
    [birth, legacyReady, updateBirth, resetBirth],
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
