import { useCallback, useState } from 'react';
import { dispatchCommandFeedback } from '@/lib/commandIntents';
import { useBirth } from '@/lib/birthContext';

/**
 * ExportReportButton — 导出当前生辰快照（JSON）
 *
 * 旧 FORTUNE / CapabilityRegistry.downloadReport 已随 visual/ 桥移除。
 * 完整 HTML 报告请用对话模板 templates/visual-report.md 或 CopyContext。
 */

interface ExportReportButtonProps {
  module?: string;
}

export function ExportReportButton({ module }: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { birth, solarBirth } = useBirth();

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const report = {
        version: '0.3-pure-ts',
        generatedAt: new Date().toISOString(),
        module: module ?? 'unknown',
        sourceNotes: 'React pure-TS engines; no legacy FORTUNE bridge',
        // 脱敏：仅年份精度到日，不写姓名/地点
        birth: {
          year: birth.year,
          month: birth.month,
          day: birth.day,
          hour: birth.hour,
          gender: birth.gender,
          isLunar: birth.isLunar,
          useExactCalendar: birth.useExactCalendar,
        },
        solarBirth: {
          year: solarBirth.year,
          month: solarBirth.month,
          day: solarBirth.day,
          hour: solarBirth.hour,
          gender: solarBirth.gender,
        },
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${solarBirth.year}xxxx-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      dispatchCommandFeedback({
        title: '报告数据已导出（JSON）',
        description: module ? `${module} · 脱敏生辰快照` : '脱敏生辰快照',
        tone: 'success',
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
  }, [module, birth, solarBirth]);

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-400 transition hover:bg-jade-500/20 disabled:opacity-50"
    >
      {exporting ? '导出中…' : '导出报告'}
    </button>
  );
}
