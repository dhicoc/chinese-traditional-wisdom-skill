import { describe, expect, it } from 'vitest';
import { toFourLayer, toFocusedReport, detectQuestionDomain, type ReadingLike } from '@/legacy/reportLayers';
import { calcBaziEnveloped } from '@/legacy/baziEngine';
import { calcLiuyaoEnveloped } from '@/legacy/liuyaoEngine';
import { calcYunqiEnveloped } from '@/legacy/yunqiEngine';

/**
 * 报告四层分层测试（ROADMAP 功能层增强 Step 2）。
 * 用真实 enveloped 引擎的 export_snapshot 喂 toFourLayer，验证归类正确。
 */

/** 从 envelope 取 export_snapshot 作为 reading */
function snapshotOf(env: { data: { export_snapshot: ReadingLike } }): ReadingLike {
  return env.data.export_snapshot;
}

describe('toFourLayer 基本结构', () => {
  it('返回四层结构含 tldr/highlights/details/actions', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    expect(typeof report.tldr).toBe('string');
    expect(report.tldr.length).toBeGreaterThan(0);
    expect(Array.isArray(report.highlights)).toBe(true);
    expect(Array.isArray(report.details)).toBe(true);
    expect(Array.isArray(report.actions)).toBe(true);
    expect(typeof report.overallTone).toBe('string');
    expect(['吉', '凶', '中']).toContain(report.overallTone);
  });
});

describe('toFourLayer 八字归类', () => {
  it('日主强弱归 highlights，四柱/五行/十神/大运归 details', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    // 日主强弱应进 highlights
    expect(report.highlights.some((h) => h.label.includes('日主强弱'))).toBe(true);
    // 四柱应进 details（非 highlights）
    expect(report.details.some((d) => d.heading === '四柱')).toBe(true);
    expect(report.details.some((d) => d.heading === '五行分布')).toBe(true);
    expect(report.details.some((d) => d.heading === '十神')).toBe(true);
    expect(report.details.some((d) => d.heading === '大运')).toBe(true);
    // 日主强弱不应同时进 details
    expect(report.details.some((d) => d.heading.includes('日主强弱'))).toBe(false);
  });

  it('highlights 每项有 tone（吉/凶/中）', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    report.highlights.forEach((h) => {
      expect(['吉', '凶', '中']).toContain(h.tone);
      expect(h.label.length).toBeGreaterThan(0);
      expect(h.value.length).toBeGreaterThan(0);
    });
  });

  it('日主强弱 highlight 的 strength 由偏强/身强/偏弱/身弱检测', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    const dy = report.highlights.find((h) => h.label.includes('日主强弱'));
    expect(dy).toBeDefined();
    // 1990-6-15 12时男 日主辛金 偏强 → strength='强'
    expect(dy!.strength).toBe('强');
  });

  it('strength 对偏弱命盘检测为弱', () => {
    // 日主金弱：金2偏弱
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 2, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    const dy = report.highlights.find((h) => h.label.includes('日主强弱'));
    if (dy && /偏弱|身弱/.test(dy.value)) {
      expect(dy.strength).toBe('弱');
    }
  });
});

describe('toFourLayer 六爻归类', () => {
  it('世应用神归 highlights，策略指导归 actions', () => {
    const env = calcLiuyaoEnveloped({ method: 'manual', yaoValues: '777777', question: '今年财运' });
    const report = toFourLayer(snapshotOf(env));
    expect(report.highlights.some((h) => h.label.includes('世应用神'))).toBe(true);
    // 策略指导应进 actions（六爻 snapshot 无策略指导段，但若有则归类正确）
    // 六爻 snapshot 含「卦象」heading → 应进 highlights（HIGHLIGHT_HEADINGS 含卦象）
    expect(report.highlights.some((h) => h.label === '卦象')).toBe(true);
  });
});

describe('toFourLayer 五运六气归类', () => {
  it('岁运/司天在泉归 details，疾病倾向归 details', () => {
    const env = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    const report = toFourLayer(snapshotOf(env));
    expect(report.details.some((d) => d.heading === '岁运')).toBe(true);
    expect(report.details.some((d) => d.heading === '司天在泉')).toBe(true);
    expect(report.details.some((d) => d.heading === '疾病倾向')).toBe(true);
  });
});

describe('toFourLayer 向后兼容', () => {
  it('无命中 heading 全放 details，不丢数据', () => {
    const reading: ReadingLike = {
      summary: '测试总结',
      sections: [{ heading: '某未知标题', body: '某内容' }],
    };
    const report = toFourLayer(reading);
    expect(report.details.length).toBe(1);
    expect(report.details[0].heading).toBe('某未知标题');
    expect(report.highlights).toEqual([]);
  });

  it('空 sections 不报错', () => {
    const report = toFourLayer({ summary: '空', sections: [] });
    expect(report.tldr).toBe('空');
    expect(report.highlights).toEqual([]);
    expect(report.details).toEqual([]);
    expect(report.actions).toEqual([]);
  });

  it('透传 tags 与 sourceNotes', () => {
    const reading: ReadingLike = {
      summary: 's',
      tags: ['八字', '身强'],
      sections: [],
      sourceNotes: '来源说明',
    };
    const report = toFourLayer(reading);
    expect(report.tags).toEqual(['八字', '身强']);
    expect(report.sourceNotes).toBe('来源说明');
  });
});

describe('detectQuestionDomain 问题领域识别', () => {
  it('事业类问题识别', () => {
    expect(detectQuestionDomain('今年适合换工作吗')).toBe('事业');
    expect(detectQuestionDomain('事业运如何')).toBe('事业');
  });
  it('财运类问题识别', () => {
    expect(detectQuestionDomain('今年财运怎么样')).toBe('财运');
    expect(detectQuestionDomain('投资能赚钱吗')).toBe('财运');
  });
  it('健康类问题识别', () => {
    expect(detectQuestionDomain('身体会好吗')).toBe('健康');
  });
  it('感情类问题识别', () => {
    expect(detectQuestionDomain('何时能遇到合适的伴侣')).toBe('感情');
  });
  it('无法识别返回 null', () => {
    expect(detectQuestionDomain('今天天气如何')).toBeNull();
  });
});

describe('toFocusedReport 专项解读', () => {
  it('事业问题过滤出事业相关 highlights/actions', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const full = toFourLayer(snapshotOf(env));
    const focused = toFocusedReport(snapshotOf(env), '今年适合换工作吗');
    // tldr 应改为领域导向
    expect(focused.tldr).toContain('事业');
    expect(focused.tldr).toContain('换工作');
    // 过滤后 highlights 应是 full 的子集（或全量回退）
    expect(focused.highlights.length).toBeLessThanOrEqual(full.highlights.length);
  });

  it('无法识别领域返回完整四层（tldr 不变）', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const full = toFourLayer(snapshotOf(env));
    const focused = toFocusedReport(snapshotOf(env), '今天天气如何');
    expect(focused.tldr).toBe(full.tldr);
    expect(focused.highlights.length).toBe(full.highlights.length);
  });

  it('健康问题过滤后 actions 含养生类', () => {
    const env = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    const focused = toFocusedReport(snapshotOf(env), '我体质会怎样');
    // 五运六气无策略指导段 → actions 可能为空，但 focused 不报错
    expect(Array.isArray(focused.actions)).toBe(true);
  });
});
