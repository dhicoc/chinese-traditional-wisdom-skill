import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const engineState = vi.hoisted(() => ({
  wellnessFailure: false,
  marriageThrows: false,
  exportPresentation: null as unknown,
  lastSuccessEnvelope: null as unknown,
}));
const solarBirth = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' };

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({ solarBirth }),
}));

vi.mock('@/engine-api/calendar', () => ({ getSolarEntry: () => null }));

vi.mock('@/engine-api/combo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/combo')>();
  return {
    ...actual,
    calcDailyWellnessCombo: (input: Parameters<typeof actual.calcDailyWellnessCombo>[0]) => {
      if (engineState.wellnessFailure) {
        return {
          ok: false,
          tool: 'combo_daily_wellness',
          version: 'internal',
          input_normalized: input,
          data: {},
          error: { code: 'internal_failure', message: 'combo internal sentinel' },
        };
      }
      const result = actual.calcDailyWellnessCombo(input);
      engineState.lastSuccessEnvelope = result;
      return result;
    },
  };
});

vi.mock('@/engine-api/marriage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/marriage')>();
  return {
    ...actual,
    calcMarriageCombo: async (...args: Parameters<typeof actual.calcMarriageCombo>) => {
      if (engineState.marriageThrows) throw new Error('marriage internal sentinel');
      return actual.calcMarriageCombo(...args);
    },
  };
});

vi.mock('@/components/shared/ExportReportButton', () => ({
  ExportReportButton: ({ presentation }: { presentation: unknown }) => {
    engineState.exportPresentation = presentation;
    return <button type="button">导出报告</button>;
  },
}));

import { ComboWorkspace } from '@/features/combo/ComboWorkspace';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

afterEach(() => {
  cleanup();
  engineState.wellnessFailure = false;
  engineState.marriageThrows = false;
  engineState.exportPresentation = null;
  engineState.lastSuccessEnvelope = null;
});

describe('ComboWorkspace presentation 边界', () => {
  it('成功的 direct-engine 结果向导出组件传递同源 report、semanticReport、notices 和 warnings', async () => {
    render(<ComboWorkspace />);

    await waitFor(() => expect(engineState.exportPresentation).not.toBeNull());
    const presentation = engineState.exportPresentation as {
      report: { summary: string; sections: Array<{ heading: string; body: string }> };
      semanticReport: { facts: Array<{ label: string }> };
      notices: string[];
      warnings: string[];
    };
    expect(presentation.report).toBeTruthy();
    expect(presentation.semanticReport).toBeTruthy();
    expect(presentation.notices).toBeInstanceOf(Array);
    expect(presentation.warnings).toBeInstanceOf(Array);
    const envelope = engineState.lastSuccessEnvelope as { ok: true; data: { export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> } } };
    expect(presentation.semanticReport.facts.map(({ label }) => label)).toEqual(['日期', '节气', '季节', '时辰']);
    expect(presentation.report).toEqual({
      summary: envelope.data.export_snapshot.summary,
      sections: envelope.data.export_snapshot.sections,
    });
  });

  it('引擎返回失败 envelope 时只呈现固定安全文案', async () => {
    engineState.wellnessFailure = true;
    const { container } = render(<ComboWorkspace />);

    expect(await screen.findByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(container.textContent).not.toContain('combo internal sentinel');
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  });

  it('婚配异步计算抛错时也呈现固定安全文案', async () => {
    engineState.marriageThrows = true;
    const { container } = render(<ComboWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: /合婚配对/ }));

    expect(await screen.findByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(container.textContent).not.toContain('marriage internal sentinel');
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  });
});
