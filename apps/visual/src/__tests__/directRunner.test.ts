import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';
import { parseLocalToolInput } from '@/legacy/toolContracts';

const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' };

describe('runLocalTool', () => {
  it('requires confirmed civil fallback and returns Bazi timeSource context directly', async () => {
    await expect(runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
    })).rejects.toThrow('civilFallbackConfirmed=true');

    const envelope = await runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
    });

    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect(result.ok).toBe(true);
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('returns annual combo output with direct context', async () => {
    const envelope = await runLocalTool('combo_annual_fortune', {
      birth: BIRTH,
      baziTimeContext: {
        timeBasis: 'civil-unverified',
        civilFallbackConfirmed: true,
      },
      targetYear: 2026,
      currentMonth: 8,
    });

    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect(result.ok).toBe(true);
    expect((result.data as { comboName: string }).comboName).toBe('年度综合运势');
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('rejects a tool without an input contract before the Runner can use raw input', () => {
    expect(() => parseLocalToolInput('not_a_tool', {})).toThrow('未知本地工具：not_a_tool');
  });

  it('rejects an unknown tool name before using raw input', async () => {
    await expect(runLocalTool('not_a_tool', {})).rejects.toThrow('未知本地工具：not_a_tool');
  });

  it('requires a confirmed Bazi time context for calc_chenguz', async () => {
    await expect(runLocalTool('calc_chenguz', {
      birth: BIRTH,
    })).rejects.toThrow('baziTimeContext必须是 JSON 对象。');

    const envelope = await runLocalTool('calc_chenguz', {
      birth: BIRTH,
      baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
    });
    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('rejects an invalid combo_marriage scene before calculating', async () => {
    await expect(runLocalTool('combo_marriage', {
      personA: {
        birth: BIRTH,
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
      },
      personB: {
        birth: { year: 1988, month: 3, day: 20, hour: 8, gender: '女' },
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
      },
      scene: 'invalid-scene',
    })).rejects.toThrow('scene 必须是婚恋、合伙或合作。');
  });

  it('strips unknown fields from divination tool inputs and envelopes', async () => {
    const qimenInput = parseLocalToolInput('arrange_qimen', {
      birth: BIRTH,
      question: '今日出行是否顺利？',
      unexpected: 'sentinel',
    });
    expect(qimenInput).toMatchObject({
      birth: BIRTH,
      question: '今日出行是否顺利？',
    });
    expect(qimenInput).not.toHaveProperty('unexpected');

    const meihuaInput = parseLocalToolInput('cast_meihua', {
      birth: BIRTH,
      method: 'number',
      numberA: 12,
      numberB: 34,
      unexpected: 'sentinel',
    });
    expect(meihuaInput).toMatchObject({
      birth: BIRTH,
      method: 'number',
      numberA: 12,
      numberB: 34,
    });
    expect(meihuaInput).not.toHaveProperty('unexpected');

    const liuyaoInput = parseLocalToolInput('cast_liuyao', {
      birth: BIRTH,
      method: 'manual',
      yaoValues: '678987',
      question: '项目能否推进？',
      seed: 2026,
      unexpected: 'sentinel',
    });
    expect(liuyaoInput).toMatchObject({
      birth: BIRTH,
      method: 'manual',
      yaoValues: '678987',
      question: '项目能否推进？',
      seed: 2026,
    });
    expect(liuyaoInput).not.toHaveProperty('unexpected');

    for (const [tool, input] of [
      ['arrange_qimen', { birth: BIRTH, question: '今日出行是否顺利？', unexpected: 'sentinel' }],
      ['cast_meihua', { birth: BIRTH, method: 'number', numberA: 12, numberB: 34, unexpected: 'sentinel' }],
      ['cast_liuyao', { birth: BIRTH, method: 'manual', yaoValues: '678987', question: '项目能否推进？', seed: 2026, unexpected: 'sentinel' }],
    ] as const) {
      const envelope = await runLocalTool(tool, input);
      expect((envelope as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');
    }
  });
});
