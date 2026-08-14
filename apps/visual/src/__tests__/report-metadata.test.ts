import { describe, expect, it } from 'vitest';
import { createReportMetadata, createWorkspaceReportMetadata, getReportMetadataItems } from '@/legacy/reportMetadata';

describe('reportMetadata', () => {
  it('按固定顺序生成仅包含用户说明与时间口径的报告信息', () => {
    const metadata = createReportMetadata({
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      timeBasis: 'true-solar-verified',
    });

    expect(getReportMetadataItems(metadata)).toEqual([
      { label: '本次分析说明', value: '本次按出生资料排盘；报告不保留完整出生资料。' },
      { label: '时间口径', value: '已核验真太阳时' },
    ]);
  });

  it('仅接收用户说明与时间口径，不生成工具、版本、模式或原始输入', () => {
    const metadata = createWorkspaceReportMetadata({
      moduleId: 'bazi',
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      timeBasis: 'civil-unverified',
    });
    const visibleText = getReportMetadataItems(metadata).map(({ label, value }) => `${label}\n${value}`).join('\n');

    expect(visibleText).toContain('民用时间（未完成真太阳时复核）');
    expect(visibleText).not.toContain('BaziLunarAdapter');
    expect(visibleText).not.toContain('0.3.0');
    expect(visibleText).not.toContain('local-exact');
    expect(visibleText).not.toContain('1990年6月15日');
    expect(visibleText).not.toContain('出生地点');
  });

  it('对不适用的时间口径不生成占位信息', () => {
    const metadata = createReportMetadata({
      inputSummary: '本次提供指定日期的民俗参考。',
    });

    expect(getReportMetadataItems(metadata)).toEqual([
      { label: '本次分析说明', value: '本次提供指定日期的民俗参考。' },
    ]);
  });
});
