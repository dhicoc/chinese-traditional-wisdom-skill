import { getLegacyWindow } from './legacyGlobals';

export interface LegacyEngineAdapter<TInput = unknown, TResult = unknown, TRender = TResult> {
  engineName: string;
  mode: string;
  version: string;
  confidenceNote: string;
  calculate: (input: TInput) => TResult;
  toRenderData: (result: TResult, input?: TInput) => TRender;
  toReading?: (result: TResult, input?: TInput) => unknown;
}

interface EngineAdapterRegistry {
  get?: (name: string) => LegacyEngineAdapter | null;
  calculate?: (name: string, input: unknown) => unknown;
  toRenderData?: (name: string, result: unknown, input?: unknown) => unknown;
  toReading?: (name: string, result: unknown, input?: unknown) => unknown;
}

interface EngineAdapterWindow extends Window {
  EngineAdapterRegistry?: EngineAdapterRegistry;
}

function registry(): EngineAdapterRegistry | undefined {
  return (getLegacyWindow() as EngineAdapterWindow).EngineAdapterRegistry;
}

export function getLegacyEngineAdapter<TInput = unknown, TResult = unknown, TRender = TResult>(name: string) {
  return registry()?.get?.(name) as LegacyEngineAdapter<TInput, TResult, TRender> | null | undefined;
}

export function calculateWithLegacyAdapter<TInput, TResult>(name: string, input: TInput): TResult | null {
  const adapter = getLegacyEngineAdapter<TInput, TResult>(name);
  if (!adapter) return null;
  return adapter.calculate(input);
}

export function renderDataWithLegacyAdapter<TInput, TResult, TRender>(name: string, result: TResult, input?: TInput): TRender | null {
  const adapter = getLegacyEngineAdapter<TInput, TResult, TRender>(name);
  if (!adapter) return null;
  return adapter.toRenderData(result, input) as TRender;
}

export function readingWithLegacyAdapter<TInput, TResult>(name: string, result: TResult, input?: TInput): unknown {
  const adapter = getLegacyEngineAdapter<TInput, TResult>(name);
  return adapter?.toReading?.(result, input) ?? null;
}
