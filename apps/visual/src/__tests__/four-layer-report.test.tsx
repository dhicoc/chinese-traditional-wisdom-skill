import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import { calcBaziEnveloped } from '@/legacy/baziEngine';

/**
 * FourLayerReport 组件渲染测试（ROADMAP 功能层增强 Step 2）。
 */

afterEach(() => cleanup());

function makeBaziReport(): LayerReport {
  const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
  return toFourLayer(env.data.export_snapshot);
}

describe('FourLayerReport 渲染', () => {
  it('渲染四层：tldr + highlights + details + actions', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} title="八字四层报告" />);
    // 标题
    expect(screen.getByText('八字四层报告')).toBeInTheDocument();
    // tldr 展示
    expect(screen.getByText(report.tldr)).toBeInTheDocument();
    // 第二层标题
    expect(screen.getByText(/关键亮点/)).toBeInTheDocument();
    // 第三层（折叠态）：显示"详细分析（N 段）"
    expect(screen.getByText(/详细分析/)).toBeInTheDocument();
  });

  it('总体吉凶徽章显示（吉/凶/中）', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 徽章是 report.overallTone 对应的 吉/凶/中
    expect(screen.getByText(report.overallTone)).toBeInTheDocument();
  });

  it('highlights 每项渲染 label + tone 徽章', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 日主强弱应作为 highlight label 出现
    const dyStrong = report.highlights.find((h) => h.label.includes('日主强弱'));
    if (dyStrong) {
      expect(screen.getByText(dyStrong.label)).toBeInTheDocument();
    }
  });

  it('details 默认折叠，点击展开显示各段', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 折叠态：四柱 heading 不应可见（在 details 内）
    const fourPillars = report.details.find((d) => d.heading === '四柱');
    // 折叠时 details body 不渲染
    expect(screen.queryByText('四柱')).not.toBeInTheDocument();
    // 点击展开
    fireEvent.click(screen.getByText(/详细分析/));
    // 展开后四柱 heading 出现
    if (fourPillars) {
      expect(screen.getByText('四柱')).toBeInTheDocument();
    }
  });

  it('defaultDetailsOpen=true 默认展开', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} defaultDetailsOpen />);
    // 四柱 heading 应可见
    if (report.details.some((d) => d.heading === '四柱')) {
      expect(screen.getByText('四柱')).toBeInTheDocument();
    }
  });

  it('空 actions 不渲染"可执行建议"区', () => {
    const reading: ReadingLike = { summary: '空', sections: [] };
    const report = toFourLayer(reading);
    render(<FourLayerReport report={report} />);
    expect(screen.queryByText('可执行建议')).not.toBeInTheDocument();
  });

  it('actions 按 category 分组渲染', () => {
    const report: LayerReport = {
      tldr: '测试',
      overallTone: '中',
      highlights: [],
      details: [],
      actions: [
        { text: '主动出击把握机会', category: '决策' },
        { text: '主卧放财位', category: '生活调整' },
        { text: '注意作息', category: '养生' },
      ],
    };
    render(<FourLayerReport report={report} />);
    expect(screen.getByText('决策策略')).toBeInTheDocument();
    expect(screen.getByText('生活调整')).toBeInTheDocument();
    expect(screen.getByText('养生')).toBeInTheDocument();
    expect(screen.getByText('· 主动出击把握机会')).toBeInTheDocument();
  });

  it('sourceNotes 渲染', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中', highlights: [], details: [], actions: [],
      sourceNotes: '某来源说明',
    };
    render(<FourLayerReport report={report} />);
    expect(screen.getByText('某来源说明')).toBeInTheDocument();
  });

  it('highlight 含 strength 时渲染强弱小标（强/弱）', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中',
      highlights: [
        { label: '日主强弱', value: '日主辛金偏强', tone: '中', strength: '强' },
      ],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    // strength 小标"强"应出现
    expect(screen.getByText('强')).toBeInTheDocument();
    expect(screen.getByText('日主辛金偏强')).toBeInTheDocument();
  });

  it('highlight strength 为 null 时不渲染强弱小标', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '吉',
      highlights: [{ label: '某项', value: '某值', tone: '中', strength: null }],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    // 不应有"强"/"弱"小标
    expect(screen.queryByText('强')).not.toBeInTheDocument();
    expect(screen.queryByText('弱')).not.toBeInTheDocument();
  });
});
