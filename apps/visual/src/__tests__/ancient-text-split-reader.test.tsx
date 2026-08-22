import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dispatchReaderSearchIntent } from '@/lib/commandIntents';
import { AncientTextSplitReader } from '@/features/knowledge/AncientTextSplitReader';
import { createKnowledgeCitationId } from '@/legacy/searchEngine';

afterEach(() => {
  cleanup();
});

describe('AncientTextSplitReader', () => {
  it('默认展示可检索的本地书目和面向读者的馆藏信息', () => {
    render(<AncientTextSplitReader />);

    expect(screen.getByRole('heading', { name: '典籍书目' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '《八宅明镜》' })).toBeInTheDocument();
    expect(screen.getByLabelText('查找典籍')).toBeInTheDocument();
    expect(screen.getByLabelText('典籍分类')).toBeInTheDocument();
    expect(screen.getByLabelText('在本篇中查找')).toBeInTheDocument();
    expect(screen.getAllByTestId('reader-book-item').length).toBeGreaterThan(20);
    expect(document.body.textContent).not.toContain('已关联古籍引用');
    expect(document.body.textContent).not.toContain('知识索引');
    expect(document.body.textContent).not.toContain('项目阅读说明');
    expect(document.body.textContent).not.toContain('kb://');
  });

  it('可从书目直接查找并打开其他馆藏', async () => {
    render(<AncientTextSplitReader />);

    fireEvent.change(screen.getByLabelText('查找典籍'), { target: { value: '郭璞' } });
    expect(screen.getByText('找到 3 篇')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /葬书·内篇/ }));

    expect(await screen.findByRole('heading', { name: '《葬书·内篇》' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '葬書（內篇）' }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '阅读导览' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('.json');
  });

  it('通过已收录古籍的阅读请求打开对应原文，不展示内部标识', () => {
    const citationId = createKnowledgeCitationId('03-yang-house/八宅明镜.md');
    dispatchReaderSearchIntent({ term: '八宅', citationId, raw: '八宅明镜' });

    render(<AncientTextSplitReader />);

    expect(screen.getByRole('heading', { name: '《八宅明镜》' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '原文' })).toBeInTheDocument();
    expect(screen.queryByText(citationId)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('kb://');
  });

  it('通过任意馆藏阅读请求按需加载对应正文，不伪装为默认正文', async () => {
    const citationId = createKnowledgeCitationId('01-situation-form/葬書-內篇.md');
    dispatchReaderSearchIntent({ term: '生气', citationId, raw: '葬书·内篇' });

    render(<AncientTextSplitReader />);

    expect(screen.getByRole('heading', { name: '《葬书·内篇》' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '葬書（內篇）' }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText('大游年方位')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('kb://');
  });

  it('无指定书目的后续搜索回到默认馆藏', () => {
    const citationId = createKnowledgeCitationId('01-situation-form/葬書-內篇.md');
    dispatchReaderSearchIntent({ term: '生气', citationId, raw: '葬书·内篇' });
    render(<AncientTextSplitReader />);

    act(() => {
      dispatchReaderSearchIntent({ term: '八宅', raw: '古籍 八宅' });
    });

    expect(screen.getByRole('heading', { name: '《八宅明镜》' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '原文' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('kb://');
  });

  it('按本次起卦结果展示周易本卦、动爻与变卦，并可返回书库', () => {
    dispatchReaderSearchIntent({
      term: '晋',
      iching: {
        hexagramName: '晋',
        hexagramNumber: 35,
        changingHexagramName: '旅',
        changingHexagramNumber: 56,
        changingLines: [2],
      },
      raw: '本次起卦结果',
    });

    render(<AncientTextSplitReader />);

    expect(screen.getByRole('heading', { name: '周易六十四卦' })).toBeInTheDocument();
    expect(screen.getByText('来自本次起卦结果')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '䷢ 火地晋' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '二爻' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /变卦/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回典籍书库' }));
    expect(screen.getByRole('heading', { name: '典籍书目' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('.json');
  });
});
