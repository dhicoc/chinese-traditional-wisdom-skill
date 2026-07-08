import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getLegacyEngineAdapter,
  calculateWithLegacyAdapter,
  renderDataWithLegacyAdapter,
  readingWithLegacyAdapter,
} from '@/legacy/engineAdapters';
import { getLegacyWindow } from '@/legacy/legacyGlobals';

interface RegistryWindow {
  EngineAdapterRegistry?: {
    get?: (name: string) => unknown;
    calculate?: (name: string, input: unknown) => unknown;
    toRenderData?: (name: string, result: unknown, input?: unknown) => unknown;
    toReading?: (name: string, result: unknown, input?: unknown) => unknown;
  };
}

function setRegistry(reg: RegistryWindow['EngineAdapterRegistry']): void {
  (getLegacyWindow() as RegistryWindow).EngineAdapterRegistry = reg;
}

function clearRegistry(): void {
  delete (getLegacyWindow() as RegistryWindow).EngineAdapterRegistry;
}

afterEach(() => clearRegistry());

describe('legacy engine adapter 桥接', () => {
  it('无 registry 时 getLegacyEngineAdapter 返回 nullish', () => {
    clearRegistry();
    expect(getLegacyEngineAdapter('bazi')).toBeFalsy();
  });

  it('无 registry 时 calculateWithLegacyAdapter 返回 null', () => {
    clearRegistry();
    expect(calculateWithLegacyAdapter('bazi', { year: 1990 })).toBeNull();
  });

  it('无 adapter 时 calculateWithLegacyAdapter 返回 null', () => {
    setRegistry({ get: () => null });
    expect(calculateWithLegacyAdapter('nonexistent', {})).toBeNull();
  });

  it('有 adapter 时 calculateWithLegacyAdapter 转发到 adapter.calculate', () => {
    const calculate = vi.fn(() => ({ result: 'ok' }));
    setRegistry({ get: () => ({ engineName: 'X', mode: 'local', version: '1', confidenceNote: '', calculate, toRenderData: () => null }) });
    const r = calculateWithLegacyAdapter('bazi', { year: 1990 });
    expect(calculate).toHaveBeenCalledWith({ year: 1990 });
    expect(r).toEqual({ result: 'ok' });
  });

  it('有 adapter 时 renderDataWithLegacyAdapter 转发到 toRenderData', () => {
    const toRenderData = vi.fn(() => ({ pillars: [] }));
    setRegistry({ get: () => ({ engineName: 'X', mode: 'local', version: '1', confidenceNote: '', calculate: () => null, toRenderData }) });
    const r = renderDataWithLegacyAdapter('bazi', { result: 'ok' }, { year: 1990 });
    expect(toRenderData).toHaveBeenCalledWith({ result: 'ok' }, { year: 1990 });
    expect(r).toEqual({ pillars: [] });
  });

  it('有 adapter 且 toReading 存在时 readingWithLegacyAdapter 转发', () => {
    const toReading = vi.fn(() => ({ title: '摘要' }));
    setRegistry({ get: () => ({ engineName: 'X', mode: 'local', version: '1', confidenceNote: '', calculate: () => null, toRenderData: () => null, toReading }) });
    const r = readingWithLegacyAdapter('bazi', { result: 'ok' });
    expect(toReading).toHaveBeenCalledWith({ result: 'ok' }, undefined);
    expect(r).toEqual({ title: '摘要' });
  });

  it('adapter 无 toReading 时 readingWithLegacyAdapter 返回 null', () => {
    setRegistry({ get: () => ({ engineName: 'X', mode: 'local', version: '1', confidenceNote: '', calculate: () => null, toRenderData: () => null }) });
    expect(readingWithLegacyAdapter('bazi', {})).toBeNull();
  });
});
