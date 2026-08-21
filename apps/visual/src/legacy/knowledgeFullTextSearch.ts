export interface KnowledgeFullTextHit {
  citationId: string;
  bookCitationId: string;
  file: string;
  title: string;
  heading: string;
  excerpt: string;
  score: number;
}
interface IndexSection extends Omit<KnowledgeFullTextHit, 'score'> { searchText: string }
interface GeneratedShard { schemaVersion: string; sections: IndexSection[] }
const SHARD_LOADERS: Array<() => Promise<{ default: GeneratedShard }>> = [
  () => import('@/generated/knowledgeFullTextIndex.shards/shard-0.json'),
  () => import('@/generated/knowledgeFullTextIndex.shards/shard-1.json'),
  () => import('@/generated/knowledgeFullTextIndex.shards/shard-2.json'),
  () => import('@/generated/knowledgeFullTextIndex.shards/shard-3.json'),
];
let indexPromise: Promise<IndexSection[]> | null = null;
async function loadIndex(): Promise<IndexSection[]> {
  indexPromise ??= Promise.all(SHARD_LOADERS.map((loader) => loader())).then((shards) => shards.flatMap((module) => module.default.sections));
  return indexPromise;
}
export async function searchKnowledgeFullText(rawQuery: string, limit = 20): Promise<KnowledgeFullTextHit[]> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const sections = await loadIndex();
  const terms = query.split(/\s+/).filter(Boolean);
  return sections.map((section) => { let score = 0; if (section.title.toLowerCase().includes(query)) score += 10; if (section.heading.toLowerCase().includes(query)) score += 8; for (const term of terms) if (section.searchText.includes(term)) score += 2; return { ...section, score }; })
    .filter((section) => section.score > 0).sort((a, b) => b.score - a.score || a.citationId.localeCompare(b.citationId)).slice(0, limit)
    .map(({ searchText: _searchText, ...hit }) => hit);
}
