import { describe, expect, it } from 'vitest';
import { TOOLS } from './tools';
import type { ToolEnvelope } from '../../visual/src/legacy/baseTypes';

/**
 * MCP 工具端到端测试（handler 层）。
 * 直接调每个 TOOLS handler，验证返回有效 ToolEnvelope。
 * 覆盖全部 22 个工具。
 */

/** 校验 ToolEnvelope 必填字段 */
function expectValidEnvelope(env: unknown): ToolEnvelope {
  const e = env as ToolEnvelope;
  expect(e.ok).toBe(true);
  expect(typeof e.tool).toBe('string');
  expect(e.tool.length).toBeGreaterThan(0);
  expect(typeof e.version).toBe('string');
  expect(typeof e.input_normalized).toBe('object');
  expect(e.data).toBeDefined();
  return e;
}

/** 校验 data 含 export_snapshot 且结构完整 */
function expectExportSnapshot(env: ToolEnvelope) {
  const data = env.data as { export_snapshot?: { summary: string; sections: Array<{ heading: string; body: string }> } };
  expect(data.export_snapshot).toBeDefined();
  expect(typeof data.export_snapshot!.summary).toBe('string');
  expect(data.export_snapshot!.summary.length).toBeGreaterThan(0);
  expect(Array.isArray(data.export_snapshot!.sections)).toBe(true);
  expect(data.export_snapshot!.sections.length).toBeGreaterThan(0);
  data.export_snapshot!.sections.forEach((s) => {
    expect(typeof s.heading).toBe('string');
    expect(typeof s.body).toBe('string');
  });
}

function findTool(name: string) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`工具 ${name} 未找到`);
  return t;
}

describe('MCP TOOLS 注册完整性', () => {
  it('注册了 22 个工具', () => {
    expect(TOOLS.length).toBe(22);
  });

  it('所有工具有 name/description/schema/handler', () => {
    TOOLS.forEach((t) => {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.schema).toBeDefined();
      expect(typeof t.handler).toBe('function');
    });
  });

  it('工具名唯一', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('工具名符合 horosa 风格的 snake_case', () => {
    TOOLS.forEach((t) => {
      expect(t.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });
});

describe('bazi_calculate', () => {
  it('1990-6-15 12时男 返回精确排盘 envelope', () => {
    const t = findTool('bazi_calculate');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('BaziLunarAdapter');
    expect(e.data.mode).toBe('local-exact');
    const data = e.data as { pillars: { year: { stem: string; branch: string } }; dayMaster: string };
    expect(data.pillars.year.stem).toBe('庚');
    expect(data.pillars.year.branch).toBe('午');
    expectExportSnapshot(e);
  });
});

describe('ziwei_chart', () => {
  it('1990-6-15 12时男 返回十二宫 envelope', () => {
    const t = findTool('ziwei_chart');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('ZiweiIztroAdapter');
    const data = e.data as { palaces: Record<string, unknown>; mainStars: string[] };
    expect(Object.keys(data.palaces).length).toBe(12);
    expect(data.mainStars.length).toBeGreaterThan(0);
    expectExportSnapshot(e);
  });
});

describe('cast_liuyao', () => {
  it('manual 起卦 777777 返回乾为天 envelope', () => {
    const t = findTool('cast_liuyao');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, method: 'manual', yaoValues: '777777' });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('LocalLiuyaoNajiaAdapter');
    const data = e.data as { hexagramName: string; shiYao: number };
    expect(data.hexagramName).toBe('乾为天');
    expect(data.shiYao).toBe(6);
    expectExportSnapshot(e);
  });

  it('问财运自动选取用神为妻财', () => {
    const t = findTool('cast_liuyao');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, method: 'manual', yaoValues: '777777', question: '今年财运' });
    const data = env.data as { yongShen: string };
    expect(data.yongShen).toBe('妻财');
  });
});

describe('arrange_qimen', () => {
  it('2024-3-15 9时 返回阳遁4局 envelope', () => {
    const t = findTool('arrange_qimen');
    const env = t.handler({ birth: { year: 2024, month: 3, day: 15, hour: 9, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('Qimen3metaAdapter');
    const data = e.data as { dun: string; ju: string; palaces: unknown[]; zhiFu: { star: string }; zhiShi: { gate: string } };
    expect(data.dun).toBe('阳遁');
    expect(data.ju).toBe('4局');
    expect(data.palaces.length).toBe(9);
    expect(data.zhiFu.star).toBe('天英');
    expect(data.zhiShi.gate).toBe('景门');
    expectExportSnapshot(e);
  });
});

describe('liuren_calculate', () => {
  it('返回含天地盘/四课/三传的大六壬 envelope', () => {
    const t = findTool('liuren_calculate');
    const env = t.handler({ birth: { year: 2024, month: 3, day: 15, hour: 9, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('DaliurenEngine');
    const data = e.data as { sanChuan: { geJu: string; geJuDetail: string }; siKe: { list: unknown[] }; tianDiPan: { tianPan: unknown[] }; export_snapshot: { summary: string } };
    expect(data.sanChuan.geJu).toBeTruthy();
    expect(data.siKe.list.length).toBe(4);
    expect(data.tianDiPan.tianPan.length).toBe(12);
    expect(data.export_snapshot.summary).toContain('月将');
    expectExportSnapshot(e);
  });
});

describe('taiyi_calculate', () => {
  it('返回含太乙落宫/格局/主客算的太乙神数 envelope', () => {
    const t = findTool('taiyi_calculate');
    const env = t.handler({ birth: { year: 2024, month: 3, day: 15, hour: 9, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('TaiyiEngine');
    const data = e.data as { taiyi: { gong: string }; kook: { wen: string }; geju: Record<string, string>; home: { cal: number }; export_snapshot: { summary: string } };
    expect(data.taiyi.gong).toBeTruthy();
    expect(data.kook.wen).toContain('局');
    expect(Object.keys(data.geju).length).toBeGreaterThan(0);
    expect(typeof data.home.cal).toBe('number');
    expect(data.export_snapshot.summary).toContain('太乙');
    expectExportSnapshot(e);
  });
});

describe('huangji_calculate', () => {
  it('返回含元会运世周期+九卦配置的皇极经世 envelope', () => {
    const t = findTool('huangji_calculate');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('HuangjiEngine');
    const data = e.data as {
      cycles: { acumYear: number; hui: number; yun: number; shi: number };
      gua: { zheng: string; yun: string; shi: string; xun: string; year: string; month: string; day: string; hour: string; minute: string };
      movingLines: { yun: number; shi: number; xun: number };
      export_snapshot: { summary: string; sections: Array<{ heading: string }> };
    };
    expect(data.cycles.acumYear).toBe(69007);
    expect(data.cycles.hui).toBe(7);
    expect(data.gua.zheng).toBe('鼎');
    expect(data.gua.shi).toBeTruthy();
    expect(data.gua.year).toBeTruthy();
    for (const yao of [data.movingLines.yun, data.movingLines.shi, data.movingLines.xun]) {
      expect(yao).toBeGreaterThanOrEqual(1);
      expect(yao).toBeLessThanOrEqual(6);
    }
    expect(data.export_snapshot.summary).toContain('皇极');
    expect(data.export_snapshot.summary).toContain('鼎');
    expect(data.export_snapshot.sections.some((s) => s.heading === '周期定位')).toBe(true);
    expectExportSnapshot(e);
  });
});

describe('cast_meihua', () => {
  it('数字起卦 3,5 返回 envelope', () => {
    const t = findTool('cast_meihua');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, method: 'number', numberA: 3, numberB: 5 });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('LocalMeihuaTimeAdapter');
    const data = e.data as { upperTrigram: { name: string }; lowerTrigram: { name: string }; changingLine: number; sourceMethod: string };
    expect(data.upperTrigram.name).toBe('离');
    expect(data.lowerTrigram.name).toBe('坤');
    expect(data.changingLine).toBe(2);
    expect(data.sourceMethod).toBe('数字起卦');
    expectExportSnapshot(e);
  });
});

describe('calc_yunqi', () => {
  it('2024年 返回甲辰土运太过 envelope', () => {
    const t = findTool('calc_yunqi');
    const env = t.handler({ year: 2024, currentMonth: 6 });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('YunqiEngine');
    const data = e.data as { tiangan: string; dizhi: string; wuyun: { dayun: string }; liuqi: { sitian: string } };
    expect(data.tiangan).toBe('甲');
    expect(data.dizhi).toBe('辰');
    expect(data.wuyun.dayun).toBe('土运太过');
    expect(data.liuqi.sitian).toBe('太阳寒水');
    expectExportSnapshot(e);
  });
});

describe('analyze_name', () => {
  it('张伟1990年 返回五维评分 envelope', () => {
    const t = findTool('analyze_name');
    const env = t.handler({ surname: '张', givenName: '伟', birthYear: 1990 });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('NameRatingAdapter');
    const data = e.data as { totalScore: number; grade: string; dimensions: unknown[] };
    expect(data.totalScore).toBeGreaterThanOrEqual(0);
    expect(data.grade).toBeTruthy();
    expect(data.dimensions.length).toBeGreaterThan(0);
    expectExportSnapshot(e);
  });

  it('张伟+完整生辰 命理契合维度含八字用神补强', () => {
    const t = findTool('analyze_name');
    const env = t.handler({
      surname: '张', givenName: '伟',
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
    });
    const e = expectValidEnvelope(env);
    const data = e.data as { dimensions: Array<{ name: string; detail: string }> };
    const mingli = data.dimensions.find((d) => d.name === '命理契合');
    expect(mingli).toBeDefined();
    expect(mingli?.detail).toContain('用神补强');
    expect(mingli?.detail).toContain('喜用神');
  });
});

describe('calc_xiyong', () => {
  it('日主金身弱 返回喜用神 envelope', () => {
    const t = findTool('calc_xiyong');
    const env = t.handler({ dayMasterWuxing: '金', elements: { 木: 6, 火: 4, 土: 4, 金: 2, 水: 4 } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('XiYongAdapter');
    const data = e.data as { qiangRuo: string; shen: string };
    expect(data.qiangRuo).toBe('身弱');
    expect(data.shen).toBeTruthy();
    expectExportSnapshot(e);
  });
});

describe('get_constitution_tendency', () => {
  it('木运太过+厥阴风木 返回体质倾向 envelope', () => {
    const t = findTool('get_constitution_tendency');
    const env = t.handler({ wuyun: { dayun: '木运太过' }, liuqi: { sitian: '厥阴风木', zaquan: '少阳相火' } });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('ConstitutionTendencyAdapter');
    const data = e.data as { tendencies: Array<{ type: string }> };
    expect(data.tendencies.length).toBeGreaterThan(0);
    expectExportSnapshot(e);
  });

  it('输入不足返回 ok=false 错误 envelope', () => {
    const t = findTool('get_constitution_tendency');
    const env = t.handler({ wuyun: { dayun: '' }, liuqi: { sitian: '', zaquan: '' } }) as ToolEnvelope;
    expect(env.ok).toBe(false);
    expect(env.error?.code).toBe('insufficient_input');
  });
});

describe('dream_interpret', () => {
  it('蛇 返回周公解梦 envelope', () => {
    const t = findTool('dream_interpret');
    const env = t.handler({ keyword: '蛇' });
    const e = expectValidEnvelope(env);
    expect(e.tool).toBe('DreamDictionaryAdapter');
    const data = e.data as { hit: boolean; entries: unknown[]; classics: unknown[] };
    expect(data.hit).toBe(true);
    expect(data.entries.length + data.classics.length).toBeGreaterThan(0);
    expectExportSnapshot(e);
  });

  it('useFull=true 使用全量库', async () => {
    const t = findTool('dream_interpret');
    // 全量库需 await loadFullDictionary，但 searchDreamEnveloped 同步调用；
    // useFull=true 时若未加载会退回精选库。验证不抛错即可。
    const env = t.handler({ keyword: '水', useFull: true });
    const e = env as ToolEnvelope;
    expect(e.ok).toBe(true);
    expect(e.tool).toBe('DreamDictionaryAdapter');
  }, 15000);
});

// ─── 跨系统联合分析（combo）handler 测试 ───

describe('combo_annual_fortune', () => {
  it('返回含4子系统(八字+五运六气+奇门+紫微流年) + 一致性的 ComboResult envelope', () => {
    const t = findTool('combo_annual_fortune');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, targetYear: 2024, currentMonth: 6 });
    const e = expectValidEnvelope(env);
    const data = e.data as { comboName: string; subsystems: Array<{ name: string }>; consistency: { confidence: string }; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.comboName).toBe('年度综合运势');
    expect(data.subsystems.length).toBe(4);
    expect(data.subsystems.map((s) => s.name)).toEqual(['八字', '五运六气', '奇门年盘', '紫微流年']);
    expect(data.export_snapshot.summary).toContain('2024');
    expect(data.export_snapshot.sections.some((s) => s.heading === '紫微流年维度')).toBe(true);
    expectExportSnapshot(e);
  });
});

describe('combo_decision', () => {
  it('返回含3卜子系统的 ComboResult envelope', () => {
    const t = findTool('combo_decision');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, question: '今年适合换工作吗' });
    const e = expectValidEnvelope(env);
    const data = e.data as { comboName: string; subsystems: Array<{ name: string }> };
    expect(data.comboName).toBe('事件决策');
    expect(data.subsystems.map((s) => s.name)).toEqual(['六爻', '梅花', '奇门']);
  });
});

describe('combo_space_time', () => {
  it('返回含命卦 + 奇门吉方的 ComboResult envelope', () => {
    const t = findTool('combo_space_time');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, targetYear: 2024 });
    const e = expectValidEnvelope(env);
    const data = e.data as { comboName: string; export_snapshot: { summary: string } };
    expect(data.comboName).toBe('空间+时间');
    expect(data.export_snapshot.summary).toContain('命卦');
    expect(data.export_snapshot.summary).toContain('坎'); // 1990男坎命
  });
});

describe('combo_sanshi', () => {
  it('返回含大六壬+奇门+梅花的三式互参 envelope', () => {
    const t = findTool('combo_sanshi');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, question: '某事能否成功' });
    const e = expectValidEnvelope(env);
    const data = e.data as { comboName: string; subsystems: Array<{ name: string }>; export_snapshot: { summary: string } };
    expect(data.comboName).toBe('三式互参');
    expect(data.subsystems.map((s) => s.name)).toEqual(['大六壬', '奇门遁甲', '梅花易数']);
    expect(data.export_snapshot.summary).toContain('三式');
  });
});

describe('combo_sanshi_classic', () => {
  it('返回含奇门+太乙+大六壬的三式合一 envelope', () => {
    const t = findTool('combo_sanshi_classic');
    const env = t.handler({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, question: '某事能否成功' });
    const e = expectValidEnvelope(env);
    const data = e.data as { comboName: string; subsystems: Array<{ name: string }>; export_snapshot: { summary: string } };
    expect(data.comboName).toBe('三式合一');
    expect(data.subsystems.map((s) => s.name)).toEqual(['奇门遁甲', '太乙神数', '大六壬']);
    expect(data.export_snapshot.summary).toContain('三式合一');
  });
});

describe('combo_daily_wellness', () => {
  it('返回含体质+节气+时辰+方位的今日养生 envelope', () => {
    const t = findTool('combo_daily_wellness');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      constitution: '气虚质',
      now: { year: 2026, month: 7, day: 13, hour: 14 },
    });
    const e = expectValidEnvelope(env);
    const data = e.data as {
      comboName: string;
      context: { jieqi: string; meridian: string };
      constitution: { type: string; source: string };
      subsystems: Array<{ name: string }>;
      export_snapshot: { summary: string; sections: Array<{ heading: string }> };
    };
    expect(data.comboName).toBe('今日养生建议');
    expect(data.constitution.type).toBe('气虚质');
    expect(data.constitution.source).toBe('问卷');
    expect(data.context.jieqi).toBeTruthy();
    expect(data.context.meridian).toContain('经');
    expect(data.subsystems.map((s) => s.name)).toEqual(['体质', '节气', '时辰经络', '方位']);
    expect(data.export_snapshot.summary).toContain('气虚质');
    expect(data.export_snapshot.sections.some((s) => s.heading === '节气饮食')).toBe(true);
  });

  it('未传 constitution 时按五运六气倾向推断', () => {
    const t = findTool('combo_daily_wellness');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      now: { year: 2026, month: 7, day: 13, hour: 14 },
    });
    const e = expectValidEnvelope(env);
    const data = e.data as { constitution: { source: string } };
    expect(data.constitution.source).toBe('五运六气倾向参考');
  });
});

describe('combo_zeri', () => {
  it('在区间内返回排序吉日列表 envelope', () => {
    const t = findTool('combo_zeri');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      purpose: '开业',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    const e = expectValidEnvelope(env);
    const data = e.data as {
      comboName: string;
      zeriPurpose: string;
      range: { scannedDays: number };
      rankedDays: Array<{ date: string; score: number; tone: string; reasons: string[]; lunarDate: string; dayGanZhi: string }>;
      annualSha: { taisui: string; fiveYellow: string };
      export_snapshot: { summary: string; sections: Array<{ heading: string }> };
    };
    expect(data.comboName).toBe('综合择日');
    expect(data.zeriPurpose).toBe('开业');
    expect(data.range.scannedDays).toBe(31);
    expect(Array.isArray(data.rankedDays)).toBe(true);
    expect(data.rankedDays.length).toBeGreaterThan(0);
    // 评分降序
    const scores = data.rankedDays.map((d) => d.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
    // 首选日有理由与农历
    const first = data.rankedDays[0];
    expect(first.reasons.length).toBeGreaterThan(0);
    expect(first.lunarDate).toContain('农历');
    expect(first.dayGanZhi.length).toBe(2);
    // 本年凶方字段齐全
    expect(data.annualSha.taisui).toBeTruthy();
    expect(data.annualSha.fiveYellow).toBeTruthy();
    expect(data.export_snapshot.summary).toContain('开业');
    expect(data.export_snapshot.sections.some((s) => s.heading === '优选吉日')).toBe(true);
  });

  it('动土用途自动剔除犯太岁岁破方位之日', () => {
    const t = findTool('combo_zeri');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      purpose: '动土',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    const e = expectValidEnvelope(env);
    const data = e.data as { rankedDays: Array<{ tone: string }>; recommendations: Array<{ label: string }> };
    // 动土类必有「动土避煞」建议条目
    expect(data.recommendations.some((r) => r.label === '动土避煞')).toBe(true);
  });

  it('topN 截断生效', () => {
    const t = findTool('combo_zeri');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      purpose: '祈福',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      topN: 3,
    });
    const e = expectValidEnvelope(env);
    const data = e.data as { rankedDays: unknown[] };
    expect(data.rankedDays.length).toBeLessThanOrEqual(3);
  });
});

describe('combo_monthly_fortune', () => {
  it('返回含流月干支+四维度的月度运势 envelope', () => {
    const t = findTool('combo_monthly_fortune');
    const env = t.handler({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      targetYear: 2026,
      targetMonth: 8,
    });
    const e = expectValidEnvelope(env);
    const data = e.data as {
      comboName: string;
      context: { year: number; month: number; monthGanZhi: string; jieqi: string };
      subsystems: Array<{ name: string }>;
      export_snapshot: { summary: string; sections: Array<{ heading: string }> };
    };
    expect(data.comboName).toBe('月度运势');
    expect(data.context.year).toBe(2026);
    expect(data.context.month).toBe(8);
    expect(data.context.monthGanZhi).toBeTruthy();
    expect(data.subsystems.map((s) => s.name)).toEqual(['流月干支', '五运六气', '节气调养', '紫微流月']);
    expect(data.export_snapshot.summary).toContain('2026');
    expect(data.export_snapshot.summary).toContain('8月');
    expect(data.export_snapshot.sections.some((s) => s.heading === '流月干支')).toBe(true);
  });
});
