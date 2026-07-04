import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { getLegacyCapabilities, getLegacyTools } from '@/legacy/toolRegistry';
import {
  TEST_SUITES,
  getTotalExpectedCount,
  getTestSuitesByType,
  type TestSuite,
  type TestSuiteType,
} from '@/legacy/testRegistry';
import type { LegacyState } from '@/legacy/legacyGlobals';

/* ── 环境诊断 ─────────────────────────────────────────── */

interface EnvInfo {
  browser: string;
  protocol: string;
  legacyMode: string;
  toolCount: number;
  capabilityCount: number;
  hasMermaid: boolean;
}

function detectBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return ua.slice(0, 40);
}

function collectEnvInfo(legacyState: LegacyState, legacyReady: boolean): EnvInfo {
  const tools = legacyReady ? getLegacyTools() : [];
  const capabilities = legacyReady ? getLegacyCapabilities() : {};
  return {
    browser: detectBrowser(navigator.userAgent),
    protocol: window.location.protocol,
    legacyMode: legacyState.mode,
    toolCount: tools.length,
    capabilityCount: Object.keys(capabilities).length,
    hasMermaid: typeof (window as unknown as { mermaid?: unknown }).mermaid !== 'undefined',
  };
}

/* ── 类型标签 ─────────────────────────────────────────── */

const TYPE_META: Record<TestSuiteType, { label: string; color: string }> = {
  node: { label: 'Node CLI', color: '#a78bfa' },
  browser: { label: 'Browser', color: '#0a9396' },
  verify: { label: 'Verify', color: '#e9c46a' },
};

/* ── 测试套件卡片 ─────────────────────────────────────── */

function SuiteCard({ suite }: { suite: TestSuite }) {
  const meta = TYPE_META[suite.type];

  return (
    <article className="flex min-h-40 flex-col rounded-card border border-white/8 bg-white/[0.035] p-4 transition hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">{suite.name}</p>
          <p className="mt-1.5 text-xs leading-5 text-zinc-400">{suite.description}</p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          style={{ borderColor: `${meta.color}33`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {/* 覆盖范围 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suite.covers.map((item) => (
          <span key={item} className="rounded-full bg-black/24 px-2 py-0.5 text-[10px] text-zinc-500">
            {item}
          </span>
        ))}
      </div>

      {/* 预期数量 */}
      {suite.expectedCount > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          预期 <span className="font-mono text-zinc-300">{suite.expectedCount}</span> 项
        </p>
      )}

      {/* 操作入口 */}
      <div className="mt-auto border-t border-white/8 pt-3">
        {suite.type === 'node' && suite.cliCommand && (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-card border border-white/8 bg-black/30 px-3 py-1.5 text-xs text-jade-500">
              {suite.cliCommand}
            </code>
            <CopyContextButton
              label="复制命令"
              title={`${suite.name} CLI 命令`}
              payload={{ command: suite.cliCommand }}
            />
          </div>
        )}
        {suite.type === 'browser' && suite.url && (
          <a
            href={suite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-500 transition hover:bg-jade-500/20"
          >
            打开 test-runner →
          </a>
        )}
        {suite.type === 'verify' && (
          <div className="flex items-center gap-2">
            <a
              href={suite.url}
              className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-500 transition hover:bg-jade-500/20"
            >
              打开 verify.html →
            </a>
            <span className="text-[10px] text-zinc-500">需先 npm run build</span>
          </div>
        )}
      </div>
    </article>
  );
}

/* ── 主组件 ───────────────────────────────────────────── */

export function TestRunnerConsole() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      setLegacyState(state);
      if (state.mode === 'ready') setLegacyReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const env = useMemo(() => collectEnvInfo(legacyState, legacyReady), [legacyState, legacyReady]);

  const nodeSuites = getTestSuitesByType('node');
  const browserSuites = getTestSuitesByType('browser');
  const verifySuites = getTestSuitesByType('verify');
  const totalExpected = getTotalExpectedCount();

  const contextPayload = useMemo(
    () => ({
      module: 'testing',
      mode: 'test-runner-console',
      environment: env,
      suiteCount: TEST_SUITES.length,
      totalExpected,
      suites: TEST_SUITES.map((s) => ({ id: s.id, name: s.name, type: s.type, expectedCount: s.expectedCount })),
    }),
    [env, totalExpected],
  );

  return (
    <section className="space-y-4">
      {/* 标题区 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">测试控制台</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              汇总所有测试入口：Node CLI 结构测试、浏览器端引擎测试、自动验证页。Phase 9 第一版——提供测试入口、结果摘要和跳转链接。
            </p>
          </div>
          <CopyContextButton title="测试控制台上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      {/* 摘要仪表盘 */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-500">{TEST_SUITES.length}</p>
          <p className="mt-1 text-sm text-zinc-400">测试套件</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-zinc-100">{totalExpected}</p>
          <p className="mt-1 text-sm text-zinc-400">预期测试项</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-zinc-100">{env.toolCount}</p>
          <p className="mt-1 text-sm text-zinc-400">已注册工具</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-zinc-100">{env.capabilityCount}</p>
          <p className="mt-1 text-sm text-zinc-400">能力注册项</p>
        </div>
      </div>

      {/* 环境诊断 */}
      <div className="rounded-panel border border-ink-700 bg-black/24 p-4">
        <h3 className="font-serif text-lg font-semibold text-zinc-100">环境诊断</h3>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">浏览器</p>
            <p className="mt-1 text-zinc-200">{env.browser}</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">页面协议</p>
            <p className="mt-1 font-mono text-zinc-200">{env.protocol}</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">Legacy 引擎</p>
            <p className="mt-1">
              <span
                className={`font-mono ${env.legacyMode === 'ready' ? 'text-jade-500' : env.legacyMode === 'error' ? 'text-cinnabar-500' : 'text-zinc-400'}`}
              >
                {env.legacyMode}
              </span>
            </p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">Mermaid CDN</p>
            <p className="mt-1 text-zinc-200">{env.hasMermaid ? '已加载' : '未加载'}</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">截图建议</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">失败时截取本页和环境信息，保留首个失败详情。</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-zinc-500">测试分类</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">Node 测试在终端运行；浏览器测试在 test-runner.html 运行。</p>
          </div>
        </div>
      </div>

      {/* Node CLI 测试 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-zinc-100">Node CLI 测试</h3>
          <span className="text-xs text-zinc-500">{nodeSuites.length} 个套件</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {nodeSuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      </div>

      {/* 浏览器端测试 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-zinc-100">浏览器端测试</h3>
          <span className="text-xs text-zinc-500">{browserSuites.length} 个套件 · 跳转旧 test-runner.html</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {browserSuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
        <div className="mt-4 rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
          <p className="text-xs leading-5 text-zinc-400">
            浏览器测试入口为旧 <code className="text-jade-500">visual/test-runner.html</code>，在独立页面加载旧引擎后依次运行八字、五运六气、数据桥接、质量基线、全局同步和可视化渲染测试。
            点击任意套件的"打开 test-runner"将在新标签页中运行全部浏览器测试。
          </p>
        </div>
      </div>

      {/* 自动验证页 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-zinc-100">自动验证页</h3>
          <span className="text-xs text-zinc-500">{verifySuites.length} 个套件</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {verifySuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
        <div className="mt-4 rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
          <p className="text-xs leading-5 text-zinc-400">
            <code className="text-jade-500">dist/verify.html</code> 由 <code className="text-jade-500">generate-verify-page.mjs</code> 在构建时自动生成。
            它通过 iframe 逐个访问每个 hash 路由，检查 h2 标题、canvas 数量和 canvas 非空像素，适用于 React Shell 的人工+自动回归。
          </p>
        </div>
      </div>
    </section>
  );
}
