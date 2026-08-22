import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IchingLibrary } from '@/features/knowledge/IchingLibrary';

afterEach(() => cleanup());

describe('IchingLibrary', () => {
  it('展示完整 64 卦文王序和乾卦原文', () => {
    render(<IchingLibrary onOpenBooks={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '周易六十四卦' })).toBeInTheDocument();
    expect(within(screen.getByTestId('iching-sequence-grid')).getAllByRole('button')).toHaveLength(64);
    expect(screen.getByRole('heading', { name: '䷀ 乾为天' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '卦辞' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '爻辞' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '彖传' })).toBeInTheDocument();
  });

  it('按卦名搜索并打开第35卦晋', () => {
    render(<IchingLibrary onOpenBooks={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('查找六十四卦'), { target: { value: '火地晋' } });
    expect(screen.getByText('找到 1 卦')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('iching-sequence-grid')).getByRole('button', { name: /晋/ }));

    expect(screen.getByRole('heading', { name: '䷢ 火地晋' })).toBeInTheDocument();
    expect(screen.getByText('上离（火） · 下坤（地）')).toBeInTheDocument();
  });

  it('上下卦矩阵完整覆盖 64 个组合', () => {
    render(<IchingLibrary onOpenBooks={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: '上下卦矩阵' }));
    const matrix = screen.getByTestId('iching-trigram-matrix');
    expect(within(matrix).getAllByRole('button')).toHaveLength(64);
    expect(within(matrix).getByRole('button', { name: '上离下坤，第35卦晋' })).toBeInTheDocument();
  });

  it('可手动切换六爻阴阳并定位卦象', () => {
    render(<IchingLibrary onOpenBooks={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: '六爻定位' }));
    expect(screen.getByRole('heading', { name: '第1卦 · 乾' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '初爻，当前为阳爻，点击切换' }));
    expect(screen.getByRole('heading', { name: '第44卦 · 姤' })).toBeInTheDocument();
  });

  it('选择动爻后本地生成变卦并高亮对应爻辞', () => {
    render(<IchingLibrary onOpenBooks={vi.fn()} />);

    const firstLine = screen.getByRole('button', { name: '初爻' });
    fireEvent.click(firstLine);
    expect(firstLine).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /䷫ 第44卦 · 姤/ })).toBeInTheDocument();
    expect(screen.getByText('初爻 · 动')).toBeInTheDocument();
  });

  it('显示错卦、综卦、互卦并可返回典籍书库', () => {
    const onOpenBooks = vi.fn();
    render(<IchingLibrary initialNumber={11} onOpenBooks={onOpenBooks} />);

    expect(screen.getByRole('heading', { name: '䷊ 地天泰' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /错卦.*第12卦 · 否/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /综卦.*第12卦 · 否/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /互卦/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回典籍书库' }));
    expect(onOpenBooks).toHaveBeenCalledOnce();
  });

  it('起卦联动时打开本卦并保留动爻', () => {
    render(<IchingLibrary initialNumber={35} initialChangingLines={[2]} sourceLabel="来自本次起卦结果" onOpenBooks={vi.fn()} />);

    expect(screen.getByText('来自本次起卦结果')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '䷢ 火地晋' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '二爻' })).toHaveAttribute('aria-pressed', 'true');
  });
});
