import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';

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

  it('rejects an unknown tool name', async () => {
    await expect(runLocalTool('not_a_tool', {})).rejects.toThrow('未知本地工具');
  });
});
