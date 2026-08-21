import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFullDictionary, searchDream } from '@/legacy/dreamDictionary';

afterEach(() => vi.unstubAllGlobals());

describe('dream dictionary shards', () => {
  it('keeps the curated synchronous lookup available', () => {
    expect(searchDream('蛇').hit).toBe(true);
  });

  it('loads the optional full dictionary through its shard manifest', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('manifest.json')) return { ok: true, json: async () => ({ shards: [{ file: 'a.json' }, { file: 'b.json' }] }) };
      if (url.endsWith('a.json')) return { ok: true, json: async () => [{ title: '测试梦甲', biglx: '其它', smalllx: '', zm: 'C', luck: '中平', meaning: '甲' }] };
      return { ok: true, json: async () => [{ title: '测试梦乙', biglx: '其它', smalllx: '', zm: 'Y', luck: '中平', meaning: '乙' }] };
    });
    vi.stubGlobal('fetch', fetchMock);
    const entries = await loadFullDictionary();
    expect(entries.map((entry) => entry.title)).toEqual(['测试梦甲', '测试梦乙']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(searchDream('测试梦乙', true).hit).toBe(true);
  });
});
