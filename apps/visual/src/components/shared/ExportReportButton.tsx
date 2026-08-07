import { useCallback, useState } from 'react';
import { dispatchCommandFeedback } from '@/lib/commandIntents';
import { useBirth } from '@/lib/birthContext';

export interface ExportReportSnapshot {
  summary: string;
  sections: Array<{ heading: string; body: string }>;
}

interface ExportReportButtonProps {
  module?: string;
  report?: ExportReportSnapshot | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

export function createExportReportHtml({
  title,
  generatedAt,
  birthSummary,
  report,
}: {
  title: string;
  generatedAt: string;
  birthSummary: string;
  report: ExportReportSnapshot;
}): string {
  const sections = report.sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.heading)}</h2>
      <p>${escapeHtml(section.body).replace(/\n/g, '<br>')}</p>
    </section>`).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3eee1; color: #2e2823; font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.8; }
    main { width: min(860px, calc(100% - 32px)); margin: 40px auto; padding: 44px; background: #f7f3e8; border: 1px solid #d9d1bd; box-shadow: 0 8px 24px rgb(46 40 35 / 0.08); }
    header { padding-bottom: 24px; border-bottom: 1px solid #d9d1bd; }
    .eyebrow { margin: 0; color: #3d6053; font-size: 12px; letter-spacing: 0.12em; }
    h1, h2 { font-family: "Noto Serif SC", "Songti SC", "SimSun", serif; font-weight: 600; }
    h1 { margin: 6px 0 0; font-size: 30px; letter-spacing: 0.08em; }
    .meta { margin: 14px 0 0; color: #5c5348; font-size: 14px; }
    .summary { margin: 28px 0; padding: 18px 20px; border: 1px solid #c7bda5; background: #efe9da; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 17px; }
    section { padding: 22px 0; border-top: 1px solid #d9d1bd; }
    h2 { margin: 0 0 10px; color: #3d6053; font-size: 20px; }
    p { margin: 0; white-space: normal; }
    footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d9d1bd; color: #6f6659; font-size: 12px; }
    @media print { body { background: #fff; } main { width: 100%; margin: 0; border: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">传统文化参考</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">生成时间：${escapeHtml(generatedAt)}<br>出生资料：${escapeHtml(birthSummary)}</p>
    </header>
    <div class="summary">${escapeHtml(report.summary).replace(/\n/g, '<br>')}</div>
    ${sections}
    <footer>本报告内容仅作传统文化参考。</footer>
  </main>
</body>
</html>`;
}

function defaultReport(title: string): ExportReportSnapshot {
  return {
    summary: `${title}报告`,
    sections: [{ heading: '报告内容', body: '当前页面尚未生成可导出的结果，请先完成输入或计算后再试。' }],
  };
}

export function ExportReportButton({ module, report }: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { birth, solarBirth } = useBirth();
  const title = module ?? '命盘报告';

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const birthSummary = `${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时，${birth.gender}，${birth.isLunar ? '农历' : '公历'}`;
      const content = createExportReportHtml({
        title,
        generatedAt: new Date().toLocaleString('zh-CN'),
        birthSummary,
        report: report ?? defaultReport(title),
      });
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-${solarBirth.year}xxxx-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      dispatchCommandFeedback({
        title: '报告已导出',
        description: `${title} · 可在浏览器中打开`,
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
  }, [birth, report, solarBirth.year, title]);

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
