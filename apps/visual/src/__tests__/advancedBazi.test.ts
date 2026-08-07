import { describe, expect, it } from 'vitest';
import { analyzeAdvancedBazi } from '@/legacy/advancedBazi';

const stemIndex: Record<string, number> = { 甲: 0, 乙: 1, 丙: 2, 丁: 3, 戊: 4, 己: 5, 庚: 6, 辛: 7, 壬: 8, 癸: 9 };
const branchIndex: Record<string, number> = { 子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11 };

function pillar(stem: string, branch: string) {
  return { stem, branch, stemIndex: stemIndex[stem], branchIndex: branchIndex[branch] };
}

describe('analyzeAdvancedBazi 高阶判断规则', () => {
  it('识别月令得令、通根与透干助力，并形成扶抑取用', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('甲', '寅'),
      month: pillar('丙', '卯'),
      day: pillar('甲', '辰'),
      hour: pillar('壬', '子'),
    });

    expect(result.monthCommand).toMatchObject({ branch: '卯', dayMasterState: '旺', obtainsCommand: true });
    expect(result.support).toMatchObject({ obtainsRoot: true, obtainsMomentum: true, strength: '身强' });
    expect(result.fuyii).toMatchObject({ principle: '抑强', usefulElements: expect.arrayContaining(['金', '土', '火']) });
  });

  it('以月支主气的十神判定普通格局', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('庚', '子'),
      month: pillar('戊', '申'),
      day: pillar('甲', '寅'),
      hour: pillar('壬', '子'),
    });

    expect(result.pattern).toMatchObject({ name: '七杀格', status: '成立', primaryGod: '七杀' });
  });

  it('日主极弱且全局一气时判定从势成立', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('庚', '申'),
      month: pillar('庚', '申'),
      day: pillar('甲', '申'),
      hour: pillar('庚', '申'),
    });

    expect(result.followPattern).toMatchObject({ status: '成立', type: '从杀' });
  });

  it('天干五合在月令支持化神时判定化气成立', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('甲', '辰'),
      month: pillar('己', '辰'),
      day: pillar('戊', '戌'),
      hour: pillar('己', '丑'),
    });

    expect(result.transformation).toMatchObject({ status: '成立', element: '土' });
  });

  it('冬令火日主提示木火调候，且木土相战时给出火通关', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('甲', '子'),
      month: pillar('己', '子'),
      day: pillar('丙', '子'),
      hour: pillar('戊', '辰'),
    });

    expect(result.seasonalAdjustment.usefulElements).toEqual(expect.arrayContaining(['木', '火']));
    expect(result.passage).toMatchObject({ status: '成立', element: '火', conflict: '木土' });
  });

  it('七杀透干而食神透干时以食神制杀识别病药', () => {
    const result = analyzeAdvancedBazi({
      year: pillar('庚', '申'),
      month: pillar('丙', '寅'),
      day: pillar('甲', '寅'),
      hour: pillar('丙', '午'),
    });

    expect(result.remedy).toMatchObject({ status: '成立', illness: '七杀', remedy: '食神制杀' });
  });
});
