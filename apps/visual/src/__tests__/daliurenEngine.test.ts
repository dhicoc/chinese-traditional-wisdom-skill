import { describe, expect, it } from 'vitest';
import { calculateDaliuren, calcDaliurenEnveloped } from '@/legacy/daliurenEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 大六壬纯 TS 引擎测试。
 * 参考 MingPan (MIT) 算法逻辑，验证天地盘/四课/三传/神煞/格局结构。
 */

describe('calculateDaliuren 结构验证', () => {
  it('返回完整大六壬盘结构', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.engineName).toBe('DaliurenEngine');
    expect(r.basicInfo.dayGanZhi).toHaveLength(2);
    expect(r.basicInfo.hourGanZhi).toHaveLength(2);
    expect(['昼', '夜']).toContain(r.basicInfo.dayNight);
    // 天地盘
    expect(r.tianDiPan.tianPan.length).toBe(12);
    expect(r.tianDiPan.diPan.length).toBe(12);
    expect(r.tianDiPan.tianJiang.length).toBe(12);
    expect(r.tianDiPan.diToTian).toBeDefined();
    // 四课
    expect(r.siKe.list.length).toBe(4);
    r.siKe.list.forEach((k) => {
      expect(k.shangShen).toHaveLength(1);
      expect(['上克下', '下贼上', '比和', '上生下', '下生上']).toContain(k.relation);
    });
    // 三传
    expect(r.sanChuan.chuChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.zhongChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.moChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.geJu).toBeTruthy();
    expect(r.sanChuan.geJuDetail).toBeTruthy();
    // 神煞
    expect(r.shenSha.riMa).toHaveLength(1);
    expect(r.shenSha.huaGai).toHaveLength(1);
  });
});

describe('天地盘正确性', () => {
  it('地盘固定为十二地支顺序', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.tianDiPan.diPan).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
  });

  it('天盘是地盘的旋转（月将加时辰）', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 天盘每个位置都应是有效地支
    r.tianDiPan.tianPan.forEach((z) => {
      expect(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']).toContain(z);
    });
    // 天盘应是地盘的某种排列（12 个不同地支）
    expect(new Set(r.tianDiPan.tianPan).size).toBe(12);
  });

  it('月将由节气确定', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 3月15日在惊蛰后春分前 → 月将=亥（登明）
    expect(r.tianDiPan.yueJiang).toBe('亥');
    expect(r.tianDiPan.yueJiangName).toBe('登明');
  });
});

describe('四课正确性', () => {
  it('四课由日干支推演', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const { dayGan, dayZhi, dayGanJiGong } = r.siKe;
    expect(dayGan).toBe(r.basicInfo.dayGanZhi[0]);
    expect(dayZhi).toBe(r.basicInfo.dayGanZhi[1]);
    // 一课下神=日干
    expect(r.siKe.list[0].xiaShen).toBe(dayGan);
    // 三课下神=日支
    expect(r.siKe.list[2].xiaShen).toBe(dayZhi);
  });
});

describe('三传正确性', () => {
  it('格局落在九宗门内', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(['贼克', '比用', '涉害', '遥克', '昴星', '别责', '八专', '伏吟', '返吟']).toContain(r.sanChuan.geJu);
  });

  it('三传六亲落在已知值内', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    ['chuChuan', 'zhongChuan', 'moChuan'].forEach((k) => {
      const c = r.sanChuan[k as 'chuChuan'];
      expect(['父母', '兄弟', '子孙', '妻财', '官鬼']).toContain(c.liuQin);
    });
  });
});

describe('确定性 + Solar 参数化', () => {
  it('同输入确定性可复现', () => {
    const a = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const b = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(a.basicInfo.dayGanZhi).toBe(b.basicInfo.dayGanZhi);
    expect(a.sanChuan.chuChuan.diZhi).toBe(b.sanChuan.chuChuan.diZhi);
    expect(a.sanChuan.geJu).toBe(b.sanChuan.geJu);
  });

  it('不传 solar 走 local-approx', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.mode).toBe('local-approx');
  });

  it('传 solar mock 走 local-exact', () => {
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getDayInGanZhiExact: () => '丁酉',
          getTimeInGanZhiExact: () => '甲辰',
          getJieQiTable: () => ({
            '立春': new Date(2024, 1, 4),
            '雨水': new Date(2024, 1, 19),
            '惊蛰': new Date(2024, 2, 5),
            '春分': new Date(2024, 2, 20),
          }),
        }),
      }),
    };
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, solar: fakeSolar as never });
    expect(r.mode).toBe('local-exact');
    expect(r.basicInfo.dayGanZhi).toBe('丁酉');
    expect(r.basicInfo.hourGanZhi).toBe('甲辰');
    expect(r.tianDiPan.yueJiang).toBe('亥'); // 惊蛰→亥
  });
});

describe('calcDaliurenEnveloped envelope', () => {
  it('返回完整 ToolEnvelope', () => {
    const env: ToolEnvelope = calcDaliurenEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('DaliurenEngine');
    const data = env.data as { sanChuan: { geJu: string }; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.sanChuan.geJu).toBeTruthy();
    expect(data.export_snapshot.summary).toContain('月将');
    expect(data.export_snapshot.sections.some((s) => s.heading === '三传')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '四课')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '天地盘')).toBe(true);
  });
});
