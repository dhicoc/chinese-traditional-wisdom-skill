import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

interface ZiweiBirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: '男' | '女';
}

interface ZiweiMingGua {
  trigram: string;
  group: string;
}

interface ZiweiPalace {
  stars: string[];
  position: string;
  miaoxian: string;
}

interface ZiweiData {
  birthInfo: ZiweiBirthInfo;
  mingGua: ZiweiMingGua;
  palaces: Record<string, ZiweiPalace>;
  sihua: Record<string, string>;
  mainStars: string[];
}

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'] as const;
const STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'] as const;
const POSITIONS = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const;
const BRIGHTNESS = ['庙', '旺', '得', '利', '平', '陷'] as const;

function calcMingGua(year: number, gender: '男' | '女'): ZiweiMingGua {
  const sum = String(year)
    .split('')
    .map((char) => Number.parseInt(char, 10))
    .reduce((acc, value) => acc + value, 0);
  const value = ((gender === '男' ? 11 : 4) - (sum % 9) + 9) % 9 || 9;
  const map: Record<number, ZiweiMingGua> = {
    1: { trigram: '坎', group: '东四命' },
    2: { trigram: '坤', group: '西四命' },
    3: { trigram: '震', group: '东四命' },
    4: { trigram: '巽', group: '东四命' },
    6: { trigram: '乾', group: '西四命' },
    7: { trigram: '兑', group: '西四命' },
    8: { trigram: '艮', group: '西四命' },
    9: { trigram: '离', group: '东四命' },
  };
  return map[value] ?? { trigram: '坎', group: '东四命' };
}

function createSeededGenerator(seedValue: number) {
  let seed = seedValue % 233280;
  return function next() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function buildZiweiDemoData(birthInfo: ZiweiBirthInfo): ZiweiData {
  const mingGua = calcMingGua(birthInfo.year, birthInfo.gender);
  const next = createSeededGenerator(
    birthInfo.year * 1000000 + birthInfo.month * 10000 + birthInfo.day * 100 + birthInfo.hour + (birthInfo.gender === '女' ? 7 : 3),
  );

  const palaces = PALACE_NAMES.reduce<Record<string, ZiweiPalace>>((acc, palaceName, index) => {
    const starCount = Math.floor(next() * 3) + 1;
    const starSet = new Set<string>();
    while (starSet.size < starCount) {
      starSet.add(STARS[Math.floor(next() * STARS.length)]);
    }
    acc[palaceName] = {
      stars: Array.from(starSet),
      position: POSITIONS[(index + birthInfo.month - 1) % POSITIONS.length],
      miaoxian: BRIGHTNESS[Math.floor(next() * BRIGHTNESS.length)],
    };
    return acc;
  }, {});

  return {
    birthInfo,
    mingGua,
    palaces,
    sihua: { 廉贞: '禄', 破军: '权', 武曲: '科', 太阳: '忌' },
    mainStars: [...STARS],
  };
}

export function ZiweiWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [birthInfo, setBirthInfo] = useState<ZiweiBirthInfo>({ year: 1990, month: 1, day: 1, hour: 0, gender: '男' });

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const data = useMemo(() => buildZiweiDemoData(birthInfo), [birthInfo]);
  const ready = legacyState.mode === 'ready';
  const contextPayload = useMemo(
    () => ({
      module: 'ziwei',
      mode: 'legacy-canvas-react-shell',
      data,
      source: 'visual/js/ziwei.js (render)',
      note: '当前仍为演示结构，后续再接真实 iztro adapter。',
    }),
    [data],
  );

  function updateBirth<K extends keyof ZiweiBirthInfo>(key: K, value: ZiweiBirthInfo[K]) {
    setBirthInfo((current: ZiweiBirthInfo) => ({ ...current, [key]: value }));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">紫微斗数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              先复用旧 ziwei renderer，React 负责出生信息输入与演示命盘数据生成。当前阶段仍是结构迁移，不宣称真实排盘。
            </p>
          </div>
          <CopyContextButton title="紫微斗数 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <div className="grid grid-cols-2 gap-3">
            <ControlField
              label="出生年"
              type="number"
              min={1900}
              max={2100}
              inputMode="numeric"
              value={birthInfo.year}
              onChange={(event) => updateBirth('year', Number.parseInt(event.target.value, 10) || 1990)}
            />
            <ControlField
              label="出生月"
              type="number"
              min={1}
              max={12}
              inputMode="numeric"
              value={birthInfo.month}
              onChange={(event) => updateBirth('month', Number.parseInt(event.target.value, 10) || 1)}
            />
            <ControlField
              label="出生日"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              value={birthInfo.day}
              onChange={(event) => updateBirth('day', Number.parseInt(event.target.value, 10) || 1)}
            />
            <ControlField
              label="时辰"
              type="number"
              min={0}
              max={23}
              inputMode="numeric"
              value={birthInfo.hour}
              onChange={(event) => updateBirth('hour', Number.parseInt(event.target.value, 10) || 0)}
            />
          </div>

          <ControlField label="性别">
            <select
              value={birthInfo.gender}
              onChange={(event) => updateBirth('gender', event.target.value as '男' | '女')}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-jade-500/45"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </ControlField>

          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-zinc-100">命卦摘要</p>
            <p className="mt-2 text-sm text-zinc-400">{data.mingGua.trigram}卦 · {data.mingGua.group}</p>
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            当前紫微命盘仍为演示结构迁移。后续接入真实排盘 adapter 前，页面只用于验证 React 外壳与旧 renderer 的兼容性。
          </p>
        </aside>

        <CanvasPanel
          title="十二宫命盘"
          description="与旧 visual/index.html 的 ziwei renderer 对齐，使用同一份演示结构数据契约。"
          data={data}
          width={650}
          height={570}
          ready={ready}
          render={(canvasId, value) => {
            const module = (window as Window & { LegacyVizModules?: { ziwei?: { render: (id: string, chart: ZiweiData) => void } } }).LegacyVizModules?.ziwei;
            if (!module) throw new Error('Legacy ziwei module is not loaded.');
            module.render(canvasId, value);
          }}
        />
      </div>
    </section>
  );
}
