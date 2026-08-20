import { describe, expect, it } from 'vitest';
import { LOCAL_TOOL_NAMES } from '@/legacy/localToolRegistry';
import { describeLocalTool, listLocalToolDescriptors } from '@/legacy/localToolIntrospection';
import { runLocalTool } from '@/legacy/directRunner';
import { verifyLocalToolClaims } from '@/legacy/localClaimVerifier';
import { presentLocalTool } from '@/legacy/agentPresentation';

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
});
