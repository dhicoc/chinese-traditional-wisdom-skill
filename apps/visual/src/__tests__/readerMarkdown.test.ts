import { describe, expect, it } from 'vitest';
import { renderReaderMarkdown } from '@/features/knowledge/readerMarkdown';

describe('readerMarkdown', () => {
  it('把标题和列表转成适合阅读的语义结构', () => {
    const rendered = renderReaderMarkdown('# 书名\n\n## 卷一\n\n- 第一章\n- 第二章');

    expect(rendered.html).toContain('<h3 id="section-0000"');
    expect(rendered.html).toContain('<h4 id="section-0001"');
    expect(rendered.html).toContain('<ul');
    expect(rendered.html).toContain('<li class="pl-1">第一章</li>');
  });

  it('只在正文中标记关键词，并正确统计命中数量', () => {
    const rendered = renderReaderMarkdown('生气聚处，得水为上。\n\n再论生气。', '生气');

    expect(rendered.matchCount).toBe(2);
    expect(rendered.html.match(/<mark/g)).toHaveLength(2);
    expect(rendered.html).not.toContain('<mark class="text');
  });

  it('把旧整理标记转换为正文重点和可读注释', () => {
    const rendered = renderReaderMarkdown("'''葬者乘生氣也。'''\n\n{> 此章乃全书关键。}");

    expect(rendered.html).toContain('<strong');
    expect(rendered.html).toContain('葬者乘生氣也。');
    expect(rendered.html).toContain('>注</span>');
    expect(rendered.html).not.toContain("'''");
    expect(rendered.html).not.toContain('{>');
  });

  it('转义正文中的 HTML，不执行外部内容', () => {
    const rendered = renderReaderMarkdown('<script>alert(1)</script>\n\n**正文**');

    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('<strong');
  });
});
