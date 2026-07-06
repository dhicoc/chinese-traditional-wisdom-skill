import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface CanvasPanelProps<TData> {
  title: string;
  description: string;
  data: TData;
  width: number;
  height: number;
  render: (canvasId: string, data: TData) => void;
  ready: boolean;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export function CanvasPanel<TData>({ title, description, data, width, height, render, ready }: CanvasPanelProps<TData>) {
  const reactId = useId();
  const canvasId = `canvas-${reactId.replace(/:/g, '')}`;
  const zoomCanvasId = `zoom-${reactId.replace(/:/g, '')}`;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayScrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);

  // 主 canvas 渲染
  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    try {
      setError(null);
      render(canvasId, data);
      // 渲染器内部 setupHiDPI 会设 inline style.height = h px，导致 max-w-full 压缩宽度时
      // 高度不变而宽高比变形。改为 auto 让高度随宽度等比缩放。
      if (canvasRef.current) canvasRef.current.style.height = 'auto';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [canvasId, data, ready, render]);

  // 放大 overlay 的 canvas 渲染：每次打开或数据变化时重绘
  useEffect(() => {
    if (!zoomed || !zoomCanvasRef.current) return;
    try {
      render(zoomCanvasId, data);
      // 放大态下保持原始像素尺寸，不做 max-w 压缩，确保清晰
      if (zoomCanvasRef.current) zoomCanvasRef.current.style.height = height + 'px';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [zoomed, zoomCanvasId, data, render, height]);

  // ESC 关闭 + body 滚动锁
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed]);

  // 滚轮缩放（overlay 内）
  useEffect(() => {
    if (!zoomed) return;
    const el = overlayScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // 仅 Ctrl/Cmd+滚轮缩放，避免与普通滚动冲突
      e.preventDefault();
      setScale((s) => {
        const next = s * (e.deltaY < 0 ? 1.12 : 0.89);
        return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(next * 100) / 100));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomed]);

  const openZoom = useCallback(() => {
    if (!ready) return;
    setScale(1);
    setZoomed(true);
  }, [ready]);

  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  return (
    <section className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">
          Legacy Canvas
        </span>
      </div>
      <div className="canvas-stage overflow-x-auto rounded-[20px] border border-talisman-500/18 bg-ink-950/92 p-3">
        <canvas
          ref={canvasRef}
          id={canvasId}
          width={width}
          height={height}
          onDoubleClick={openZoom}
          title="双击放大清晰查看"
          className="theme-canvas mx-auto block h-auto max-w-full cursor-zoom-in rounded-[14px] transition-transform"
        />
      </div>
      <p className="mt-2 text-center text-xs text-zinc-500">
        图像被压缩看不清？<button type="button" onClick={openZoom} className="text-talisman-500 underline-offset-2 hover:underline">双击放大清晰查看</button>
      </p>
      {!ready && <p className="mt-3 text-sm text-zinc-500">正在加载旧版渲染引擎。</p>}
      {error && <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">{error}</p>}

      {/* 放大查看 overlay */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-zinc-50">{title}</h3>
              <p className="text-xs text-zinc-400">原始尺寸 {width}×{height}px · Ctrl/⌘ + 滚轮缩放 · ESC 关闭</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-1 py-1">
                <button type="button" onClick={() => setScale((s) => clampScale(s - 0.25))} className="grid h-7 w-7 place-items-center rounded-full text-zinc-300 hover:bg-white/10" aria-label="缩小">−</button>
                <span className="w-12 text-center text-xs tabular-nums text-zinc-300">{Math.round(scale * 100)}%</span>
                <button type="button" onClick={() => setScale((s) => clampScale(s + 0.25))} className="grid h-7 w-7 place-items-center rounded-full text-zinc-300 hover:bg-white/10" aria-label="放大">+</button>
                <button type="button" onClick={() => setScale(1)} className="ml-1 rounded-full px-2 py-1 text-xs text-zinc-400 hover:bg-white/10">重置</button>
              </div>
              <button type="button" onClick={() => setZoomed(false)} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10" aria-label="关闭">✕</button>
            </div>
          </div>
          <div
            ref={overlayScrollRef}
            className="relative flex-1 overflow-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setZoomed(false); }}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-6">
              <canvas
                ref={zoomCanvasRef}
                id={zoomCanvasId}
                width={width}
                height={height}
                style={{ width: width * scale, height: height * scale }}
                className="theme-canvas block rounded-[14px] shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
