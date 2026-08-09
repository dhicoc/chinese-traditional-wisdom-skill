import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-typescript';
import { calcZeriCombo } from '../../visual/src/legacy/comboEngine';
import { validateComboClaims, type ComboPresentationClaim } from './comboClaimVerifier';

const envelope = calcZeriCombo({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  purpose: '开业',
  startDate: '2026-08-01',
  endDate: '2026-08-15',
  targetYear: 2026,
  topN: 3,
  solar: Solar,
});

describe('组合择日呈现断言校验', () => {
  it('接受本次搜索范围、用途、候选日期与方位基础事实', () => {
    const data = envelope.data;
    const rankedDay = data.rankedDays[0]!;
    const direction = data.personalAuspicious[0]!;
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: data.zeriPurpose },
      { tool: 'combo_zeri', kind: 'zeriRange', field: 'start', value: data.range.start },
      { tool: 'combo_zeri', kind: 'zeriRange', field: 'scannedDays', value: data.range.scannedDays },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: rankedDay.date },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: rankedDay.score },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'chongOwner', value: rankedDay.chongOwner },
      { tool: 'combo_zeri', kind: 'zeriAnnualSha', field: 'taisui', value: data.annualSha.taisui },
      { tool: 'combo_zeri', kind: 'zeriPersonalDirection', index: 0, field: 'direction', value: direction.direction },
    ];

    expect(validateComboClaims('combo_zeri', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造分数、越界候选和跨工具断言', () => {
    const data = envelope.data;
    const result = validateComboClaims('combo_zeri', data, [
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: data.rankedDays[0]!.score + 1 },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 99, field: 'date', value: '2026-08-01' },
      { tool: 'combo_monthly_fortune', kind: 'zeriPurpose', value: '开业' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriRankedDay' }),
      expect.objectContaining({ tool: 'combo_monthly_fortune', kind: 'zeriPurpose' }),
    ]));
  });
});
