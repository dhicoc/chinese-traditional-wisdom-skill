import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseAgentParameterPlanInput,
  planAgentParameters,
} from '@/legacy/agentParameterPlanner';
import { LOCAL_TOOL_NAMES } from '@/legacy/localToolRegistry';

describe('Agent parameter planner', () => {
  it('plans a career request without calculating or inventing birth/time basis', () => {
    const plan = planAgentParameters({ query: '我想看今年事业' });
    expect(plan).toMatchObject({
      schemaVersion: '1.0.0',
      routeKind: 'calculation',
      routeTarget: { module: 'bazi' },
      executionPolicy: 'plan-only',
      suggestedDepth: 'standard',
      candidates: [{ tool: 'bazi_calculate', inputReady: false, executionAllowed: true }],
    });
    expect(plan.missingInputs.map(({ field }) => field)).toEqual(expect.arrayContaining(['birth', 'timeBasis']));
    expect(plan.recognizedInputs).not.toContain('targetYear');
    expect(plan.limitations.join(' ')).toContain('不调用计算引擎');
    expect(JSON.stringify(plan)).not.toContain('我想看今年事业');
  });

  it('marks a complete birth plus explicitly provided time basis as input-ready', () => {
    const plan = planAgentParameters({
      query: '1990-06-15 12 男 我想看事业',
      providedFields: ['timeBasis'],
    });
    expect(plan.recognizedInputs).toEqual(expect.arrayContaining(['birth', 'timeBasis']));
    expect(plan.candidates[0]).toMatchObject({ tool: 'bazi_calculate', inputReady: true, missingInputs: [] });
    expect(plan.missingInputs).toEqual([]);
  });

  it('does not resolve relative dates or system time implicitly', () => {
    const relative = planAgentParameters({ query: '今天宜什么' });
    expect(relative.candidates[0]).toMatchObject({ tool: 'get_almanac', inputReady: false });
    expect(relative.missingInputs).toContainEqual(expect.objectContaining({ field: 'date' }));
    expect(relative.recognizedInputs).not.toContain('date');

    const explicit = planAgentParameters({ query: '2026-08-21 黄历宜忌' });
    expect(explicit.candidates[0]).toMatchObject({ tool: 'get_almanac', inputReady: true });
    expect(explicit.recognizedInputs).toEqual(expect.arrayContaining(['date', 'queryDate']));
    expect(explicit.recognizedInputs).not.toContain('birth');
  });

  it('plans true-solar verification first and requires complete evidence', () => {
    const plan = planAgentParameters({ query: '请做真太阳时校时' });
    expect(plan.routeTarget).toMatchObject({ module: 'bazi' });
    expect(plan.candidates.map(({ tool }) => tool)).toEqual(['resolve_true_solar_time', 'bazi_calculate']);
    expect(plan.candidates[0]).toMatchObject({ source: 'primary', inputReady: false });
    expect(plan.candidates[0].missingInputs.map(({ field }) => field)).toEqual(['birth', 'location']);
    expect(plan.missingInputs.map(({ field }) => field)).toEqual(expect.arrayContaining(['birth', 'location', 'timeBasis']));
  });

  it('keeps knowledge requests on the knowledge path without chart parameters', () => {
    const plan = planAgentParameters({ query: '庄子怎么看焦虑' });
    expect(plan).toMatchObject({
      routeKind: 'knowledge',
      executionPolicy: 'knowledge-only',
      suggestedDepth: 'light',
      candidates: [],
      missingInputs: [],
    });
  });

  it('blocks candidate execution and refers first for urgent high-risk wording', () => {
    const plan = planAgentParameters({ query: '最近胸痛，八字怎么看' });
    expect(plan).toMatchObject({ routeKind: 'high-risk', executionPolicy: 'refer-first', suggestedDepth: 'light' });
    expect(plan.candidates[0].executionAllowed).toBe(false);
    expect(plan.riskNotices.join(' ')).toContain('优先联系当地急救或执业医师');
  });

  it('does not auto-route ordinary professional requests into traditional calculation', () => {
    for (const query of ['胃疼怎么办', '请推荐股票投资组合', '合同纠纷要不要起诉', '焦虑症怎么办']) {
      const plan = planAgentParameters({ query });
      expect(plan).toMatchObject({
        routeKind: 'unrecognized',
        executionPolicy: 'no-traditional-calculation',
        candidates: [],
      });
      expect(plan.riskNotices.join(' ')).toContain('专业人士');
    }
  });

  it('warns on unauthorized third-party requests and never makes them ready to execute', () => {
    const plan = planAgentParameters({ query: '分析同事的婚姻八字' });
    expect(plan.routeKind).toBe('high-risk');
    expect(plan.executionPolicy).toBe('refer-first');
    expect(plan.riskNotices.join(' ')).toContain('已获得相关人士授权');
    expect(plan.candidates.every(({ executionAllowed }) => !executionAllowed)).toBe(true);
  });

  it('uses descriptor-required keys and only emits registered tool candidates', () => {
    const queries = ['六爻问工作', '紫微命宫', '五运六气 2026年 8月', '梦见蛇 解梦', '测字 明', '八宅卧室方位'];
    for (const query of queries) {
      const plan = planAgentParameters({ query });
      for (const candidate of plan.candidates) {
        expect(LOCAL_TOOL_NAMES).toContain(candidate.tool);
        expect(candidate.successFixture).toBe(`src/__fixtures__/local-tools/${candidate.tool}.success.json`);
        expect(candidate.requiredInputKeys).toEqual(expect.any(Array));
      }
    }
    expect(LOCAL_TOOL_NAMES).toHaveLength(32);
  });

  it('supports privacy-safe presence hints but rejects unknown hints', () => {
    expect(parseAgentParameterPlanInput({ query: '八字', providedFields: ['birth', 'timeBasis', 'birth'] })).toEqual({
      query: '八字', providedFields: ['birth', 'timeBasis'],
    });
    expect(() => parseAgentParameterPlanInput({ query: '' })).toThrow('query');
    expect(() => parseAgentParameterPlanInput({ query: '八字', providedFields: ['birth.password'] })).toThrow('未知字段');
    expect(() => parseAgentParameterPlanInput({ query: '八字', providedFields: 'birth' })).toThrow('字符串数组');
  });

  it('returns an explicit unrecognized plan instead of guessing a tool', () => {
    const plan = planAgentParameters({ query: '的吗呢' });
    expect(plan).toMatchObject({
      routeKind: 'unrecognized',
      routeTarget: { module: null },
      candidates: [],
      missingInputs: [{ field: 'query.scope' }],
    });
  });

  it('has no runner or calculation-engine dependency', () => {
    const source = fs.readFileSync(path.resolve('src/legacy/agentParameterPlanner.ts'), 'utf8');
    expect(source).not.toContain('directRunner');
    expect(source).not.toContain('runLocalTool');
    expect(source).not.toMatch(/calculateBazi|calcBazi|calculateZiwei|calcTaiyi|Solar\./);
  });
});
