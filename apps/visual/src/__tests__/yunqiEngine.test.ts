import { describe, expect, it } from 'vitest';
import { calculateYunqi, calcYunqiEnveloped } from '@/legacy/yunqiEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 五运六气纯 TS 引擎测试（C 类迁移第二步）。
 * 与旧 YunqiEngine.calculate(year) 同输入对照（取数规则一致，用固定样例锁定）。
 */

describe('calculateYunqi 纯 TS 计算', () => {
  it('2024年甲辰：岁运土运太过、司天太阳寒水、在泉太阴湿土（与旧引擎一致）', () => {
    // 旧引擎：(2024-4)%10=0→甲，(2024-4)%12=4→辰
    // 甲→土运太过，辰→太阳寒水，太阳寒水→在泉太阴湿土
    const r = calculateYunqi({ year: 2024, currentMonth: 6 });
    expect(r.tiangan).toBe('甲');
    expect(r.dizhi).toBe('辰');
    expect(r.wuyun.dayun).toBe('土运太过');
    expect(r.liuqi.sitian).toBe('太阳寒水');
    expect(r.liuqi.zaiquan).toBe('太阴湿土');
    expect(r.mode).toBe('local-approx'); // 未传 solar
    expect(r.yearBoundary).toContain('近似按公历');
  });

  it('1990年庚午：岁运金运太过、司天少阴君火（与旧引擎一致）', () => {
    // (1990-4)%10=1986%10=6→庚，(1990-4)%12=1986%12=6→午
    // 庚→金运太过，午→少阴君火，在泉阳明燥金
    const r = calculateYunqi({ year: 1990, currentMonth: 6 });
    expect(r.tiangan).toBe('庚');
    expect(r.dizhi).toBe('午');
    expect(r.wuyun.dayun).toBe('金运太过');
    expect(r.liuqi.sitian).toBe('少阴君火');
    expect(r.liuqi.zaiquan).toBe('阳明燥金');
  });

  it('客气六步含 6 步且三之气=司天', () => {
    const r = calculateYunqi({ year: 2024, currentMonth: 6 });
    expect(r.liuqi.zhuke.length).toBe(6);
    expect(r.liuqi.zhuke[2].step).toBe('三之气');
    expect(r.liuqi.zhuke[2].qi).toBe(r.liuqi.sitian);
  });

  it('客运起于岁运五行，5 步循环', () => {
    const r = calculateYunqi({ year: 2024, currentMonth: 6 }); // 土运太过 → 起于土
    expect(r.wuyun.keyun.length).toBe(5);
    expect(r.wuyun.keyun[0]).toBe('土');
    expect(r.wuyun.keyun).toEqual(['土', '金', '水', '木', '火']);
  });

  it('主运固定为木火土金水', () => {
    const r = calculateYunqi({ year: 2024, currentMonth: 6 });
    expect(r.wuyun.zhuyun).toEqual(['木', '火', '土', '金', '水']);
  });

  it('疾病倾向含岁运与司天对应症状', () => {
    const r = calculateYunqi({ year: 2024, currentMonth: 6 });
    expect(r.disease_tendency).toContain('脾湿'); // 土运太过
    expect(r.disease_tendency).toContain('风寒感冒'); // 太阳寒水
  });

  it('currentMonth 控制当前客气步（确定性）', () => {
    const r1 = calculateYunqi({ year: 2024, currentMonth: 1 });
    const r6 = calculateYunqi({ year: 2024, currentMonth: 6 });
    // 1月→idx0初之气；6月→idx2三之气
    expect(r1.liuqi.current_step?.step).toBe('初之气');
    expect(r6.liuqi.current_step?.step).toBe('三之气');
    expect(r1.liuqi.current_step?.zhuqi).toBe('厥阴风木');
    expect(r6.liuqi.current_step?.zhuqi).toBe('少阳相火');
  });

  it('客主加临关系落在已知值内', () => {
    const r = calculateYunqi({ year: 2024, currentMonth: 6 });
    expect(['同气', '客生主', '主生客', '客克主', '主克客', '同类', '未知']).toContain(r.liuqi.kezhujialin);
  });

  it('传入 solar 但 getJieQiTable 不可用时回退 local-approx（无 window 依赖）', () => {
    // 传一个最小 solar mock，不带 getJieQiTable → 应回退近似
    const fakeSolar = { fromYmd: () => ({ getLunar: () => ({}) }) };
    const r = calculateYunqi({ year: 2024, solar: fakeSolar as never, currentMonth: 6 });
    expect(r.mode).toBe('local-approx');
  });
});

describe('calcYunqiEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('YunqiEngine');
    const data = env.data as { tiangan: string; dizhi: string; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.tiangan).toBe('甲');
    expect(data.export_snapshot.summary).toContain('甲辰');
    expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(5);
  });

  it('近似模式带未精确历法 warning', () => {
    const env = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    expect(env.warnings?.some((w) => w.includes('公历年近似'))).toBe(true);
  });
});
