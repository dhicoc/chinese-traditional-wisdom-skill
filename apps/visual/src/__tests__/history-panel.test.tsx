import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryWorkspace } from '@/features/history/HistoryPanel';
import { HistoryStore } from '@/legacy/historyStore';

afterEach(() => {
  localStorage.clear();
});

describe('HistoryWorkspace', () => {
  it('仅展示面向用户的分析说明，不展示版本或内部模式', () => {
    HistoryStore.add({
      module: 'bazi',
      title: '八字命盘',
      summary: '已生成八字命盘参考。',
      mode: 'command',
      reportVersion: '1.0',
      capabilityMode: '命令入口（command）',
      inputSummary: '已完成分析；不记录原始输入。',
    });

    render(<HistoryWorkspace />);

    expect(screen.getByText('本次分析说明：已完成分析；不记录原始输入。')).toBeInTheDocument();
    expect(screen.queryByText('报告版本：1.0')).not.toBeInTheDocument();
    expect(screen.queryByText('能力模式：命令入口（command）')).not.toBeInTheDocument();
  });
});
