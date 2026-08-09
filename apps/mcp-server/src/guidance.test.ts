import { describe, expect, it } from 'vitest';
import { getToolGuidance, listToolGuidance, validateToolInput, GLOBAL_AGENT_RULES } from './guidance';
import { dispatchIntent } from './dispatch';

/**
 * agent_guidance + wisdom_dispatch 测试。
 * 借鉴 horosa 工程化点 1（参数引导）+ 2（意图路由）。
 */

describe('agent_guidance 参数引导', () => {
  it('getToolGuidance 返回 bazi 完整引导', () => {
    const g = getToolGuidance('bazi_calculate');
    expect(g).not.toBeNull();
    expect(g!.purpose).toContain('八字');
    expect(g!.requiredParams.length).toBeGreaterThan(0);
    expect(g!.requiredParams.some((p) => p.name === 'birth.year')).toBe(true);
    expect(g!.requiredParams.some((p) => p.name === 'birth.gender')).toBe(true);
    expect(g!.workflow).toBeTruthy();
    expect(g!.doNotAssume.length).toBeGreaterThan(0);
  });

  it('未注册工具返回 null', () => {
    expect(getToolGuidance('nonexistent')).toBeNull();
  });

  it('listToolGuidance 返回全部 32 个计算工具摘要', () => {
    const list = listToolGuidance();
    expect(list.length).toBe(32);
    expect(list.some((g) => g.tool === 'combo_marriage')).toBe(true);
    expect(list.some((g) => g.tool === 'cast_cezi')).toBe(true);
    expect(list.some((g) => g.tool === 'list_constitution_questionnaire')).toBe(true);
    list.forEach((g) => {
      expect(g.tool).toMatch(/^[a-z_]+$/);
      expect(g.purpose).toBeTruthy();
    });
  });

  it('GLOBAL_AGENT_RULES 含不得编造生辰与不得模型推演规则', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('不得') && r.includes('生辰'))).toBe(true);
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('MCP') && r.includes('模型知识'))).toBe(true);
  });

  it('GLOBAL_AGENT_RULES 规定 ToolEnvelope 的用户呈现顺序', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('data.timeSource') && r.includes('warnings'))).toBe(true);
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('export_snapshot.summary') && r.includes('evidence'))).toBe(true);
  });

  it('GLOBAL_AGENT_RULES 要求确定性段落保留可复核调用轨迹', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('调用轨迹') && r.includes('tool') && r.includes('version') && r.includes('presentationToken'))).toBe(true);
  });

  it('GLOBAL_AGENT_RULES 限定数值校验仅覆盖结构化 claims', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('numericAssertionToken') && r.includes('validate_numeric_assertions') && r.includes('自由文本'))).toBe(true);
  });

  it('GLOBAL_AGENT_RULES 要求八字确定性断言通过呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('presentationToken') && r.includes('validate_bazi_presentation') && r.includes('claims'))).toBe(true);
  });

  it('GLOBAL_AGENT_RULES 要求紫微确定性断言通过呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('ziwei_chart') && r.includes('validate_ziwei_presentation') && r.includes('claims'))).toBe(true);
    expect(getToolGuidance('ziwei_chart')!.workflow).toContain('validate_ziwei_presentation');
  });

  it('GLOBAL_AGENT_RULES 要求八宅确定性断言通过呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('calc_bazhai') && r.includes('validate_bazhai_presentation') && r.includes('claims'))).toBe(true);
    expect(getToolGuidance('calc_bazhai')!.workflow).toContain('validate_bazhai_presentation');
  });

  it('GLOBAL_AGENT_RULES 要求流年飞星确定性断言通过呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('calc_feixing') && r.includes('validate_feixing_presentation') && r.includes('claims'))).toBe(true);
    expect(getToolGuidance('calc_feixing')!.workflow).toContain('validate_feixing_presentation');
  });

  it('GLOBAL_AGENT_RULES 约束历法与年度盘面呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('calc_yunqi') && r.includes('validate_calendar_presentation') && r.includes('queryDate'))).toBe(true);
    expect(getToolGuidance('calc_yunqi')!.workflow).toContain('validate_calendar_presentation');
    expect(getToolGuidance('xingxiu_daily')!.workflow).toContain('显式传 queryDate');
    expect(getToolGuidance('get_almanac')!.workflow).toContain('显式传 date');
  });

  it('GLOBAL_AGENT_RULES 约束组合养生传统规则呈现校验', () => {
    expect(GLOBAL_AGENT_RULES.some((r) => r.includes('combo_daily_wellness') && r.includes('validate_combo_presentation') && r.includes('传统规则／知识输出一致'))).toBe(true);
    const workflow = getToolGuidance('combo_daily_wellness')!.workflow;
    expect(workflow).toContain('validate_combo_presentation');
    expect(workflow).toContain('传统规则／知识输出一致');
    expect(workflow).toContain('切勿盲目相信');
  });

  it('safeDefaults 不包含默认男', () => {
    const serializedDefaults = JSON.stringify(Object.values(listToolGuidance()).map((item) => getToolGuidance(item.tool)?.safeDefaults));
    expect(serializedDefaults).not.toContain('"gender":"男"');
  });

  it('validateToolInput: bazi 缺时辰、性别和时间来源时返回追问', () => {
    const { missing, prompts } = validateToolInput('bazi_calculate', {
      birth: { year: 1990, month: 6, day: 15 }, // 缺 hour + gender + timeBasis
    });
    expect(missing.length).toBe(3);
    expect(missing.some((m) => m.name === 'birth.hour')).toBe(true);
    expect(missing.some((m) => m.name === 'birth.gender')).toBe(true);
    expect(missing.some((m) => m.name === 'timeBasis')).toBe(true);
    expect(prompts.some((p) => p.includes('时辰'))).toBe(true);
    expect(prompts.some((p) => p.includes('性别'))).toBe(true);
    expect(prompts.some((p) => p.includes('时间来源'))).toBe(true);
  });

  it('validateToolInput: bazi 生辰齐全但未声明时间来源时仍返回追问', () => {
    const { missing, prompts } = validateToolInput('bazi_calculate', {
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
    });
    expect(missing.map((item) => item.name)).toEqual(['timeBasis']);
    expect(prompts.some((p) => p.includes('时间来源'))).toBe(true);
  });

  it('validateToolInput: dream_interpret 缺 keyword 返回追问', () => {
    const { missing } = validateToolInput('dream_interpret', {});
    expect(missing.length).toBe(1);
    expect(missing[0].name).toBe('keyword');
  });
});

describe('wisdom_dispatch 意图路由', () => {
  it('排八字带完整生辰 → 真太阳时预检而非直接排盘', () => {
    const r = dispatchIntent('帮我排个八字，1990年6月15日12时男');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('resolve_true_solar_time');
    const args = r.arguments as { birth: { year: number; month: number; day: number; hour: number; gender: string } };
    expect(args.birth.year).toBe(1990);
    expect(args.birth.month).toBe(6);
    expect(args.birth.day).toBe(15);
    expect(args.birth.hour).toBe(12);
    expect(args.birth.gender).toBe('男');
    expect(r.baziPreflight).toEqual(expect.objectContaining({
      status: 'needs-true-solar-verification',
      civilFallbackExplicitlyConfirmed: false,
    }));
    expect(r.missingPrompts.some((prompt) => prompt.includes('出生地'))).toBe(true);
  });

  it('排八字缺时辰与性别 → 真太阳时预检仍保留出生资料缺口', () => {
    const r = dispatchIntent('算一下八字，1995年3月20日');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('resolve_true_solar_time');
    const args = r.arguments as { birth: { year: number; hour?: number; gender?: string } };
    expect(args.birth.year).toBe(1995);
    expect(args.birth.hour).toBeUndefined();
    expect(args.birth.gender).toBeUndefined();
    expect(r.baziPreflight?.status).toBe('needs-true-solar-verification');
  });

  it('明确按民用时间排八字 → bazi_calculate 降级参数可执行', () => {
    const r = dispatchIntent('帮我按民用时间排八字，1990年6月15日12时男');
    expect(r.tool).toBe('bazi_calculate');
    expect(r.arguments).toMatchObject({
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
    });
    expect(r.baziPreflight).toEqual(expect.objectContaining({
      status: 'civil-fallback-ready',
      civilFallbackExplicitlyConfirmed: true,
    }));
  });

  it('梦见蛇 → dream_interpret', () => {
    const r = dispatchIntent('我梦见蛇是什么意思');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('dream_interpret');
    expect((r.arguments as { keyword: string }).keyword).toBe('蛇');
    expect(r.missingPrompts).toEqual([]);
  });

  it('今日养生 → combo_daily_wellness 提取体质', () => {
    const r = dispatchIntent('我是气虚质，今日养生建议，1990年6月15日12时男');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('combo_daily_wellness');
    const args = r.arguments as { birth: { year: number }; constitution: string };
    expect(args.birth.year).toBe(1990);
    expect(args.constitution).toBe('气虚质');
  });

  it('择吉日 → combo_zeri 提取用途+日期区间', () => {
    const r = dispatchIntent('1990年6月15日12时男，想找个开业的好日子，2026-08-01 到 2026-08-31');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('combo_zeri');
    const args = r.arguments as { birth: { year: number }; purpose: string; startDate: string; endDate: string };
    expect(args.birth.year).toBe(1990);
    expect(args.purpose).toBe('开业');
    expect(args.startDate).toBe('2026-08-01');
    expect(args.endDate).toBe('2026-08-31');
  });

  it('择吉日 仅给月份 → 自动展开为整月区间', () => {
    const r = dispatchIntent('1990年6月15日12时男，2026年8月搬家择吉日');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('combo_zeri');
    const args = r.arguments as { purpose: string; startDate: string; endDate: string };
    expect(args.purpose).toBe('搬家');
    expect(args.startDate).toBe('2026-08-01');
    expect(args.endDate).toBe('2026-08-31');
  });

  it('月度运势 → combo_monthly_fortune 提取年份+月份', () => {
    const r = dispatchIntent('1990年6月15日12时男，看2026年8月月度运势');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('combo_monthly_fortune');
    const args = r.arguments as { birth: { year: number }; targetYear: number; targetMonth: number };
    expect(args.birth.year).toBe(1990);
    expect(args.targetYear).toBe(2026);
    expect(args.targetMonth).toBe(8);
  });

  it('紫微排盘 → ziwei_chart', () => {
    const r = dispatchIntent('帮我看紫微命盘，1988年10月5日8时女');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('ziwei_chart');
    const args = r.arguments as { birth: { year: number; gender: string; hour: number } };
    expect(args.birth.year).toBe(1988);
    expect(args.birth.gender).toBe('女');
    expect(args.birth.hour).toBe(8);
  });

  it('姓名打分 → analyze_name 提取姓+名', () => {
    const r = dispatchIntent('张伟这个名字打多少分，1990年出生');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('analyze_name');
    const args = r.arguments as { surname: string; givenName: string; birthYear?: number };
    expect(args.surname).toBe('张');
    expect(args.givenName).toBe('伟');
    expect(args.birthYear).toBe(1990);
  });

  it('奇门遁甲 → arrange_qimen', () => {
    const r = dispatchIntent('帮我起个奇门局，2024年3月15日9时');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('arrange_qimen');
  });

  it('大六壬 → liuren_calculate', () => {
    const r = dispatchIntent('用大六壬排个盘，2024年3月15日9时');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('liuren_calculate');
  });

  it('六爻问财运 → cast_liuyao + question 提取', () => {
    const r = dispatchIntent('用六爻测一下今年财运，1990年6月15日12时男');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('cast_liuyao');
    const args = r.arguments as { question?: string; birth: { gender: string } };
    expect(args.birth.gender).toBe('男');
    expect(args.question).toBeTruthy();
  });

  it('五运六气 → calc_yunqi 提取年份', () => {
    const r = dispatchIntent('2024年五运六气怎么样');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('calc_yunqi');
    expect((r.arguments as { year: number }).year).toBe(2024);
  });

  it('无关文本 → 未命中', () => {
    const r = dispatchIntent('今天天气真好');
    expect(r.hit).toBe(false);
    expect(r.tool).toBeNull();
    expect(r.reason).toContain('未匹配');
  });

  it('优先级：同时含八字与解梦关键词时按优先级选 dream_interpret', () => {
    // dream priority 90 > bazi 50
    const r = dispatchIntent('梦见算命先生给我排八字');
    expect(r.tool).toBe('dream_interpret');
  });

  it('combo: "综合运势" → combo_annual_fortune', () => {
    const r = dispatchIntent('帮我看1990年6月15日12时男今年的综合运势');
    expect(r.hit).toBe(true);
    expect(r.tool).toBe('combo_annual_fortune');
    const args = r.arguments as { birth: { year: number } };
    expect(args.birth.year).toBe(1990);
  });

  it('combo: "三卜交叉验证" → combo_decision', () => {
    const r = dispatchIntent('用三卜交叉验证一下我该不该换工作，1990年6月15日12时男');
    expect(r.tool).toBe('combo_decision');
    const args = r.arguments as { question?: string };
    expect(args.question).toBeTruthy();
  });

  it('combo: "风水布局" → combo_space_time', () => {
    const r = dispatchIntent('帮我看1990年6月15日12时男的风水布局');
    expect(r.tool).toBe('combo_space_time');
  });

  it('combo: "三式互参" → combo_sanshi', () => {
    const r = dispatchIntent('用三式互参看某事能否成功，1990年6月15日12时男');
    expect(r.tool).toBe('combo_sanshi');
  });

  it('taiyi: "太乙神数" → taiyi_calculate', () => {
    const r = dispatchIntent('用太乙神数排盘看2024年3月15日9时某事吉凶');
    expect(r.tool).toBe('taiyi_calculate');
  });

  it('huangji: "皇极经世" → huangji_calculate', () => {
    const r = dispatchIntent('用皇极经世看1990年6月15日12时的元会运世周期');
    expect(r.tool).toBe('huangji_calculate');
  });

  it('combo: "三式合一" → combo_sanshi_classic', () => {
    const r = dispatchIntent('用奇门太乙大六壬三式合一看某事，1990年6月15日12时男');
    expect(r.tool).toBe('combo_sanshi_classic');
  });
});
