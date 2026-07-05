import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { renderLegacyLiuyao, type LiuyaoData } from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

const DEFAULT_LINES = [
  { yin: false, changing: false, branch: '子', relation: '父母', god: '青龙' },
  { yin: true, changing: false, branch: '亥', relation: '兄弟', god: '朱雀' },
  { yin: false, changing: true, branch: '戌', relation: '官鬼', god: '勾陈' },
  { yin: true, changing: false, branch: '酉', relation: '妻财', god: '滕蛇' },
  { yin: false, changing: false, branch: '申', relation: '子孙', god: '白虎' },
  { yin: true, changing: true, branch: '未', relation: '父母', god: '玄武' },
] as const;

const YONGSHEN_OPTIONS = ['父母', '兄弟', '官鬼', '妻财', '子孙'] as const;

export function LiuyaoWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [hexagramName, setHexagramName] = useState('火风鼎');
  const [yongShen, setYongShen] = useState<(typeof YONGSHEN_OPTIONS)[number]>('妻财');

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const data = useMemo<LiuyaoData>(
    () => ({
      lines: [...DEFAULT_LINES],
      hexagramName,
      hexagramNumber: 50,
      isOriginal: true,
      yongShen,
      shiYao: 3,
      yingYao: 6,
    }),
    [hexagramName, yongShen],
  );

  const contextPayload = useMemo(
    () => ({
      module: 'liuyao',
      mode: 'legacy-canvas-react-shell',
      data,
      source: 'visual/js/divination.js (renderLiuyao)',
    }),
    [data],
  );

  const ready = legacyState.mode === 'ready';

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">六爻占卜</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              先复用旧 divination renderer，React 负责卦名与用神输入，保留当前演示卦象结构作为迁移过渡层。
            </p>
          </div>
          <CopyContextButton commandScope="liuyao" title="六爻 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField
            label="卦名"
            value={hexagramName}
            onChange={(event) => setHexagramName(event.target.value || '火风鼎')}
          />

          <ControlField label="用神">
            <select
              value={yongShen}
              onChange={(event) => setYongShen(event.target.value as (typeof YONGSHEN_OPTIONS)[number])}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-jade-500/45"
            >
              {YONGSHEN_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </ControlField>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            当前仍为演示卦象结构，后续再接真实纳甲与起卦规则。React 迁移阶段先验证工作区外壳与旧 renderer 的兼容性。
          </p>
        </aside>

        <CanvasPanel
          title="本卦结构图"
          description="与旧 visual/index.html 的 renderLiuyao 对齐，调用同一个 divination renderer。"
          data={data}
          width={450}
          height={520}
          ready={ready}
          render={renderLegacyLiuyao}
        />
      </div>
    </section>
  );
}
