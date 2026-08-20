import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCAL_TOOL_NAMES, LOCAL_TOOL_REGISTRY, type LocalToolName } from '@/legacy/localToolRegistry';
import { describeLocalTool, listLocalToolDescriptors } from '@/legacy/localToolIntrospection';
import { LOCAL_TOOL_RUNNERS, runLocalTool } from '@/legacy/directRunner';
import { verifyLocalToolClaims } from '@/legacy/localClaimVerifier';
import { presentLocalTool } from '@/legacy/agentPresentation';

function toolFixture(tool: LocalToolName): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(`src/__fixtures__/local-tools/${tool}.success.json`), 'utf8'));
}
const BAZI_INPUT = {
  birth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' as const },
  timeBasis: 'civil-unverified' as const,
  civilFallbackConfirmed: true,
  shenShaTrineSource: 'year' as const,
};

describe('Agent CLI introspection and public claims verification', () => {
  it('lists every local tool exactly once with stable public metadata', () => {
    const descriptors = listLocalToolDescriptors();
    expect(descriptors.map(({ name }) => name)).toEqual(LOCAL_TOOL_NAMES);
    expect(new Set(descriptors.map(({ name }) => name)).size).toBe(32);
    expect(descriptors.every(({ successFixture }) => successFixture.endsWith('.success.json'))).toBe(true);
  });

  it('describes bazi input, true-solar boundary, fixture, and claim kinds', () => {
    const descriptor = describeLocalTool('bazi_calculate');
    expect(descriptor).toMatchObject({
      name: 'bazi_calculate',
      resultKind: 'ToolEnvelope',
      claimVerifier: 'bazi',
      successFixture: 'src/__fixtures__/local-tools/bazi_calculate.success.json',
      inputSchemaVersion: '1.0.0',
    });
    expect(descriptor.claimKinds).toContain('pillar');
    expect(descriptor.claimKinds).toContain('transitRelation');
    expect(descriptor.inputSchema).toMatchObject({ required: ['birth', 'timeBasis'] });
    expect(JSON.stringify(descriptor.inputSchema)).toContain('trueSolarResolution');
  });

  it('accepts matching bazi claims and returns only verified claims', async () => {
    const envelope = await runLocalTool('bazi_calculate', BAZI_INPUT);
    const data = (envelope as any).data;
    const claims = [
      { tool: 'bazi_calculate', kind: 'pillar', pillar: 'year', value: `${data.pillars.year.stem}${data.pillars.year.branch}` },
      { tool: 'bazi_calculate', kind: 'dayMaster', value: data.dayMaster },
    ];
    const verification = verifyLocalToolClaims('bazi_calculate', envelope, claims);
    expect(verification.valid).toBe(true);
    expect(verification.verifiedFacts).toHaveLength(2);
    expect(verification.violations).toEqual([]);
  });

  it('rejects tampered and cross-tool bazi claims without treating them as verified facts', async () => {
    const envelope = await runLocalTool('bazi_calculate', BAZI_INPUT);
    const verification = verifyLocalToolClaims('bazi_calculate', envelope, [
      { tool: 'bazi_calculate', kind: 'dayMaster', value: '甲' },
      { tool: 'ziwei_chart', kind: 'dayMaster', value: (envelope as any).data.dayMaster },
    ]);
    expect(verification.valid).toBe(false);
    expect(verification.verifiedFacts).toEqual([]);
    expect(verification.violations).toMatchObject([
      { code: 'value-mismatch' },
      { code: 'tool-mismatch' },
    ]);
  });

  it('rejects a cross-tool envelope before entering the bazi verifier', async () => {
    const feixing = await runLocalTool('calc_feixing', { year: 2026 });
    expect(() => verifyLocalToolClaims('bazi_calculate', feixing, [])).toThrow('不是 bazi_calculate 的结果');
  });

  it('produces a privacy-safe bazi presentation with verified facts and no normalized birth payload', async () => {
    const presentation = await presentLocalTool('bazi_calculate', BAZI_INPUT);
    expect(presentation.verifiedFacts.map(({ id }) => id)).toEqual(expect.arrayContaining(['pillar.year', 'dayMaster', 'strength']));
    expect(presentation.limitations.join(' ')).toContain('结构化事实');
    expect(presentation.disclaimers.join(' ')).toContain('传统文化');
    expect(presentation).not.toHaveProperty('input_normalized');
    expect(JSON.stringify(presentation)).not.toContain('1990-06-15');
  });

  it('reports unsupported public verification explicitly', async () => {
    const result = await runLocalTool('list_constitution_questionnaire', {});
    expect(() => verifyLocalToolClaims('list_constitution_questionnaire', result, [])).toThrow('没有公开结构化 claims 校验器');
  });
  it('describes explicit temporal requirements for date-sensitive CLI tools', () => {
    expect(describeLocalTool('calc_feixing').inputSchema).toMatchObject({ required: ['year'] });
    expect(describeLocalTool('calc_bazhai').inputSchema).toMatchObject({ required: ['birthYear', 'gender', 'year'] });
    expect(describeLocalTool('combo_annual_fortune').inputSchema).toMatchObject({ required: ['birth', 'baziTimeContext', 'targetYear', 'currentMonth'] });
    expect(describeLocalTool('combo_space_time').inputSchema).toMatchObject({ required: ['birth', 'targetYear'] });
  });
  it.each(LOCAL_TOOL_NAMES)('matches %s success fixture to the registry resultToolId', async (tool) => {
    const result = await runLocalTool(tool, toolFixture(tool));
    if (tool === 'resolve_true_solar_time') {
      expect(result).toHaveProperty('trueSolarBirth');
    } else {
      expect((result as any).tool).toBe(LOCAL_TOOL_REGISTRY[tool].resultToolId);
    }
  });

  it('routes all public verifier families through the registry binding', async () => {
    const ziwei = await runLocalTool('ziwei_chart', toolFixture('ziwei_chart')) as any;
    const feixing = await runLocalTool('calc_feixing', toolFixture('calc_feixing')) as any;
    const bazhai = await runLocalTool('calc_bazhai', toolFixture('calc_bazhai')) as any;
    const almanac = await runLocalTool('get_almanac', toolFixture('get_almanac')) as any;
    const liuyao = await runLocalTool('cast_liuyao', toolFixture('cast_liuyao')) as any;
    const dream = await runLocalTool('dream_interpret', toolFixture('dream_interpret')) as any;
    const annual = await runLocalTool('combo_annual_fortune', toolFixture('combo_annual_fortune')) as any;

    expect(verifyLocalToolClaims('ziwei_chart', ziwei, [{ tool: 'ziwei_chart', kind: 'metadata', field: 'fiveElementsClass', value: ziwei.data.fiveElementsClass }]).valid).toBe(true);
    expect(verifyLocalToolClaims('calc_feixing', feixing, [{ tool: 'calc_feixing', kind: 'year', value: feixing.data.year }]).valid).toBe(true);
    expect(verifyLocalToolClaims('calc_bazhai', bazhai, [{ tool: 'calc_bazhai', kind: 'mingGua', field: 'trigram', value: bazhai.data.mingGua.trigram }]).valid).toBe(true);
    expect(verifyLocalToolClaims('get_almanac', almanac, [{ tool: 'get_almanac', kind: 'almanac', field: 'solarDate', value: almanac.data.solarDate }]).valid).toBe(true);
    expect(verifyLocalToolClaims('cast_liuyao', liuyao, [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: liuyao.data.hexagramName }]).valid).toBe(true);
    expect(verifyLocalToolClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: dream.data.hit }]).valid).toBe(true);
    expect(verifyLocalToolClaims('combo_annual_fortune', annual, [{ tool: 'combo_annual_fortune', kind: 'annualContext', field: 'targetYear', value: annual.data.context.targetYear }]).valid).toBe(true);
  });
  it('keeps registry, runner, schemas, and fixtures exhaustive', () => {
    expect(new Set(Object.keys(LOCAL_TOOL_RUNNERS))).toEqual(new Set(LOCAL_TOOL_NAMES));
    for (const tool of LOCAL_TOOL_NAMES) {
      const definition = LOCAL_TOOL_REGISTRY[tool];
      const descriptor = describeLocalTool(tool);
      expect(descriptor.resultToolId).toBe(definition.resultToolId);
      expect(descriptor.claimVerifier).toBe(definition.claimVerifier);
      expect(descriptor.riskDomain).toBe(definition.riskDomain);
      expect(descriptor.inputSchema).toMatchObject({ required: [...definition.requiredInputKeys] });
      expect(descriptor.successFixture).toBe(`src/__fixtures__/local-tools/${tool}.success.json`);
    }
  });
});
