import { useState } from 'react';
import { useBirth } from '@/lib/birthContext';
import { ControlField } from '@/components/shared/ControlField';
import { DEFAULT_BIRTH } from '@/legacy/birthBridge';

/**
 * 全局出生资料面板 — 同步到旧 FORTUNE 全局数据。
 * 放在 CommandBar 下方，所有工作区共享同一份出生资料。
 * UX P0：默认生辰时自动展开 + 高亮提示，引导新用户先填生辰。
 */
export function BirthPanel() {
  const { birth, legacyReady, updateBirth, resetBirth } = useBirth();

  // 判断是否仍为默认生辰（用户未修改过）
  const isDefaultBirth =
    birth.year === DEFAULT_BIRTH.year &&
    birth.month === DEFAULT_BIRTH.month &&
    birth.day === DEFAULT_BIRTH.day &&
    birth.hour === DEFAULT_BIRTH.hour &&
    birth.gender === DEFAULT_BIRTH.gender;

  // 默认生辰时自动展开，引导用户修改。
  // expandedOnce：默认即展开过，避免修改生辰数据（如+1年）使 isDefaultBirth 变 false 时意外折叠。
  const [userToggled, setUserToggled] = useState(false);
  const [userToggledHidden, setUserToggledHidden] = useState(false);
  const [expandedOnce] = useState(true);
  const expanded = userToggledHidden ? false : (userToggled || isDefaultBirth || expandedOnce);

  const summary = `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')} ${birth.gender} ${birth.isLunar ? '农历' : '公历'} ${birth.useExactCalendar ? '精确' : '近似'}`;

  const handleToggle = () => {
    if (isDefaultBirth && !userToggledHidden && !userToggled) {
      // 首次点击（默认展开状态）→ 收起
      setUserToggledHidden(true);
    } else {
      setUserToggled(!userToggled);
      setUserToggledHidden(false);
    }
  };

  return (
    <div className={`rounded-panel p-3 transition ${
      isDefaultBirth
        ? 'border border-gold-500/30 bg-gold-500/5 shadow-[0_0_20px_rgba(201,178,122,0.08)]'
        : 'border border-ink-700 bg-ink-850/60'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-2 text-left text-sm text-jade-100/70 transition hover:text-jade-100"
        >
          <span className="font-mono text-xs text-jade-400">{expanded ? '▾' : '▸'}</span>
          <span className="font-semibold">全局生辰</span>
          <span className="text-jade-100/45">{summary}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${legacyReady ? 'bg-jade-500/15 text-jade-400' : 'bg-ink-700/50 text-jade-100/30'}`}>
            {legacyReady ? '已同步' : '等待引擎'}
          </span>
        </button>
        {expanded && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定重置生辰为默认值（1990-06-15 12时 男）？')) {
                resetBirth();
              }
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-jade-100/55 transition hover:text-jade-100"
          >
            重置
          </button>
        )}
      </div>

      {/* 默认生辰提示 */}
      {isDefaultBirth && (
        <div className="mt-2 flex items-center gap-2 rounded-card border border-gold-500/20 bg-gold-500/8 px-3 py-2">
          <span className="text-gold-400">⚠</span>
          <span className="text-xs text-gold-400/80">
            当前为默认生辰（1990-06-15），请修改为您的真实出生信息以查看真实排盘结果。
          </span>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* 年月日时：2×2 网格，数字字段宽够清晰 */}
          <div className="grid grid-cols-2 gap-2">
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
          </div>

          {/* 性别 + 历法：同一行，左右各半 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-jade-100/45">
              <span>性别</span>
              <select
                value={birth.gender}
                onChange={(e) => updateBirth({ gender: e.target.value as '男' | '女' })}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900/60 backdrop-blur-md px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-jade-100/45">历法</span>
              <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5 self-start">
                <button
                  type="button"
                  onClick={() => updateBirth({ isLunar: false })}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${!birth.isLunar ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
                >
                  公历
                </button>
                <button
                  type="button"
                  onClick={() => updateBirth({ isLunar: true })}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${birth.isLunar ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
                >
                  农历
                </button>
              </div>
            </div>
          </div>

          {/* 精确节气：单独一行 */}
          <label className="flex items-center gap-2 text-xs text-jade-100/55">
            <input
              type="checkbox"
              checked={birth.useExactCalendar}
              onChange={(e) => updateBirth({ useExactCalendar: e.target.checked })}
              className="h-3.5 w-3.5 accent-jade-500"
            />
            精确节气
          </label>
        </div>
      )}
    </div>
  );
}
