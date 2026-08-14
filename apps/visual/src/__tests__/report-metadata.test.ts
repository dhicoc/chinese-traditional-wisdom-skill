import { describe, expect, it } from 'vitest';
import * as reportMetadata from '@/legacy/reportMetadata';
import { createReportMetadata, getReportMetadataItems, REPORT_FORMAT_VERSION } from '@/legacy/reportMetadata';

describe('reportMetadata', () => {
  it('按固定顺序生成仅包含可展示字段的报告信息', () => {
    const metadata = createReportMetadata({
      tool: 'BaziLunarAdapter',
      version: '0.3.0',
      capability: { mode: 'local-exact', modeLabel: '按出生资料排盘' },
      inputSummary: '已提供出生资料用于本地排盘。',
      timeBasis: 'true-solar-verified',
    });

    expect(metadata.reportVersion).toBe(REPORT_FORMAT_VERSION);
    expect(getReportMetadataItems(metadata)).toEqual([
      { label: '报告版本', value: REPORT_FORMAT_VERSION },
      { label: '工具版本', value: 'BaziLunarAdapter@0.3.0' },
      { label: '能力模式', value: '按出生资料排盘（local-exact）' },
      { label: '输入摘要', value: '已提供出生资料用于本地排盘。' },
      { label: '时间口径', value: '已核验真太阳时' },
    ]);
  });

  it('只投影白名单字段，不透传原始输入、地点和内部计算配置', () => {
    const metadata = createReportMetadata({
      tool: 'BaziLunarAdapter',
      version: '0.3.0',
      capability: { mode: 'local-exact', modeLabel: '按出生资料排盘' },
      inputSummary: '已提供出生资料用于本地排盘。',
      timeBasis: 'civil-unverified',
    });
    const visibleText = getReportMetadataItems(metadata).map(({ value }) => value).join('\n');

    expect(visibleText).toContain('民用时间（未完成真太阳时复核）');
    expect(visibleText).not.toContain('1990年6月15日');
    expect(visibleText).not.toContain('出生地点');
    expect(visibleText).not.toContain('张三');
    expect(visibleText).not.toContain('calculationConfig');
  });

  it('对不适用的时间口径不生成占位信息', () => {
    const metadata = createReportMetadata({
      tool: 'AlmanacAdapter',
      version: '1.0.0',
      capability: { mode: 'folk-experience', modeLabel: '民俗体验' },
      inputSummary: '指定日期',
    });

    expect(getReportMetadataItems(metadata).map(({ label }) => label)).toEqual([
      '报告版本',
      '工具版本',
      '能力模式',
      '输入摘要',
    ]);
  });

  it('从工作区模块标识创建受控元信息，不读取原始输入或完整信封', () => {
    const createWorkspaceReportMetadata = (reportMetadata as typeof reportMetadata & {
      createWorkspaceReportMetadata: (input: {
        moduleId: 'yunqi';
        tool: string;
        version: string;
        inputSummary: string;
      }) => ReturnType<typeof createReportMetadata>;
    }).createWorkspaceReportMetadata;

    expect(createWorkspaceReportMetadata({
      moduleId: 'yunqi',
      tool: 'calc_yunqi',
      version: '1.0.0',
      inputSummary: '指定年份推算；当前月份参与客气计算。',
    })).toMatchObject({
      toolVersion: 'calc_yunqi@1.0.0',
      capabilityMode: '按出生资料排盘（local-exact）',
      inputSummary: '指定年份推算；当前月份参与客气计算。',
    });
  });
});
