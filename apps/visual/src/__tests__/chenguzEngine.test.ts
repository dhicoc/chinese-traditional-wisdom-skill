import { describe, it, expect } from 'vitest';
import { calcChenguz, calcChenguzEnveloped } from '@/legacy/chenguzEngine';

// 1990-06-15 12:00 男（公历）→ 农历 1990 五月廿三，年支午，时支午
const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' };

describe('calcChenguz 称骨', () => {
  it('返回 ok=true 的 ToolEnvelope', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('calc_chenguz');
    expect(env.data).toBeTruthy();
  });

  it('四柱骨重均非负', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    expect(r.yearBone.weight.liang * 10 + r.yearBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.monthBone.weight.liang * 10 + r.monthBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.dayBone.weight.liang * 10 + r.dayBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.hourBone.weight.liang * 10 + r.hourBone.weight.qian).toBeGreaterThanOrEqual(0);
  });

  it('总重 = 四柱骨重之和', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    const sumQ = r.yearBone.weight.liang * 10 + r.yearBone.weight.qian
      + r.monthBone.weight.liang * 10 + r.monthBone.weight.qian
      + r.dayBone.weight.liang * 10 + r.dayBone.weight.qian
      + r.hourBone.weight.liang * 10 + r.hourBone.weight.qian;
    const totalQ = r.total.liang * 10 + r.total.qian;
    expect(totalQ).toBe(sumQ);
  });

  it('totalText 含「两」', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.totalText).toContain('两');
  });

  it('称骨歌命中总重', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    const totalQ = r.total.liang * 10 + r.total.qian;
    // 总重应在称骨歌覆盖范围 21-71
    expect(totalQ).toBeGreaterThanOrEqual(21);
    expect(totalQ).toBeLessThanOrEqual(71);
    expect(r.song).toBeTruthy();
    expect(r.song.length).toBeGreaterThan(5);
  });

  it('tone 在吉/中/凶之一', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(['吉', '中', '凶']).toContain(env.data.tone);
  });

  it('年骨重按年支查表', () => {
    const env = calcChenguz({ birth: BIRTH });
    // 1990 年支午 → 1两9钱
    expect(env.data.yearBone.branch).toBe('午');
    expect(env.data.yearBone.weight.liang).toBe(1);
    expect(env.data.yearBone.weight.qian).toBe(9);
  });

  it('synthesis 含总重与称骨歌', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.synthesis).toContain(env.data.totalText);
    expect(env.data.synthesis).toContain(env.data.song.slice(0, 4));
  });

  it('export_snapshot 含四柱骨重/总重/称骨歌三段', () => {
    const env = calcChenguz({ birth: BIRTH });
    const sections = env.data.export_snapshot.sections;
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.some((s) => s.heading === '四柱骨重')).toBe(true);
    expect(sections.some((s) => s.heading === '称骨歌')).toBe(true);
  });

  it('interpretation 非空', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.interpretation).toBeTruthy();
    expect(env.data.interpretation).toContain(env.data.totalText);
  });
});

describe('calcChenguzEnveloped', () => {
  it('与 calcChenguz 一致', () => {
    const a = calcChenguz({ birth: BIRTH });
    const b = calcChenguzEnveloped({ birth: BIRTH });
    expect(b.ok).toBe(true);
    expect(b.data.totalText).toBe(a.data.totalText);
  });
});
