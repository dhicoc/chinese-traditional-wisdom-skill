import source from '@/legacy/charMeanings.json';
import { describe, expect, it } from 'vitest';
import { getCharMeaningFromShard, getCharMeaningShardId } from '@/legacy/charMeanings';

describe('char meaning shards', () => {
  it.each(['渎', '骗', '耆', '座', '肌'])('loads %s from its deterministic shard', async (char) => {
    expect(getCharMeaningShardId(char)).toMatch(/^[0-9a-f]{2}$/);
    expect(await getCharMeaningFromShard(char)).toBe((source as Record<string, string>)[char]);
  });
  it('returns empty text for an unlisted character', async () => {
    expect(await getCharMeaningFromShard('😀')).toBe('');
  });
});
