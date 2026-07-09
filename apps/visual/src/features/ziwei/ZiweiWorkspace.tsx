import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LegendPanel } from '@/components/shared/LegendPanel';
import { ZiweiPalaceGrid } from '@/components/shared/ZiweiPalaceGrid';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataModeBadge } from '@/components/shared/DataModeBadge';
import type { BirthData } from '@/legacy/birthBridge';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useBirth } from '@/lib/birthContext';

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
  birthInfo: Pick<BirthData, 'year' | 'month' | 'day' | 'hour' | 'gender'>;
  mingGua: ZiweiMingGua;
  palaces: Record<string, ZiweiPalace>;
  sihua: Record<string, string>;
  mainStars: string[];
  engineName?: string;
  mode?: string;
  version?: string;
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

function buildFallbackZiweiData(birth: BirthData, mingGua: ZiweiMingGua): ZiweiData {
  const next = createSeededGenerator(
    birth.year * 1000000 + birth.month * 10000 + birth.day * 100 + birth.hour + (birth.gender === '女' ? 7 : 3),
  );

  const palaces = PALACE_NAMES.reduce<Record<string, ZiweiPalace>>((acc, palaceName, index) => {
    const starCount = Math.floor(next() * 3) + 1;
    const starSet = new Set<string>();
    while (starSet.size < starCount) {
      starSet.add(STARS[Math.floor(next() * STARS.length)]);
    }
    acc[palaceName] = {
      stars: Array.from(starSet),
      position: POSITIONS[(index + birth.month - 1) % POSITIONS.length],
      miaoxian: BRIGHTNESS[Math.floor(next() * BRIGHTNESS.length)],
    };
    return acc;
  }, {});

  return {
    birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
    mingGua,
    palaces,
    sihua: { 廉贞: '禄', 破军: '权', 武曲: '科', 太阳: '忌' },
    mainStars: [...STARS],
    engineName: 'FallbackZiweiShell',
    mode: 'fallback-demo',
    version: 'react-shell',
  };
}

function calculateZiweiData(birth: BirthData, ready: boolean): ZiweiData {
  const mingGua = calcMingGua(birth.year, birth.gender);
  if (ready) {
    const adapterData = calculateWithLegacyAdapter<{ birth: BirthData; mingGua: ZiweiMingGua }, ZiweiData>('ziwei', {
      birth,
      mingGua,
    });
    if (adapterData) return adapterData;
  }
  return buildFallbackZiweiData(birth, mingGua);
}

function getModeLabel(data: ZiweiData) {
  if (data.mode === 'local-exact') return '真实排盘 · iztro v2.5.8';
  return '降级演示 · 等待 adapter';
}

export function ZiweiWorkspace() {
  const { birth } = useBirth();
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const ready = legacyState.mode === 'ready';
  const data = useMemo(() => calculateZiweiData(birth, ready), [birth, ready]);
  const palaceCount = Object.keys(data.palaces || {}).length;
  const transformedByIztro = data.engineName === 'ZiweiIztroAdapter';
  const contextPayload = useMemo(
    () => ({
      module: 'ziwei',
      mode: data.mode ?? 'unknown',
      engineName: data.engineName,
      version: data.version,
      birth: data.birthInfo,
      palaceCount,
      source: transformedByIztro ? 'SylarLong/iztro v2.5.8 + visual/js/engine-adapters.js' : 'React fallback demo',
      note: transformedByIztro
        ? '基于内置 iztro v2.5.8 真实排盘。'
        : '旧引擎未就绪时仅用于界面降级，不作为真实排盘结论。',
    }),
    [data, palaceCount, transformedByIztro],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">紫微斗数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              React 侧不再自造紫微结论：页面读取顶部全局生辰，优先通过旧 EngineAdapterRegistry 调用
              基于 SylarLong/iztro v2.5.8 真实十二宫排盘。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="ziwei" title="紫微斗数 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="命盘" />
          </div>
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <InterpretationCard
            title="排盘状态"
            items={[
              { label: '引擎', value: data.engineName ?? '未就绪'},
              { label: '模式', value: getModeLabel(data)},
              { label: '宫位', value: String(palaceCount) + ' 宫'},
              { label: '命卦', value: data.mingGua.trigram + '卦 · ' + data.mingGua.group},
            ]}
          />

          <LegendPanel
            title="十四主星"
            items={data.mainStars.slice(0, 14).map((star, index) => ({
              label: star,
              value: index < 6 ? '北斗/中天系' : '南斗/辅曜系',
              color: index < 6 ? '#ae2012' : '#0a9396',
            }))}
          />

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            生辰资料统一由顶部"全局生辰"面板管理；修改后本页会重新排盘。
          </p>
          <TermExplanationPanel
            ready={ready}
            initialTerm="紫微"
            terms={["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军","庙旺","落陷","四化","命宫","福德"]}
            description="点击星曜或术语查看通俗解释。"
          />
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">十二宫命盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                十二宫命盘：外环十二地支各居一格，中心为命卦/四化/生辰/主星信息区。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
              </span>
              <DataModeBadge mode={data.mode} ready={ready} />
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {!ready ? (
              <LoadingSkeleton label="正在加载 iztro 排盘引擎" />
            ) : (
              <ZoomableSvg title="紫微斗数十二宫命盘">
                <ZiweiPalaceGrid data={data} />
              </ZoomableSvg>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
