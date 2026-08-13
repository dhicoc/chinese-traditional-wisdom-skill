import { describe, expect, it } from 'vitest';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';

describe('共享 presentation adapter 的 valid-only filtering', () => {
  it('仅将手工注入的已验证事实带入语义报告，并保留 export_snapshot 的可导出正文', () => {
    const factChecks: StructuredFactCheck[] = [
      {
        fact: { label: '值宿', value: '角', tool: 'xingxiu_daily' },
        validation: { valid: true },
      },
      {
        fact: { label: '传统断语', value: '不应进入事实区', tool: 'xingxiu_daily' },
        validation: { valid: false },
      },
    ];
    const presentation = toUserPresentation({
      ok: true,
      data: {
        export_snapshot: {
          summary: '星宿摘要',
          sections: [{ heading: '传统解释', body: '仅供参考' }],
          sourceNotes: 'internal-only',
        },
      },
    }, { factChecks });

    expect(presentation.semanticReport?.facts).toEqual([
      { label: '值宿', value: '角', tool: 'xingxiu_daily' },
    ]);
    expect(presentation.exportReport).toEqual({
      summary: '星宿摘要',
      sections: [{ heading: '传统解释', body: '仅供参考' }],
    });
  });
});
