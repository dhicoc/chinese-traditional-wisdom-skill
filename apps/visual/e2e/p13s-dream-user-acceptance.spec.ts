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

test.describe('P1.3s 周公解梦用户侧验收', () => {
  test.setTimeout(90000);

  test('真实关键词查询刷新梦象解读、古文断语与传统参考边界', async ({ page }) => {
    await openWorkspace(page, '周公解梦', 'dream');
    const workspace = page.locator('[data-testid="workspace-dream"]');
    const search = workspace.locator('input[type="text"]');
    const interpret = workspace.getByRole('button', { name: '解梦', exact: true });

    await expect(workspace.getByRole('heading', { name: '周公解梦', exact: true })).toBeVisible();
    await expect(workspace.getByText('热门梦象：', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '按类别浏览梦象', exact: true })).toBeVisible();

    await search.fill('蛇');
    await interpret.click();
    await expect(workspace.getByRole('heading', { name: '「蛇」解梦结果', exact: true })).toBeVisible();
    await expect(workspace.getByText('原版周公解梦古文', { exact: true })).toBeVisible();
    await expect(workspace.getByText('方位联动提示', { exact: true })).toBeVisible();

    const firstResult = await workspace.getByRole('heading', { name: '「蛇」解梦结果', exact: true }).locator('..').textContent();
    await search.fill('水');
    await search.press('Enter');
    await expect(workspace.getByRole('heading', { name: '「水」解梦结果', exact: true })).toBeVisible();
    await expect.poll(() => workspace.getByRole('heading', { name: '「水」解梦结果', exact: true }).locator('..').textContent()).not.toBe(firstResult);

    const usageCard = workspace.locator('section').filter({ hasText: '使用说明' });
    await expect(usageCard).toBeVisible();
    await expect(usageCard).toContainText('非预言绝对');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
