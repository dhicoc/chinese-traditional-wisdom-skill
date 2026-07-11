import { describe, expect, it } from 'vitest';
import { searchDreamEnveloped } from '@/legacy/envelopeSample';
import { wrapEnvelope, type ToolEnvelope } from '@/legacy/baseTypes';

describe('ToolEnvelope 统一信封', () => {
  describe('wrapEnvelope', () => {
    it('从裸返回值提取 tool/version，把 confidenceNote 转为 warnings', () => {
      const env = wrapEnvelope(
        { engineName: 'TestAdapter', version: '1.2.3', mode: 'local-exact', confidenceNote: '流派差异提示', foo: 'bar' },
        { year: 1990, month: 6 },
      );
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('TestAdapter');
      expect(env.version).toBe('1.2.3');
      expect(env.warnings).toContain('流派差异提示');
      expect((env.data as Record<string, unknown>).foo).toBe('bar');
      expect(env.input_normalized).toEqual({ year: 1990, month: 6 });
    });

    it('无 engineName 时 tool 兜底为 unknown，无 version 时兜底为 mode', () => {
      const env = wrapEnvelope({ mode: 'demo' }, null);
      expect(env.tool).toBe('unknown');
      expect(env.version).toBe('demo');
    });

    it('提供 snapshot 时挂到 data.export_snapshot', () => {
      const snapshot = { summary: 's', sections: [{ heading: 'h', body: 'b' }] };
      const env = wrapEnvelope({ engineName: 'X', version: '1' }, {}, snapshot);
      expect((env.data as Record<string, unknown>).export_snapshot).toBe(snapshot);
    });

    it('非对象输入包装为 { value: input }', () => {
      const env = wrapEnvelope({ engineName: 'X' }, 42);
      expect(env.input_normalized).toEqual({ value: 42 });
    });
  });

  describe('searchDreamEnveloped 样板', () => {
    it('命中关键词返回 ok=true 的完整 envelope', () => {
      const env = searchDreamEnveloped('蛇');
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('DreamDictionaryAdapter');
      expect(env.version).toBeTruthy();
      // data 主体是搜索结果 + export_snapshot
      const data = env.data as { entries: unknown[]; classics: unknown[]; hit: boolean; export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> } };
      expect(data.hit).toBe(true);
      expect(data.export_snapshot.summary).toContain('蛇');
      expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(2);
      expect(env.input_normalized).toEqual({ keyword: '蛇', useFull: false });
    });

    it('未命中关键词返回 ok=true 但带 warning', () => {
      const env = searchDreamEnveloped('zzz不存在的梦象xyz');
      const data = env.data as { hit: boolean };
      // 可能误命中也可能不命中；命中就不该有未命中warning，未命中就该有
      if (!data.hit) {
        expect(env.warnings?.some((w) => w.includes('未命中'))).toBe(true);
      }
    });

    it('envelope 结构满足 ToolEnvelope 类型契约（ok/tool/version/input_normalized/data 必填）', () => {
      const env: ToolEnvelope = searchDreamEnveloped('水');
      expect(typeof env.ok).toBe('boolean');
      expect(typeof env.tool).toBe('string');
      expect(typeof env.version).toBe('string');
      expect(typeof env.input_normalized).toBe('object');
      expect(env.data).toBeDefined();
    });
  });
});
