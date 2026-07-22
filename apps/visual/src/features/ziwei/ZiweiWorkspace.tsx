import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LegendPanel } from '@/components/shared/LegendPanel';
import { ZiweiPalaceGrid } from '@/components/shared/ZiweiPalaceGrid';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { calculateZiwei as calculateZiweiPure, calcZiweiEnveloped } from '@/legacy/ziweiEngine';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { SolarBirth } from '@/legacy/birthBridge';
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
  birthInfo: Pick<SolarBirth, 'year' | 'month' | 'day' | 'hour' | 'gender'>;
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

function buildFallbackZiweiData(solarBirth: SolarBirth, mingGua: ZiweiMingGua): ZiweiData {
  const next = createSeededGenerator(
    solarBirth.year * 1000000 + solarBirth.month * 10000 + solarBirth.day * 100 + solarBirth.hour + (solarBirth.gender === '女' ? 7 : 3),
  );

  const palaces = PALACE_NAMES.reduce<Record<string, ZiweiPalace>>((acc, palaceName, index) => {
    const starCount = Math.floor(next() * 3) + 1;
    const starSet = new Set<string>();
    while (starSet.size < starCount) {
      starSet.add(STARS[Math.floor(next() * STARS.length)]);
    }
    acc[palaceName] = {
      stars: Array.from(starSet),
      position: POSITIONS[(index + solarBirth.month - 1) % POSITIONS.length],
      miaoxian: BRIGHTNESS[Math.floor(next() * BRIGHTNESS.length)],
    };
    return acc;
  }, {});

  return {
    birthInfo: { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, gender: solarBirth.gender },
    mingGua,
    palaces,
    sihua: { 廉贞: '禄', 破军: '权', 武曲: '科', 太阳: '忌' },
    mainStars: [...STARS],
    engineName: 'FallbackZiweiShell',
    mode: 'fallback-demo',
    version: 'react-shell',
  };
}

function calculateZiweiData(solarBirth: SolarBirth, ready: boolean): ZiweiData {
  const mingGua = calcMingGua(solarBirth.year, solarBirth.gender);
  if (!ready) return buildFallbackZiweiData(solarBirth, mingGua);
  try {
    return calculateZiweiPure({ birth: solarBirth, mingGua }) as ZiweiData;
  } catch {
    return buildFallbackZiweiData(solarBirth, mingGua);
  }
}


export function ZiweiWorkspace() {
  const { solarBirth } = useBirth();

  const ready = true;
  const data = useMemo(() => calculateZiweiData(solarBirth, ready), [solarBirth, ready]);
  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!ready) return null;
    try {
      const env = calcZiweiEnveloped({ birth: solarBirth, mingGua: { trigram: '?', group: '?' } });
      return toFourLayer(env.data.export_snapshot as ReadingLike);
    } catch {
      return null;
    }
  }, [solarBirth, ready]);
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
      source: transformedByIztro ? 'SylarLong/iztro v2.5.8 (ESM) + ziweiEngine.ts' : 'React fallback demo',
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
              紫微斗数排盘：读取顶部全局生辰，排出十二宫、十四主星、四化与庙旺利得，据命宫主星与四化解读命局。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="ziwei" title="紫微斗数 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="命盘" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <InterpretationCard
            title="排盘状态"
            items={[
              { label: '状态', value: data.mode === 'local-exact' ? '真实排盘' : '演示数据'},
              { label: '宫位', value: String(palaceCount) + ' 宫'},
              { label: '命卦', value: data.mingGua.trigram + '卦 · ' + data.mingGua.group},
            ]}
          />

          <LegendPanel
            title="十四主星"
            items={data.mainStars.slice(0, 14).map((star, index) => ({
              label: star,
              value: index < 6 ? '北斗/中天系' : '南斗/辅曜系',
              color: index < 6 ? 'var(--wz-fire)' : 'var(--wz-water)',
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
          {fourLayer && (
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport report={fourLayer} title="四层报告（总结·亮点·详析·建议）" />
            </div>
          )}
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">十二宫命盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                十二宫命盘：外环十二地支各居一格，中心为命卦/四化/生辰/主星信息区。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {!ready ? (
              <LoadingSkeleton label="正在排盘" />
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
