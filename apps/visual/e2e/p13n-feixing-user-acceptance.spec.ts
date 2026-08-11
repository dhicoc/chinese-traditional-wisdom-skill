import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

async function openWorkspace(page: import('@playwright/test').Page, title: string, workspaceId: string) {
  await page.goto(BASE_URL);
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  await page.getByRole('button', { name: '打开命令面板' }).click();
  const input = page.getByTestId('command-input');
  await input.fill(title);
  await page.getByTestId('command-result').filter({ hasText: title }).filter({ hasText: '导航' }).click();
  await expect(page.locator(`[data-testid="workspace-${workspaceId}"]`)).toBeVisible({ timeout: 60000 });
}

test.describe('P1.3n 流年飞星用户侧验收', () => {
  test.setTimeout(90000);

  test('年份刷新九宫飞星与方位结果，全局出生年份刷新命卦合参', async ({ page }) => {
    await openWorkspace(page, '流年飞星', 'feixing');
    const workspace = page.locator('[data-testid="workspace-feixing"]');

    await expect(workspace.getByRole('heading', { name: '流年飞星', exact: true })).toBeVisible();
    await expect(workspace.getByText('中宫飞星', { exact: true })).toBeVisible();
    await expect(workspace.getByText('方位用途', { exact: true })).toBeVisible();
    await expect(workspace.getByText('命卦合参', { exact: true })).toBeVisible();
    await expect(workspace.getByText('九星化煞建议', { exact: true })).toBeVisible();
    await expect(workspace.getByText('九宫飞星图', { exact: true })).toBeVisible();

    const year = workspace.getByLabel('年份');
    const chart = workspace.getByTestId('nine-palace-grid');
    await year.fill('2024');
    await expect(year).toHaveValue('2024');
    await expect(chart).toHaveAttribute('aria-label', '公元 2024 年 九宫飞星图');
    const grid2024 = await chart.textContent();
    const usageSummary = workspace.getByText('方位用途', { exact: true }).locator('..');
    const usage2024 = await usageSummary.textContent();

    await year.fill('2025');
    await expect(year).toHaveValue('2025');
    await expect(chart).toHaveAttribute('aria-label', '公元 2025 年 九宫飞星图');
    await expect.poll(() => chart.textContent()).not.toBe(grid2024);
    await expect.poll(() => usageSummary.textContent()).not.toBe(usage2024);

    const mingGua = workspace.getByText('命卦合参', { exact: true }).locator('..');
    const initialMingGua = await mingGua.textContent();
    const birthYear = page.locator('input[aria-label="全局出生年"]:visible');
    await birthYear.fill('1991');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1991');
    await expect.poll(() => mingGua.textContent()).not.toBe(initialMingGua);

    await birthYear.fill('1990');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1990');
    await expect.poll(() => mingGua.textContent()).toBe(initialMingGua);

    await expect(workspace.getByText('飞星布局仅作传统文化学习与方位参考，不构成风水操作或决策建议。')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
