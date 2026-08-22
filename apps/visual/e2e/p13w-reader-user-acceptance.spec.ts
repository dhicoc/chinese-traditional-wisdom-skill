import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3w 古籍阅读用户侧验收', () => {
  test.setTimeout(90000);

  test('全局搜索古籍后以读者可理解的方式打开正文', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.getByRole('button', { name: '打开命令面板' }).click();

    const commandInput = page.getByTestId('command-input');
    await commandInput.fill('全局搜索');
    await page.getByTestId('command-result').filter({ hasText: '全局搜索 · 术语 / 古籍 / 映射表' }).click();

    const searchInput = page.getByPlaceholder('搜索术语、古籍、风水概念…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('八宅明镜');
    await page.getByTestId('search-results-ancient').getByText('八宅明镜', { exact: true }).click();

    const workspace = page.locator('[data-testid="workspace-reader"]');
    await expect(workspace.getByRole('heading', { name: '《八宅明镜》' })).toBeVisible({ timeout: 60000 });
    await expect(workspace.getByRole('heading', { name: '典籍书目' })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '原文', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '阅读导览' })).toBeVisible();
    await expect(workspace).not.toContainText('已关联古籍引用');
    await expect(workspace).not.toContainText('知识索引');
    await expect(workspace).not.toContainText('项目阅读说明');
  });

  test('全文短语搜索定位其他典籍并标出对应原文', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.getByRole('button', { name: '打开命令面板' }).click();
    await page.getByTestId('command-input').fill('全局搜索');
    await page.getByTestId('command-result').filter({ hasText: '全局搜索 · 术语 / 古籍 / 映射表' }).click();

    const searchInput = page.getByPlaceholder('搜索术语、古籍、风水概念…');
    await searchInput.fill('杨公妙应不多言');
    const fullTextResults = page.getByTestId('search-results-fulltext');
    await expect(fullTextResults).toBeVisible({ timeout: 60000 });
    await fullTextResults.getByText('都天宝照经', { exact: true }).first().click();

    const workspace = page.locator('[data-testid="workspace-reader"]');
    await expect(workspace.getByRole('heading', { name: '《都天宝照经》' })).toBeVisible({ timeout: 60000 });
    await expect(workspace.getByTestId('knowledge-book-source')).toContainText('杨公妙应不多言', { timeout: 60000 });
    await expect(workspace.locator('mark').filter({ hasText: '杨公妙应不多言' })).toBeVisible();
    await expect(workspace.getByText(/《都天宝照经》属于理气派/)).toBeVisible();
    await expect(workspace.getByText(/kb:\/\//)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('可直接浏览书目、按作者检索并打开馆藏', async ({ page }) => {
    await page.goto(`${BASE_URL}/#reader`);
    const workspace = page.locator('[data-testid="workspace-reader"]');
    await expect(workspace.getByRole('heading', { name: '典籍书目' })).toBeVisible({ timeout: 60000 });

    const catalogSearch = workspace.getByLabel('查找典籍');
    await catalogSearch.fill('郭璞');
    await expect(workspace.getByText('找到 3 篇', { exact: true })).toBeVisible();
    await workspace.getByRole('button', { name: /葬书·内篇/ }).click();

    const readingHeader = workspace.getByRole('heading', { name: '《葬书·内篇》' }).locator('xpath=ancestor::article');
    await expect(readingHeader).toBeVisible({ timeout: 60000 });
    await expect(workspace.getByTestId('knowledge-book-source')).toContainText('葬者乘生氣也', { timeout: 60000 });
    await expect(readingHeader.getByText('郭璞 · 形势派', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('本篇检索、阅读导览和清除操作均提供即时反馈', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.getByRole('button', { name: '打开命令面板' }).click();
    await page.getByTestId('command-input').fill('古籍 生气');
    await page.getByTestId('command-result').filter({ hasText: '古籍搜索：生气' }).click();

    const workspace = page.locator('[data-testid="workspace-reader"]');
    const textSearch = workspace.getByLabel('在本篇中查找');
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible({ timeout: 60000 });
    await expect(textSearch).toHaveValue('生气');
    await expect(workspace.getByText(/在本篇中找到 \d+ 处/)).toBeVisible();
    expect(await workspace.locator('mark').count()).toBeGreaterThan(0);

    const guideText = workspace.locator('[aria-labelledby="reader-guide-title"] .rounded-card');
    const initialGuide = await guideText.textContent();
    const lifeTrigram = workspace.getByRole('button', { name: '命卦入门', exact: true });
    await lifeTrigram.click();
    await expect(lifeTrigram).toHaveAttribute('aria-pressed', 'true');
    await expect(guideText).toContainText('论男女生命');
    expect(await guideText.textContent()).not.toBe(initialGuide);

    await workspace.getByRole('button', { name: '清除', exact: true }).click();
    await expect(textSearch).toHaveValue('');
    await expect(workspace.locator('mark')).toHaveCount(0);
    await expect(workspace.getByText('输入关键词后，正文中的相同词句会被标出')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
