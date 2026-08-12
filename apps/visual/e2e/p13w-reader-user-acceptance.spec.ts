import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3w 古籍阅读用户侧验收', () => {
  test.setTimeout(90000);

  test('命令面板搜索、文本对切换与清除关键词刷新阅读内容，并呈现知识参考边界', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.getByRole('button', { name: '打开命令面板' }).click();

    const commandInput = page.getByTestId('command-input');
    await commandInput.fill('古籍 生气');
    await page.getByTestId('command-result').filter({ hasText: '古籍搜索：生气' }).click();

    const workspace = page.locator('[data-testid="workspace-reader"]');
    const searchInput = workspace.getByPlaceholder('搜索原文关键词…');
    const highlightedTerms = workspace.locator('mark');
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible({ timeout: 60000 });
    await expect(searchInput).toHaveValue('生气');
    expect(await highlightedTerms.count()).toBeGreaterThan(0);
    await expect(workspace.getByRole('heading', { name: '古籍原文', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '相关说明', exact: true })).toBeVisible();

    const mappingContent = workspace.locator('pre');
    const initialMapping = await mappingContent.textContent();
    const lifeTrigram = workspace.getByRole('button', { name: '八宅明镜 ↔ 命卦映射', exact: true });
    await lifeTrigram.click();
    await expect(lifeTrigram).toHaveClass(/bg-jade-500\/12/);
    await expect.poll(() => mappingContent.textContent()).not.toBe(initialMapping);

    await workspace.getByRole('button', { name: '清除', exact: true }).click();
    await expect(searchInput).toHaveValue('');
    await expect(workspace.locator('mark')).toHaveCount(0);
    await expect(workspace.getByText('古籍阅读内容仅作传统文化知识学习参考，不作为现实决策依据。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
