export interface KnowledgeFullTextHit {
  citationId: string;
  bookCitationId: string;
  file: string;
  title: string;
  heading: string;
  excerpt: string;
  score: number;
}

interface GeneratedIndex {
  schemaVersion: string;
  sections: Array<Omit<KnowledgeFullTextHit, 'score'> & { searchText: string }>;
}

let indexPromise: Promise<GeneratedIndex> | null = null;
async function loadIndex(): Promise<GeneratedIndex> {
  indexPromise ??= import('@/generated/knowledgeFullTextIndex.json').then((module) => module.default as GeneratedIndex);
  return indexPromise;
}

export async function searchKnowledgeFullText(rawQuery: string, limit = 20): Promise<KnowledgeFullTextHit[]> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const index = await loadIndex();
  const terms = query.split(/\s+/).filter(Boolean);
  return index.sections
    .map((section) => {
      let score = 0;
      if (section.title.toLowerCase().includes(query)) score += 10;
      if (section.heading.toLowerCase().includes(query)) score += 8;
      for (const term of terms) if (section.searchText.includes(term)) score += 2;
      return { ...section, score };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score || a.citationId.localeCompare(b.citationId))
    .slice(0, limit)
    .map(({ searchText: _searchText, ...hit }) => hit);
}
