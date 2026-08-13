import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({
    solarBirth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' },
  }),
}));

vi.mock('@/engine-api/calendar', () => ({
  getSolarEntry: () => null,
}));

vi.mock('@/engine-api/folklore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/folklore')>();
  return {
    ...actual,
    calcXingXiuEnveloped: () => {
      throw new Error('internal dependency detail');
    },
  };
});

import { XingXiuWorkspace } from '@/features/xingxiu/XingXiuWorkspace';

afterEach(() => cleanup());

describe('Workspace 计算错误呈现', () => {
  it('星宿直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<XingXiuWorkspace />);

    expect(screen.getByText('本次计算未能完成，请核对输入后重试。')).toBeInTheDocument();
    expect(container.textContent).not.toContain('internal dependency detail');
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
    expect(screen.queryByText('请确认生辰')).not.toBeInTheDocument();
  });
});
