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

  it('strips unknown fields from feixing and bazhai tool inputs', async () => {
    const feixingInput = parseLocalToolInput('calc_feixing', {
      year: 2026,
      gender: '女',
      birthYear: 1992,
      unexpected: 'sentinel',
    });
    expect(feixingInput).toEqual({ year: 2026, gender: '女', birthYear: 1992 });

    const bazhaiInput = parseLocalToolInput('calc_bazhai', {
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
      unexpected: 'sentinel',
    });
    expect(bazhaiInput).toEqual({
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
    });

    const feixing = await runLocalTool('calc_feixing', {
      year: 2026,
      gender: '女',
      birthYear: 1992,
      unexpected: 'sentinel',
    });
    expect((feixing as { input_normalized: unknown }).input_normalized).toEqual({
      year: 2026,
      gender: '女',
      birthYear: 1992,
    });

    const bazhai = await runLocalTool('calc_bazhai', {
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
      unexpected: 'sentinel',
    });
    expect((bazhai as { input_normalized: unknown }).input_normalized).toEqual({
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
    });
  });

  it('strips unknown fields from ziwei tool inputs and envelopes', async () => {
    const input = parseLocalToolInput('ziwei_chart', {
      birth: {
        ...BIRTH,
        minute: 30,
        isLunar: true,
        useExactCalendar: false,
      },
      mingGua: { trigram: '离', group: '东四命', unexpected: 'sentinel' },
      transit: { year: 2025, month: 7, unexpected: 'sentinel' },
      unexpected: 'sentinel',
    });
    expect(input).toEqual({
      birth: BIRTH,
      mingGua: { trigram: '离', group: '东四命' },
      transit: { year: 2025, month: 7 },
    });

    const envelope = await runLocalTool('ziwei_chart', {
      birth: {
        ...BIRTH,
        minute: 30,
        isLunar: true,
        useExactCalendar: false,
      },
      mingGua: { trigram: '离', group: '东四命', unexpected: 'sentinel' },
      transit: { year: 2025, month: 7, unexpected: 'sentinel' },
      unexpected: 'sentinel',
    });
    expect((envelope as { input_normalized: unknown }).input_normalized).toEqual({
      birth: BIRTH,
      mingGua: { trigram: '离', group: '东四命' },
      transit: { year: 2025, month: 7 },
    });
  });

  it('strips unknown fields from bazi, liuren and taiyi tool inputs', async () => {
    const baziInput = parseLocalToolInput('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
      unexpected: 'sentinel',
    });
    expect(baziInput).toMatchObject({
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
    });
    expect(baziInput).not.toHaveProperty('unexpected');

    const liurenInput = parseLocalToolInput('liuren_calculate', {
      birth: BIRTH,
      school: 'gufa',
      unexpected: 'sentinel',
    });
    expect(liurenInput).toMatchObject({ birth: BIRTH, school: 'gufa' });
    expect(liurenInput).not.toHaveProperty('unexpected');

    const taiyiInput = parseLocalToolInput('taiyi_calculate', {
      birth: BIRTH,
      jiStyle: 2,
      acumYear: 3,
      unexpected: 'sentinel',
    });
    expect(taiyiInput).toMatchObject({ birth: BIRTH, jiStyle: 2, acumYear: 3 });
    expect(taiyiInput).not.toHaveProperty('unexpected');

    const bazi = await runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
      unexpected: 'sentinel',
    });
    expect((bazi as { data: { timeSource: { timeBasis: string } } }).data.timeSource.timeBasis).toBe('civil-unverified');
    expect((bazi as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');

    for (const [tool, input] of [
      ['liuren_calculate', { birth: BIRTH, school: 'gufa', unexpected: 'sentinel' }],
      ['taiyi_calculate', { birth: BIRTH, jiStyle: 2, acumYear: 3, unexpected: 'sentinel' }],
    ] as const) {
      const envelope = await runLocalTool(tool, input);
      expect((envelope as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');
    }
  });
});
