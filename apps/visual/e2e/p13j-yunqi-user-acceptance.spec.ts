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

test.describe('P1.3j 五运六气用户侧验收', () => {
  test.setTimeout(90000);

  test('年份切换同步更新岁运、司天在泉、图表与传统医学边界', async ({ page }) => {
    await openWorkspace(page, '五运六气', 'yunqi');
    const workspace = page.locator('[data-testid="workspace-yunqi"]');

    await expect(workspace.getByRole('heading', { name: '五运六气', exact: true })).toBeVisible();
    await expect(workspace.getByText('五运六气输出仅作传统文化和气候病机理论学习参考，不替代医学诊断。')).toBeVisible();

    const year = workspace.getByLabel('年份');
    await year.fill('2024');
    await expect(year).toHaveValue('2024');
    await expect(workspace.getByText('甲辰', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('土运太过', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('太阳寒水', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('太阴湿土', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByTestId('yunqi-chart')).toHaveAttribute('aria-label', '五运六气 2024年 甲辰');
    await expect(workspace.getByText('客气六步', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('五运六气解读', { exact: true })).toBeVisible();

    await year.fill('1990');
    await expect(year).toHaveValue('1990');
    await expect(workspace.getByText('庚午', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('金运太过', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('少阴君火', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('阳明燥金', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByTestId('yunqi-chart')).toHaveAttribute('aria-label', '五运六气 1990年 庚午');
    await expect(workspace.getByText('甲辰', { exact: true })).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
