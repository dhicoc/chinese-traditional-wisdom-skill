import { describe, expect, it } from 'vitest';
import { explainTerm, hasTermExplanation } from '@/legacy/termExplanations';

describe('八字术语说明', () => {
  it('喜用神使用八字语境，不回退为六爻用神', () => {
    const explanation = explainTerm('喜用神');

    expect(explanation).toContain('八字');
    expect(explanation).toContain('五行趋于平衡');
    expect(explanation).not.toContain('六爻占卜');
  });

  it.each(['日主', '十神', '月令', '扶抑', '调候', '通关', '病药', '从格', '化气', '本命盘', '冲合刑害'])('%s 提供可查询的通俗说明', (term) => {
    expect(hasTermExplanation(term)).toBe(true);
    expect(explainTerm(term)).not.toBe('暂无该术语的解释');
  });
});
