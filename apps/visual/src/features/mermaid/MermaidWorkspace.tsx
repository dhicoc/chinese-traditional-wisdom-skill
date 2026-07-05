import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';

/**
 * Mermaid 图表数据，与旧 visual/index.html 的 tab-mermaid 五张图对齐。
 * 源码内置，不依赖外部文件；离线时显示源码降级（与旧版行为一致）。
 */
interface MermaidDiagram {
  id: string;
  title: string;
  source: string;
  note?: string;
}

const MERMAID_DIAGRAMS: MermaidDiagram[] = [
  {
    id: 'wuxing',
    title: '五行生克图',
    source: `flowchart TD
    subgraph 相生[相生 · 虚线]
        direction LR
        木 -->|生| 火 -->|生| 土 -->|生| 金 -->|生| 水 -->|生| 木
    end
    subgraph 相克[相克 · 实线]
        direction LR
        木 -.->|克| 土 -.->|克| 水 -.->|克| 火 -.->|克| 金 -.->|克| 木
    end
    木:::wood
    火:::fire
    土:::earth
    金:::metal
    水:::water
    classDef wood fill:#E8F5E9,stroke:#4CAF50,color:#2E7D32
    classDef fire fill:#FFEBEE,stroke:#F44336,color:#C62828
    classDef earth fill:#FFF3E0,stroke:#FF9800,color:#E65100
    classDef metal fill:#FFF8E1,stroke:#F5D742,color:#F9A825
    classDef water fill:#E3F2FD,stroke:#2196F3,color:#1565C0`,
    note: '相生（虚线）与相克（实线）是中医与命理的理论基础。',
  },
  {
    id: 'fengshui-flow',
    title: '风水堪舆分析流程',
    source: `flowchart LR
    A[输入宅主信息] --> B[形势分析]
    A --> C[理气分析]
    A --> D[阳宅布局]
    B --> E[交叉验证]
    C --> E
    D --> E
    E --> F{三派结论一致?}
    F -->|一致| G[输出报告]
    F -->|有差异| H[权衡意见]
    H --> G
    style A fill:#3E2723,color:#FFF
    style G fill:#4CAF50,color:#FFF`,
  },
  {
    id: 'xingsha',
    title: '形煞分类体系',
    source: `mindmap
  root((形煞分类))
    外部形煞
      反弓煞
      路冲煞
      尖角煞
      剪刀煞
      天堑煞
      壁刀煞
    内部形煞
      穿堂煞
      缺角煞
      横梁压顶
      门冲煞
    综合形煞
      孤峰煞
      白虎煞
      朱雀煞
      穿心煞`,
  },
  {
    id: 'bazi-tree',
    title: '八字分析决策树',
    source: `flowchart TD
    A[八字排盘] --> B[日主判定]
    B --> C{日主强弱?}
    C -->|身强| D[喜克泄]
    C -->|身弱| E[喜生扶]
    D --> F[取官杀/食伤/财]
    E --> G[取印星/比劫]
    F --> H[定用神]
    G --> H
    H --> I[大运流年分析]
    I --> J[综合判断]`,
  },
  {
    id: 'shishen',
    title: '十神关系图',
    source: `flowchart LR
    日主 -->|同| 比肩
    日主 -->|同| 劫财
    日主 -->|生| 食神
    日主 -->|生| 伤官
    日主 -->|克| 正财
    日主 -->|克| 偏财
    日主 -->|克我| 正官
    日主 -->|克我| 七杀
    日主 -->|生我| 正印
    日主 -->|生我| 偏印`,
  },
];

const MERMAID_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js';
const MERMAID_INITIALIZED_KEY = '__reactMermaidInitialized';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

function loadMermaidScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window as Window & { mermaid?: { initialize: (cfg: unknown) => void; run: (cfg: unknown) => Promise<void> } };
    if (w.mermaid) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[data-mermaid-cdn]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(!!w.mermaid), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MERMAID_CDN;
    script.setAttribute('data-mermaid-cdn', 'true');
    script.addEventListener('load', () => resolve(!!w.mermaid));
    script.addEventListener('error', () => resolve(false));
    document.head.appendChild(script);
  });
}

function ensureMermaidInitialized() {
  const w = window as Window & { mermaid?: { initialize: (cfg: unknown) => void }; [MERMAID_INITIALIZED_KEY]?: boolean };
  if (!w.mermaid || w[MERMAID_INITIALIZED_KEY]) return;
  w.mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    themeVariables: {
      primaryColor: '#1f2937',
      primaryTextColor: '#e5e7eb',
      primaryBorderColor: '#374151',
      lineColor: '#9ca3af',
      secondaryColor: '#111827',
      tertiaryColor: '#0b0f14',
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
    },
  });
  w[MERMAID_INITIALIZED_KEY] = true;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch] as string);
}

export function MermaidWorkspace() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [renderError, setRenderError] = useState<string | null>(null);
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let mounted = true;
    setLoadStatus('loading');
    loadMermaidScript().then((ok) => {
      if (!mounted) return;
      setLoadStatus(ok ? 'ready' : 'offline');
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadStatus !== 'ready') return;
    const w = window as Window & { mermaid?: { run: (cfg: unknown) => Promise<void> } };
    if (!w.mermaid) return;
    ensureMermaidInitialized();
    setRenderError(null);

    const nodes: HTMLElement[] = [];
    for (const diagram of MERMAID_DIAGRAMS) {
      const el = containerRefs.current[diagram.id];
      if (!el) continue;
      el.removeAttribute('data-processed');
      el.innerHTML = diagram.source;
      el.classList.add('mermaid');
      nodes.push(el);
    }

    w.mermaid
      .run({ nodes })
      .catch((err: unknown) => {
        setRenderError(err instanceof Error ? err.message : String(err));
      });
  }, [loadStatus]);

  const contextPayload = useMemo(
    () => ({
      module: 'mermaid',
      mode: 'react-native-mermaid-cdn',
      source: '内置图源码 + mermaid 10.9.1 CDN，离线降级显示源码',
      diagramCount: MERMAID_DIAGRAMS.length,
      diagramIds: MERMAID_DIAGRAMS.map((d) => d.id),
      loadStatus,
    }),
    [loadStatus],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">知识图谱</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              使用 Mermaid.js 动态渲染传统文化知识体系结构图。图源码内置，CDN 未加载时离线显示源码，与旧 visual/index.html 的 tab-mermaid 对齐。
            </p>
          </div>
          <CopyContextButton commandScope="mermaid" title="知识图谱 React 迁移上下文" payload={contextPayload} />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          状态：
          {loadStatus === 'loading' && '正在加载 Mermaid CDN…'}
          {loadStatus === 'ready' && 'Mermaid 已就绪，图表已渲染。'}
          {loadStatus === 'offline' && 'Mermaid CDN 未加载，当前离线显示图源码。'}
          {loadStatus === 'error' && 'Mermaid 加载失败。'}
        </p>
        {renderError && (
          <p className="mt-2 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            渲染失败：{renderError}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MERMAID_DIAGRAMS.map((diagram) => (
          <article key={diagram.id} className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
            <h3 className="font-serif text-lg font-semibold text-zinc-100">{diagram.title}</h3>
            {diagram.note && <p className="mt-1 text-xs leading-5 text-zinc-500">{diagram.note}</p>}
            <div className="mt-3 overflow-x-auto rounded-card border border-white/8 bg-white p-4">
              {loadStatus === 'ready' ? (
                <div
                  ref={(el) => {
                    containerRefs.current[diagram.id] = el;
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs text-zinc-700">{escapeHtml(diagram.source)}</pre>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
