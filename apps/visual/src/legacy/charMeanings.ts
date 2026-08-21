/** Lazy per-character meaning lookup shared by browser and Node/tsx CLI. */
import { CHAR_MEANING_LOADERS } from './charMeaningLoaders.generated';

const shardCache = new Map<string, Record<string, string>>();

export function getCharMeaningShardId(char: string): string {
  const point = char.codePointAt(0) ?? 0;
  return (point % 32).toString(16).padStart(2, '0');
}

export async function getCharMeaningFromShard(char: string): Promise<string> {
  const shardId = getCharMeaningShardId(char);
  let shard = shardCache.get(shardId);
  if (!shard) {
    const loader = CHAR_MEANING_LOADERS[shardId];
    if (!loader) return '';
    shard = (await loader()).default;
    shardCache.set(shardId, shard);
  }
  return shard[char] ?? '';
}
