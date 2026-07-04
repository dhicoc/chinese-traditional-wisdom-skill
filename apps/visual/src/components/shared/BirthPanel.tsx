import { useState } from 'react';
import { useBirth } from '@/lib/birthContext';
import { ControlField } from '@/components/shared/ControlField';

/**
 * 全局出生资料面板 — 同步到旧 FORTUNE 全局数据。
 * 放在 CommandBar 下方，所有工作区共享同一份出生资料。
 */
export function BirthPanel() {
  const { birth, legacyReady, updateBirth, resetBirth } = useBirth();
  const [expanded, setExpanded] = useState(false);

  const summary = `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')} ${birth.gender} ${birth.isLunar ? '农历' : '公历'} ${birth.useExactCalendar ? '精确' : '近似'}`;

  return (
    <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left text-sm text-zinc-300 transition hover:text-zinc-100"
        >
          <span className="font-mono text-xs text-jade-500">{expanded ? '▾' : '▸'}</span>
          <span className="font-semibold">全局生辰</span>
          <span className="text-zinc-500">{summary}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${legacyReady ? 'bg-jade-500/15 text-jade-500' : 'bg-zinc-700/30 text-zinc-500'}`}>
            {legacyReady ? '已同步' : '等待引擎'}
          </span>
        </button>
        {expanded && (
          <button
            type="button"
            onClick={resetBirth}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400 transition hover:text-zinc-100"
          >
            重置
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <ControlField
            label="年"
            type="number"
            min={1900}
            max={2100}
            inputMode="numeric"
            value={birth.year}
            onChange={(e) => updateBirth({ year: Number.parseInt(e.target.value, 10) || 1990 })}
          />
          <ControlField
            label="月"
            type="number"
            min={1}
            max={12}
            inputMode="numeric"
            value={birth.month}
            onChange={(e) => updateBirth({ month: Number.parseInt(e.target.value, 10) || 1 })}
          />
          <ControlField
            label="日"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            value={birth.day}
            onChange={(e) => updateBirth({ day: Number.parseInt(e.target.value, 10) || 1 })}
          />
          <ControlField
            label="时"
            type="number"
            min={0}
            max={23}
            inputMode="numeric"
            value={birth.hour}
            onChange={(e) => updateBirth({ hour: Number.parseInt(e.target.value, 10) || 0 })}
          />
          <label className="grid gap-1 text-xs text-zinc-500">
            <span>性别</span>
            <select
              value={birth.gender}
              onChange={(e) => updateBirth({ gender: e.target.value as '男' | '女' })}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-jade-500/45"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={birth.isLunar}
                onChange={(e) => updateBirth({ isLunar: e.target.checked })}
                className="h-3.5 w-3.5 accent-jade-500"
              />
              农历
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={birth.useExactCalendar}
                onChange={(e) => updateBirth({ useExactCalendar: e.target.checked })}
                className="h-3.5 w-3.5 accent-jade-500"
              />
              精确历法
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
