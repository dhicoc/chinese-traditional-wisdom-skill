import { describe, expect, it } from 'vitest';
import index from '@/generated/knowledgeFullTextIndex.json';
import { searchKnowledgeFullText } from '@/legacy/knowledgeFullTextSearch';
import { findKnowledgeBaseEntry } from '@/legacy/searchEngine';

describe('knowledge full-text search index', () => {
  it('covers every primary-text book with stable section anchors', () => {
    const books = new Set(index.sections.map((section) => section.bookCitationId));
    expect(books.size).toBe(30);
    expect(index.sections.length).toBeGreaterThanOrEqual(90);
    expect(index.sections.every((section) => /#section-\d{4}$/.test(section.citationId))).toBe(true);
  });

  it('finds a phrase from body text and returns a deep citation', async () => {
    const hits = await searchKnowledgeFullText('杨公妙应不多言');
    expect(hits[0]).toMatchObject({ title: '都天宝照经' });
    expect(hits[0].citationId).toMatch(/^kb:\/\/fengshui\/.*#section-\d{4}$/);
    expect(hits[0].excerpt).toContain('杨公妙应不多言');
  });

  it('resolves anchored citations to the parent book metadata', () => {
    expect(findKnowledgeBaseEntry('kb://fengshui/03-yang-house/八宅明镜.md#section-0000')).toMatchObject({ title: '八宅明镜' });
  });
});
