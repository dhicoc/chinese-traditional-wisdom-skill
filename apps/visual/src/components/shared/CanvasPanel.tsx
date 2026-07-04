import { useEffect, useId, useRef, useState } from 'react';

interface CanvasPanelProps<TData> {
  title: string;
  description: string;
  data: TData;
  width: number;
  height: number;
  render: (canvasId: string, data: TData) => void;
  ready: boolean;
}

export function CanvasPanel<TData>({ title, description, data, width, height, render, ready }: CanvasPanelProps<TData>) {
  const reactId = useId();
  const canvasId = `canvas-${reactId.replace(/:/g, '')}`;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    try {
      setError(null);
      render(canvasId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [canvasId, data, ready, render]);

  return (
    <section className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold text-zinc-100">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">
          Legacy Canvas
        </span>
      </div>
      <div className="overflow-x-auto rounded-card border border-white/8 bg-[#fafaf5] p-3">
        <canvas ref={canvasRef} id={canvasId} width={width} height={height} className="mx-auto block max-w-full rounded-lg" />
      </div>
      {!ready && <p className="mt-3 text-sm text-zinc-500">正在加载旧版渲染引擎。</p>}
      {error && <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">{error}</p>}
    </section>
  );
}
