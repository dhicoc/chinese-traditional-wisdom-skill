import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_BIRTH, type BirthData, readFortuneBirth, writeFortuneBirth } from '@/legacy/birthBridge';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';

/* ── Context 类型 ─────────────────────────────────────── */

interface BirthContextValue {
  birth: BirthData;
  legacyReady: boolean;
  updateBirth: (patch: Partial<BirthData>) => void;
  resetBirth: () => void;
}

const BirthContext = createContext<BirthContextValue | null>(null);

/* ── Provider ────────────────────────────────────────── */

export function BirthProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState<BirthData>(DEFAULT_BIRTH);
  const [legacyReady, setLegacyReady] = useState(false);

  // 加载旧引擎后从 FORTUNE 读取当前出生资料
  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      if (state.mode === 'ready') {
        setLegacyReady(true);
        setBirth(readFortuneBirth());
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateBirth = useCallback(
    (patch: Partial<BirthData>) => {
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

  const value = useMemo<BirthContextValue>(
    () => ({ birth, legacyReady, updateBirth, resetBirth }),
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
