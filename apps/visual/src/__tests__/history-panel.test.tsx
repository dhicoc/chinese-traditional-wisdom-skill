import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryWorkspace } from '@/features/history/HistoryPanel';
import { HistoryStore } from '@/legacy/historyStore';

afterEach(() => {
  localStorage.clear();
});

describe('HistoryWorkspace', () => {
  it('展示版本化的安全报告信息', () => {
    HistoryStore.add({
      module: 'bazi',
      title: '八字命盘',
      summary: '已通过命令入口打开对应本地工作区。',
      mode: 'command',
      reportVersion: '1.0',
      capabilityMode: '命令入口（command）',
      inputSummary: '已执行本地命令；不记录原始输入。',
    });

    render(<HistoryWorkspace />);

    expect(screen.getByText('报告版本：1.0')).toBeInTheDocument();
    expect(screen.getByText('能力模式：命令入口（command）')).toBeInTheDocument();
    expect(screen.getByText('输入摘要：已执行本地命令；不记录原始输入。')).toBeInTheDocument();
  });
});
