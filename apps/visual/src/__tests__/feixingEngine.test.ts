import { describe, expect, it } from 'vitest';
import { calcFeixing } from '@/legacy/feixingEngine';
import { NINE_STAR_REMEDIES, getStarStatuses, getYuanYun } from '@/legacy/flyingStarRemedies';

describe('流年飞星传统文案', () => {
  it('九星说明不将健康、财务或施工结果作为预测', () => {
    expect(NINE_STAR_REMEDIES[2].health).toContain('不对应个人健康');
    expect(NINE_STAR_REMEDIES[5].career).toContain('建筑安全');
    expect(NINE_STAR_REMEDIES[7].meaning).toContain('不预示伤害、失窃或破财');
    expect(NINE_STAR_REMEDIES[8].career).toContain('不构成置业或投资建议');
  });

  it('旺衰状态保留传统标签，不输出灾病或疾病断语', () => {
    const statuses = getStarStatuses(getYuanYun(2024));
    expect(statuses.find((status) => status.star === 5 && status.status === '凶星')?.description).toContain('传统“五黄”方位标签');
    expect(statuses.find((status) => status.star === 2 && status.status === '凶星')?.description).toContain('不对应疾病判断');
    expect(statuses.map((status) => status.description).join('')).not.toMatch(/主灾病|主疾病/);
  });

  it('导出快照采用传统方位提示并带现实决策边界', () => {
    const env = calcFeixing({ year: 2024, gender: '男', birthYear: 1990 });
    expect(env.ok).toBe(true);
    const snapshot = env.data.export_snapshot;
    expect(snapshot.summary).toContain('不用于健康、财务、施工或其他现实决策');
    expect(snapshot.sections.some((section) => section.heading === '传统方位提示')).toBe(true);
    expect(snapshot.sections.some((section) => section.heading === '凶位化解')).toBe(false);
  });
});
