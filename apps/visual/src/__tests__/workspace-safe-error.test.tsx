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

vi.mock('@/engine-api/divination', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/divination')>();
  return {
    ...actual,
    calcTaiyiEnveloped: () => {
      throw new Error('taiyi internal detail');
    },
    calcDaliurenEnveloped: () => {
      throw new Error('liuren internal detail');
    },
  };
});

vi.mock('@/engine-api/folklore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/folklore')>();
  return {
    ...actual,
    calcXingXiuEnveloped: () => {
      throw new Error('internal dependency detail');
    },
    calcHuangjiEnveloped: () => {
      throw new Error('huangji internal detail');
    },
  };
});

import { HuangjiWorkspace } from '@/features/huangji/HuangjiWorkspace';
import { LiurenWorkspace } from '@/features/liuren/LiurenWorkspace';
import { TaiyiWorkspace } from '@/features/taiyi/TaiyiWorkspace';
import { XingXiuWorkspace } from '@/features/xingxiu/XingXiuWorkspace';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

function expectSafeErrorState(container: HTMLElement, internalDetail: string, successContent: string) {
  expect(screen.getByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
  expect(container.textContent).not.toContain(internalDetail);
  expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  expect(screen.queryByText(successContent)).not.toBeInTheDocument();
}

afterEach(() => cleanup());

describe('Workspace 计算错误呈现', () => {
  it('星宿直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<XingXiuWorkspace />);

    expectSafeErrorState(container, 'internal dependency detail', '二十八星宿');
  });

  it('太乙直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<TaiyiWorkspace />);

    expectSafeErrorState(container, 'taiyi internal detail', '太乙神数');
  });

  it('大六壬直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<LiurenWorkspace />);

    expectSafeErrorState(container, 'liuren internal detail', '大六壬');
  });

  it('皇极经世直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<HuangjiWorkspace />);

    expectSafeErrorState(container, 'huangji internal detail', '皇极经世');
  });
});
