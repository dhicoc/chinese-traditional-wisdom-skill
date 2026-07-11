import { describe, expect, it } from 'vitest';
import { getToolGuidance, listToolGuidance, validateToolInput, GLOBAL_AGENT_RULES } from './guidance';
import { dispatchIntent } from './dispatch';

/**
 * agent_guidance + wisdom_dispatch 测试。
 * 借鉴 horosa 工程化点 1（参数引导）+ 2（意图路由）。
 */

describe('agent_guidance 参数引导', () => {
  it('getToolGuidance 返回 bazi 完整引导', () => {
    const g = getToolGuidance('bazi_calculate');
    expect(g).not.toBeNull();
    expect(g!.purpose).toContain('八字');
    expect(g!.requiredParams.length).toBeGreaterThan(0);
    expect(g!.requiredParams.some((p) => p.name === 'birth.year')).toBe(true);
    expect(g!.requiredParams.some((p) => p.name === 'birth.gender')).toBe(true);
    expect(g!.workflow).toBeTruthy();
    expect(g!.doNotAssume.length).toBeGreaterThan(0);
  });

  it('未注册工具返回 null', () => {
    expect(getToolGuidance('nonexistent')).toBeNull();
  });

  it('listToolGuidance 返回 10 个工具摘要', () => {
    const list = listToolGuidance();
    expect(list.length).toBe(10);
    list.forEach((g) => {
      expect(g.tool).toMatch(/^[a-z_]+$/);
      expect(g.purpose).toBeTruthy();
      expect(g.requiredParams.length).toBeGreaterThan(0);
    });
  });

  it('GLOBAL_AGENT_RULES 含不得编造生辰规则', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('不得') && r.includes('生辰'))).toBe(true);
  });

  it('validateToolInput: bazi 缺时辰与性别时返回追问', () => {
    const { missing, prompts } = validateToolInput('bazi_calculate', {
      birth: { year: 1990, month: 6, day: 15 }, // 缺 hour + gender
    });
    expect(missing.length).toBe(2);
    expect(missing.some((m) => m.name === 'birth.hour')).toBe(true);
    expect(missing.some((m) => m.name === 'birth.gender')).toBe(true);
    expect(prompts.length).toBe(2);
    expect(prompts.some((p) => p.includes('时辰'))).toBe(true);
    expect(prompts.some((p) => p.includes('性别'))).toBe(true);
  });

  it('validateToolInput: bazi 参数齐全时返回空', () => {
    const { missing, prompts } = validateToolInput('bazi_calculate', {
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
    });
    expect(missing).toEqual([]);
    expect(prompts).toEqual([]);
  });

  it('validateToolInput: dream_interpret 缺 keyword 返回追问', () => {
    const { missing } = validateToolInput('dream_interpret', {});
    expect(missing.length).toBe(1);
    expect(missing[0].name).toBe('keyword');
  });
});

describe('wisdom_dispatch 意图路由', () => {
  it('排八字带完整生辰 → bazi_calculate + 参数齐全', () => {
    const r = dispatchIntent('帮我排个八字，1990年6月15日12时男');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('bazi_calculate');
    const args = r.arguments as { birth: { year: number; month: number; day: number; hour: number; gender: string } };
    expect(args.birth.year).toBe(1990);
    expect(args.birth.month).toBe(6);
    expect(args.birth.day).toBe(15);
    expect(args.birth.hour).toBe(12);
    expect(args.birth.gender).toBe('男');
    expect(r.missingPrompts).toEqual([]);
  });

  it('排八字缺时辰与性别 → 命中 bazi 但有缺参追问', () => {
    const r = dispatchIntent('算一下八字，1995年3月20日');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('bazi_calculate');
    const args = r.arguments as { birth: { year: number; month: number; day: number; hour?: number; gender?: string } };
    expect(args.birth.year).toBe(1995);
    expect(args.birth.hour).toBeUndefined();
    expect(args.birth.gender).toBeUndefined();
    expect(r.missingPrompts.some((p) => p.includes('时辰'))).toBe(true);
    expect(r.missingPrompts.some((p) => p.includes('性别'))).toBe(true);
  });

  it('梦见蛇 → dream_interpret', () => {
    const r = dispatchIntent('我梦见蛇是什么意思');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('dream_interpret');
    expect((r.arguments as { keyword: string }).keyword).toBe('蛇');
    expect(r.missingPrompts).toEqual([]);
  });

  it('紫微排盘 → ziwei_chart', () => {
    const r = dispatchIntent('帮我看紫微命盘，1988年10月5日8时女');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('ziwei_chart');
    const args = r.arguments as { birth: { year: number; gender: string; hour: number } };
    expect(args.birth.year).toBe(1988);
    expect(args.birth.gender).toBe('女');
    expect(args.birth.hour).toBe(8);
  });

  it('姓名打分 → analyze_name 提取姓+名', () => {
    const r = dispatchIntent('张伟这个名字打多少分，1990年出生');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('analyze_name');
    const args = r.arguments as { surname: string; givenName: string; birthYear?: number };
    expect(args.surname).toBe('张');
    expect(args.givenName).toBe('伟');
    expect(args.birthYear).toBe(1990);
  });

  it('奇门遁甲 → arrange_qimen', () => {
    const r = dispatchIntent('帮我起个奇门局，2024年3月15日9时');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('arrange_qimen');
  });

  it('六爻问财运 → cast_liuyao + question 提取', () => {
    const r = dispatchIntent('用六爻测一下今年财运，1990年6月15日12时男');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('cast_liuyao');
    const args = r.arguments as { question?: string; birth: { gender: string } };
    expect(args.birth.gender).toBe('男');
    expect(args.question).toBeTruthy();
  });

  it('五运六气 → calc_yunqi 提取年份', () => {
    const r = dispatchIntent('2024年五运六气怎么样');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('calc_yunqi');
    expect((r.arguments as { year: number }).year).toBe(2024);
  });

  it('无关文本 → 未命中', () => {
    const r = dispatchIntent('今天天气真好');
    expect(r.hit).toBe(false);
    expect(r.tool).toBeNull();
    expect(r.reason).toContain('未匹配');
  });

  it('优先级：同时含八字与解梦关键词时按优先级选 dream_interpret', () => {
    // dream priority 90 > bazi 50
    const r = dispatchIntent('梦见算命先生给我排八字');
    expect(r.tool).toBe('dream_interpret');
  });
});
