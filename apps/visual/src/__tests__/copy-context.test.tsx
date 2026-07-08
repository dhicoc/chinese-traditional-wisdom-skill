import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { toMarkdown, CopyContextButton } from '@/components/shared/CopyContextButton';
import { COPY_CONTEXT_INTENT } from '@/lib/commandIntents';

describe('CopyContextButton toMarkdown', () => {
  it('把标题与 payload 转成 Markdown 代码块', () => {
    const md = toMarkdown('八字上下文', { year: 1990, gender: '男' });
    expect(md).toContain('# 八字上下文');
    expect(md).toContain('```json');
    expect(md).toContain('"year": 1990');
    expect(md).toContain('"gender": "男"');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('处理嵌套对象与数组', () => {
    const md = toMarkdown('test', { list: [1, 2, 3], nested: { a: true } });
    expect(md).toContain('"list": [');
    expect(md).toContain('"nested": {');
  });

  it('处理空 payload', () => {
    const md = toMarkdown('空', {});
    expect(md).toContain('# 空');
    expect(md).toContain('{}');
  });
});

describe('CopyContextButton 组件', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    writeText.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('渲染默认按钮标签', () => {
    render(<CopyContextButton title="t" payload={{ a: 1 }} />);
    expect(screen.getByRole('button', { name: /copy context for AI/i })).toBeTruthy();
  });

  it('点击后调用 clipboard.writeText 并写入 Markdown', async () => {
    render(<CopyContextButton title="八字上下文" payload={{ year: 1990 }} />);
    const btn = screen.getByRole('button', { name: /copy context for AI/i });
    fireEvent.click(btn);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain('# 八字上下文');
    expect(written).toContain('"year": 1990');
  });

  it('commandScope 匹配时响应 COPY_CONTEXT_INTENT 事件并复制', async () => {
    render(<CopyContextButton title="八字上下文" payload={{ x: 1 }} commandScope="bazi" />);
    window.dispatchEvent(
      new CustomEvent(COPY_CONTEXT_INTENT, { detail: { scope: 'bazi' } }),
    );
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain('# 八字上下文');
  });

  it('commandScope 不匹配时不复制', () => {
    render(<CopyContextButton title="t" payload={{ x: 1 }} commandScope="bazi" />);
    window.dispatchEvent(
      new CustomEvent(COPY_CONTEXT_INTENT, { detail: { scope: 'ziwei' } }),
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});
