/**
 * termExplanations — 纯 TS 术语通俗解释（从 visual/js/core.js 抽取，零 window 依赖）
 */

import terms from './termExplanations.json';

const TERM_MAP = terms as Record<string, string>;

/** 查询单个术语的通俗解释 */
export function explainTerm(term: string): string {
  if (!term) return '暂无该术语的解释';
  const direct = TERM_MAP[term];
  if (direct) return direct;
  for (const [key, val] of Object.entries(TERM_MAP)) {
    if (term.includes(key) || key.includes(term)) return val;
  }
  return '暂无该术语的解释';
}

export function hasTermExplanation(term: string): boolean {
  return explainTerm(term) !== '暂无该术语的解释';
}
