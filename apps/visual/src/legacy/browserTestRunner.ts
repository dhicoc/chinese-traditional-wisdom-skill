/**
 * browserTestRunner — 在 React TestRunnerConsole 内页内执行浏览器端测试。
 *
 * Phase 9 第二版：把旧 test-runner.html 的浏览器测试搬到 React 内运行，
 * 展示 rolling logs / 通过失败计数 / 失败详情，无需跳转旧页。
 *
 * 实现方式与 loadLegacyScripts 一致：用 `?raw` import 测试脚本源码，
 * legacy 引擎就绪后 eval 注入，再调用脚本暴露的 `window.TestXxx.run()`
 * 取 {passed, failed, details[]}。
 */

import liuyaoTestSource from '../../../../visual/js/tests/test-liuyao-engine.js?raw';

export interface BrowserTestResult {
  id: string;
  name: string;
  passed: number;
  failed: number;
  details: string[];
  /** 运行耗时 ms */
  durationMs: number;
  error?: string;
}

export interface BrowserTestSpec {
  id: string;
  name: string;
  /** 脚本源码（?raw 注入） */
  source: string;
  /** 脚本注入后暴露的全局对象名，须有 run() 方法 */
  globalName: string;
  /** 依赖的 legacy 全局（注入前校验存在） */
  requires: string[];
}

/** 可页内运行的浏览器测试套件 */
export const BROWSER_TEST_SPECS: BrowserTestSpec[] = [
  {
    id: 'test-liuyao-engine',
    name: '六爻纳甲引擎测试',
    source: liuyaoTestSource,
    globalName: 'TestLiuyaoEngine',
    requires: ['LiuyaoEngine'],
  },
];

/** 校验依赖的 legacy 全局是否已就绪 */
function checkRequires(requires: string[]): boolean {
  const w = window as unknown as Record<string, unknown>;
  return requires.every((name) => typeof w[name] !== 'undefined');
}

/** 注入脚本源码到当前 window 作用域 */
function injectScript(source: string): void {
  // 与 loadLegacyScripts 相同的 eval 策略，避免独立 <script> 标签的 CORS/async 问题
  const run = new Function(source);
  run();
}

/**
 * 运行单个浏览器测试套件。legacy 未就绪或脚本异常时返回 error 字段。
 */
export function runBrowserTest(spec: BrowserTestSpec): BrowserTestResult {
  const start = performance.now();
  const result: BrowserTestResult = {
    id: spec.id,
    name: spec.name,
    passed: 0,
    failed: 0,
    details: [],
    durationMs: 0,
  };
  try {
    if (!checkRequires(spec.requires)) {
      result.error = `依赖未就绪：${spec.requires.join(', ')}`;
      result.durationMs = Math.round(performance.now() - start);
      return result;
    }
    injectScript(spec.source);
    const w = window as unknown as Record<string, { run: () => { passed: number; failed: number; details: string[] } }>;
    const handle = w[spec.globalName];
    if (!handle || typeof handle.run !== 'function') {
      result.error = `脚本未暴露 ${spec.globalName}.run()`;
      result.durationMs = Math.round(performance.now() - start);
      return result;
    }
    const r = handle.run();
    result.passed = r.passed;
    result.failed = r.failed;
    result.details = r.details;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  result.durationMs = Math.round(performance.now() - start);
  return result;
}

/** 依次运行所有浏览器测试套件，回调每个完成的结果（供 UI rolling 展示）。 */
export async function runAllBrowserTests(
  onResult: (result: BrowserTestResult) => void,
): Promise<BrowserTestResult[]> {
  const results: BrowserTestResult[] = [];
  for (const spec of BROWSER_TEST_SPECS) {
    // 让出一帧让 UI 更新 rolling log
    await new Promise((resolve) => setTimeout(resolve, 0));
    const r = runBrowserTest(spec);
    results.push(r);
    onResult(r);
  }
  return results;
}
