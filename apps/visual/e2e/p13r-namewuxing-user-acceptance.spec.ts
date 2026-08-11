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

test.describe('P1.3r 姓名五行用户侧验收', () => {
  test.setTimeout(90000);

  test('真实姓名输入驱动笔画、五格与五行结果刷新，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '姓名五行', 'namewuxing');
    const workspace = page.locator('[data-testid="workspace-namewuxing"]');
    const surname = workspace.locator('input[type="text"]').nth(0);
    const givenName = workspace.locator('input[type="text"]').nth(1);
    const analyze = workspace.getByRole('button', { name: '分析五行', exact: true });

    await expect(workspace.getByRole('heading', { name: '姓名五行', exact: true })).toBeVisible();
    await expect(analyze).toBeDisabled();

    await surname.fill('张');
    await givenName.fill('伟');
    await expect(analyze).toBeEnabled();
    await analyze.click();

    await expect(workspace.getByRole('heading', { name: '字元笔画', exact: true })).toBeVisible();
    await expect(workspace.getByText('张', { exact: true })).toBeVisible();
    await expect(workspace.getByText('伟', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五格数理', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '三才配置', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五维评分', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '五行平衡', exact: true })).toBeVisible();

    const firstSummary = await workspace.getByRole('heading', { name: '字元笔画', exact: true }).locator('..').textContent();
    await surname.fill('李');
    await givenName.fill('子涵');
    await analyze.click();
    await expect.poll(() => workspace.getByRole('heading', { name: '字元笔画', exact: true }).locator('..').textContent()).not.toBe(firstSummary);
    await expect(workspace.getByText('李', { exact: true })).toBeVisible();
    await expect(workspace.getByText('子', { exact: true })).toBeVisible();
    await expect(workspace.getByText('涵', { exact: true })).toBeVisible();

    const usageCard = workspace.locator('section').filter({ hasText: '使用说明' });
    await expect(usageCard).toBeVisible();
    await expect(usageCard).toContainText('姓名学为传统文化参考，不构成命名决策依据。');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
