import { useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { XingXiuChart } from '@/components/shared/XingXiuChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { useBirth } from '@/lib/birthContext';
import { calcXingXiuEnveloped, type XingXiuResult, type XingXiuEntry, type XiuMethod } from '@/legacy/xingxiuEngine';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 二十八星宿工作区。
 * 四象分组展示二十八宿 + 当日值宿高亮 + 吉凶宜忌 + 四层报告。
 */

const XIANG_ORDER = ['东方青龙', '南方朱雀', '西方白虎', '北方玄武'] as const;
const XIANG_COLOR: Record<string, string> = {
  '东方青龙': '#2c9d8f',
  '南方朱雀': '#c6301f',
  '西方白虎': '#e9e4d8',
  '北方玄武': '#2f4f55',
};

export function XingXiuWorkspace() {
  const { birth } = useBirth();

  const [method, setMethod] = useState<XiuMethod>('lookup');

  const result = useMemo<{ envelope: ToolEnvelope<XingXiuResult> | null }>(() => {
    try {
      const solarEntry = typeof window !== 'undefined' ? (window as unknown as { Solar?: unknown }).Solar : undefined;
      return { envelope: calcXingXiuEnveloped({ birth, solar: solarEntry ?? null, method }) };
    } catch {
      return { envelope: null };
    }
  }, [birth, method]);

  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!result.envelope) return null;
    return toFourLayer(result.envelope.data.export_snapshot as ReadingLike);
  }, [result.envelope]);

  const data = result.envelope?.data;

  if (!data) {
    return (
      <section className="space-y-4">
        <InterpretationCard title="暂无结果" subtitle="请确认生辰">
          <p className="text-sm text-jade-100/55">二十八星宿需日期信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      </section>
    );
  }

  // 按四象分组
  const grouped = useMemo(() => {
    const map: Record<string, XingXiuEntry[]> = {};
    for (const x of data.allXiu) {
      (map[x.xiang] ??= []).push(x);
    }
    return map;
  }, [data]);

  const contextPayload = useMemo(() => ({
    module: 'xingxiu',
    mode: data.mode,
    date: `${birth.year}-${birth.month}-${birth.day}`,
    zhiXiu: data.zhiXiuFull,
    xiang: data.xiang,
    luck: data.luck,
  }), [data, birth]);

  return (
    <section className="space-y-4">
      {/* 头部 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">二十八星宿</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              中国古代天文学二十八宿体系：按四象分组，每日值宿轮转，主吉凶宜忌与择日参考。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <CopyContextButton commandScope="xingxiu" title="二十八星宿上下文" payload={contextPayload} />
              <ExportReportButton module="二十八星宿" />
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-0.5">
              <button
                type="button"
                onClick={() => setMethod('lookup')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${method === 'lookup' ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
              >
                查表法
              </button>
              <button
                type="button"
                onClick={() => setMethod('rotational')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${method === 'rotational' ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
              >
                轮转法
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左侧：当日值宿 + 四层报告 */}
        <aside className="space-y-4">
          <div className="rounded-card border border-gold-500/25 bg-gold-500/8 p-4 text-center">
            <p className="text-xs text-gold-400/60">当日值宿</p>
            <p className="mt-2 font-serif text-3xl text-gold-200">{data.zhiXiuFull}</p>
            <p className="mt-1 text-sm" style={{ color: XIANG_COLOR[data.xiang] ?? '#888' }}>{data.xiang}</p>
            <p className="mt-2 text-xs text-jade-100/55">{data.wuxing}宿 · 七曜{data.yao} · 禽星{data.animal}</p>
            <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${data.luck === '吉' ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : data.luck === '凶' ? 'border-cinnabar-500/40 bg-cinnabar-500/10 text-cinnabar-300' : 'border-white/15 text-jade-100/45'}`}>
              {data.luck}
            </span>
            <p className="mt-2 text-xs text-jade-100/45">{data.symbol}</p>
          </div>
          <div className="rounded-card border border-purple-500/25 bg-purple-500/8 p-4 text-center">
            <p className="text-xs text-purple-400/60">本命星宿</p>
            <p className="mt-2 font-serif text-2xl text-purple-200">{data.benMingXiuFull}</p>
            <p className="mt-1 text-sm" style={{ color: XIANG_COLOR[data.benMingXiang] ?? '#888' }}>{data.benMingXiang}</p>
            <p className="mt-2 text-xs text-jade-100/45">{data.benMingSymbol}</p>
          </div>
          <InterpretationCard
            title="宜忌"
            items={[
              { label: '宜', value: data.yi },
              { label: '忌', value: data.ji },
              { label: '西方对应', value: data.western },
            ]}
          />
          {data.song && (
            <InterpretationCard title="歌诀">
              <p className="text-xs leading-5 text-jade-100/55">{data.song}</p>
            </InterpretationCard>
          )}
          {fourLayer && (
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport report={fourLayer} title="四层报告（总结·亮点·详析·建议）" />
            </div>
          )}
        </aside>

        {/* 右侧：四象方位图 + 四象分组 */}
        <div className="space-y-3">
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-2 text-sm font-semibold text-jade-50">四象方位图</h3>
            <ZoomableSvg title="二十八星宿四象方位图">
              <XingXiuChart allXiu={data.allXiu} zhiXiu={data.zhiXiu} benMingXiu={data.benMingXiu} />
            </ZoomableSvg>
            <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-jade-100/40">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold-500/60" />★ 当日值宿</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500/60" />◆ 本命星宿</span>
            </div>
          </div>
          {XIANG_ORDER.map((xiang) => (
            <div key={xiang} className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <div className="flex items-center gap-2 border-b border-white/8 pb-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: XIANG_COLOR[xiang] }} />
                <h3 className="text-sm font-semibold text-jade-50">{xiang}</h3>
                <span className="text-[10px] text-jade-100/35">7宿</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {grouped[xiang]?.map((x) => {
                  const isToday = x.name === data.zhiXiu;
                  return (
                    <div
                      key={x.name}
                      className={`rounded-card border p-2 text-center ${isToday ? 'border-gold-500/50 bg-gold-500/15' : 'border-white/8 bg-black/30'}`}
                    >
                      <p className={`font-serif text-base ${isToday ? 'text-gold-200' : 'text-jade-100/80'}`}>{x.fullName}</p>
                      <p className="text-[10px] text-jade-100/35">{x.yao}曜</p>
                      {isToday && <p className="mt-0.5 text-[9px] text-gold-400">今日值宿</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
