import { useCallback, useState } from 'react';
import { dispatchCommandFeedback } from '@/lib/commandIntents';

/**
 * ExportReportButton — 报告导出按钮（UX P1）
 *
 * 调用旧 FORTUNE.downloadReport 生成脱敏 HTML 报告并下载。
 * 导出后通过 GlobalToast 反馈结果。
 */

interface ExportReportButtonProps {
  /** 工具模块 id，用于反馈提示 */
  module?: string;
}

export function ExportReportButton({ module }: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const w = window as unknown as {
        FORTUNE?: {
          exportReportData?: () => unknown;
          getData?: () => unknown;
        };
        CapabilityRegistry?: {
          downloadReport?: (data: unknown) => void;
        };
      };

      // 优先用 CapabilityRegistry.downloadReport（内部调 exportReportData + 生成 HTML 下载）
      if (w.CapabilityRegistry?.downloadReport) {
        const data = w.FORTUNE?.getData ? w.FORTUNE.getData() : null;
        if (data) {
          w.CapabilityRegistry.downloadReport(data);
          dispatchCommandFeedback({
            title: '报告已导出',
            description: module ? `${module} · 脱敏 HTML 报告` : '脱敏 HTML 报告',
            tone: 'success',
          });
          return;
        }
      }

      // 降级：只导出 JSON 数据
      if (w.FORTUNE?.exportReportData) {
        const report = w.FORTUNE.exportReportData();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        dispatchCommandFeedback({
          title: '报告数据已导出（JSON）',
          description: '完整 HTML 报告需在旧 Dashboard 生成',
          tone: 'info',
        });
        return;
      }

      dispatchCommandFeedback({
        title: '导出失败',
        description: '引擎未就绪，无法生成报告',
        tone: 'info',
      });
    } catch {
      dispatchCommandFeedback({
        title: '导出失败',
        description: '生成报告时出错',
        tone: 'info',
      });
    } finally {
      setExporting(false);
    }
  }, [module]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3.5 py-2 text-xs font-medium text-jade-400 transition hover:border-jade-500/40 hover:bg-jade-500/20 active:scale-[0.98] disabled:opacity-40"
    >
      {exporting ? '导出中…' : '导出报告'}
    </button>
  );
}
