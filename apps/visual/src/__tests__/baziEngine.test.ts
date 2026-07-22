import { describe, expect, it } from 'vitest';
import { calculateBazi, calcBaziEnveloped } from '@/legacy/baziEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';
import { calcShenSha } from '@/legacy/shensha';
import type { ShenShaItem } from '@/legacy/shensha';

/**
 * 八字纯 TS 引擎测试（C 类迁移第四步）。
 * 与旧 BaziEngine.calculate / BaziLunarAdapter 同输入对照。
 */

describe('calculateBazi 本地近似路径（无 solar）', () => {
  it('1990-6-15 12时男：年柱庚午（与旧引擎一致）', () => {
    // (1990-4)%10=6→庚，(1990-4)%12=6→午
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.pillars.year.stem).toBe('庚');
    expect(r.pillars.year.branch).toBe('午');
    expect(r.dayMaster).toBe(r.pillars.day.stem);
    expect(r.mode).toBe('local-approx');
    expect(r.engineName).toBe('BaziEngine');
  });

  it('立春前用上年年柱（1月属于上年干支）', () => {
    // 1990-1-15 在立春(2-4)前 → 年柱用 1989 = 己巳
    // (1989-4)%10=5→己, (1989-4)%12=1985%12=5→巳
    const r = calculateBazi({ birth: { year: 1990, month: 1, day: 15, hour: 12, gender: '男' } });
    expect(r.pillars.year.stem).toBe('己');
    expect(r.pillars.year.branch).toBe('巳');
  });

  it('五行统计含茎2+支2+藏干1权重，5 个五行键齐全', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.elements).toHaveProperty('木');
    expect(r.elements).toHaveProperty('火');
    expect(r.elements).toHaveProperty('土');
    expect(r.elements).toHaveProperty('金');
    expect(r.elements).toHaveProperty('水');
    const total = Object.values(r.elements).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('十神按日干与各柱天干定，落在十神名内', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const valid = ['比肩', '劫财', '偏印', '正印', '食神', '伤官', '偏财', '正财', '七杀', '正官'];
    (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
      expect(valid).toContain(r.shishenList[k]);
    });
    // 日柱十神为比肩（日干对自身）
    expect(r.shishenList.day).toBe('比肩');
  });

  it('大运 8 步，3 岁起运，顺逆按年干阴阳+性别', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.luck.length).toBe(8);
    expect(r.luck[0].ageStart).toBe(3);
    expect(r.luck[1].ageStart).toBe(13);
    // 庚午年：庚=阳干(index6偶) → 男顺行
    expect(r.luck[0].stem).toBeTruthy();
  });

  it('藏干表齐全（每地支有藏干）', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
      expect(r.hiddenStems[k].length).toBeGreaterThan(0);
    });
  });

  it('子时 23:00+ 日柱用次日', () => {
    const r22 = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 22, gender: '男' } });
    const r23 = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 23, gender: '男' } });
    // 23 时日柱应为次日，与 22 时不同
    const d22 = r22.pillars.day.stem + r22.pillars.day.branch;
    const d23 = r23.pillars.day.stem + r23.pillars.day.branch;
    expect(d22).not.toBe(d23);
  });
});

describe('calculateBazi 精确路径（传 solar mock）', () => {
  it('传入 solar 走 local-exact，用 lunar 八字干支', () => {
    // mock solar：返回固定八字 丙午 辛卯 丁酉 辛亥（对应 engine-adapters 测试口径）
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getEightChar: () => ({
            getYear: () => '丙午',
            getMonth: () => '辛卯',
            getDay: () => '丁酉',
            getHour: () => '辛亥',
          }),
        }),
      }),
    };
    const r = calculateBazi({ birth: { year: 2026, month: 4, day: 4, hour: 21, gender: '男' }, solar: fakeSolar as never });
    expect(r.mode).toBe('local-exact');
    expect(r.engineName).toBe('BaziLunarAdapter');
    expect(r.pillars.year.stem).toBe('丙');
    expect(r.pillars.year.branch).toBe('午');
    expect(r.pillars.month.stem).toBe('辛');
    expect(r.pillars.day.stem).toBe('丁');
    expect(r.pillars.hour.stem).toBe('辛');
    expect(r.calendar?.provider).toBe('lunar-javascript');
  });

  it('solar 抛错时降级 local-approx', () => {
    const badSolar = { fromYmd: () => { throw new Error('boom'); } };
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, solar: badSolar as never });
    expect(r.mode).toBe('local-approx');
  });
});

describe('calcShenSha 神煞推算（甲日干 · 午日支 · 年支子 fixture）', () => {
  const fixture = {
    year: { stem: '甲', branch: '子' },
    month: { stem: '丙', branch: '寅' },
    day: { stem: '甲', branch: '午' },
    hour: { stem: '庚', branch: '申' },
  };
  it('默认年支查：禄神(寅·月)、驿马(寅·月)、将星(子·年)、月德贵人(丙·月)', () => {
    // 年支子 → 三合申子辰 → 将星子、驿马寅、华盖辰、桃花酉
    const ss = calcShenSha(fixture);
    const names = ss.map((s) => s.name);
    expect(names).toContain('禄神');
    expect(names).toContain('驿马');
    expect(names).toContain('将星');
    expect(names).toContain('月德贵人');
    expect(ss.find((s) => s.name === '将星')?.pillar).toBe('年');
    expect(ss.find((s) => s.name === '驿马')?.pillar).toBe('月');
    expect(ss.find((s) => s.name === '禄神')?.pillar).toBe('月');
  });
  it('日支查口径：将星(午·日)、驿马(申·时)', () => {
    // 日支午 → 三合寅午戌 → 将星午、驿马申、华盖戌、桃花卯
    const ss = calcShenSha(fixture, 'day');
    expect(ss.find((s) => s.name === '将星')?.pillar).toBe('日');
    expect(ss.find((s) => s.name === '驿马')?.pillar).toBe('时');
  });
  it('年支查与日支查将星落柱不同（口径切换有效）', () => {
    const yearBased = calcShenSha(fixture, 'year');
    const dayBased = calcShenSha(fixture, 'day');
    expect(yearBased.find((s) => s.name === '将星')?.pillar).toBe('年');
    expect(dayBased.find((s) => s.name === '将星')?.pillar).toBe('日');
  });
  it('甲午日柱不计魁罡，庚戌等四日才计', () => {
    expect(calcShenSha(fixture).some((s) => s.name === '魁罡')).toBe(false);
    const kg = calcShenSha({
      year: { stem: '庚', branch: '子' },
      month: { stem: '庚', branch: '寅' },
      day: { stem: '庚', branch: '戌' },
      hour: { stem: '庚', branch: '子' },
    });
    expect(kg.some((s) => s.name === '魁罡')).toBe(true);
  });
});

describe('calcBaziEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('BaziEngine');
    const data = env.data as { dayMaster: string; pillars: { year: { stem: string } }; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.pillars.year.stem).toBe('庚');
    expect(data.export_snapshot.summary).toContain('日主');
    expect(data.export_snapshot.sections.some((s) => s.heading === '四柱')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '大运')).toBe(true);
    const full = env.data as { shenSha?: ShenShaItem[]; export_snapshot: { sections: Array<{ heading: string }> } };
    expect(Array.isArray(full.shenSha)).toBe(true);
    expect(full.export_snapshot.sections.some((s) => s.heading === '神煞')).toBe(true);
  });

  it('近似模式带节气近似 warning', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.warnings?.some((w) => w.includes('节气近似'))).toBe(true);
  });
});
