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

test.describe('P1.3t 每日节律用户侧验收', () => {
  test.setTimeout(90000);

  test('真实时辰选择刷新经络详情，并呈现节气与医疗边界', async ({ page }) => {
    await openWorkspace(page, '每日节律', 'rhythm');
    const workspace = page.locator('[data-testid="workspace-rhythm"]');

    await expect(workspace.getByRole('heading', { name: '每日节律', exact: true })).toBeVisible();
    await expect(workspace.getByText('当前节气', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '子午流注经络钟', exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '十二时辰', exact: true })).toBeVisible();

    await workspace.getByRole('button', { name: /子时/ }).click();
    const selectedDetail = workspace.getByRole('heading', { name: '子时', exact: true }).last().locator('..').locator('..').locator('..');
    await expect(selectedDetail).toContainText('胆经');
    await expect(selectedDetail).toContainText('深度睡眠，养胆气');

    await workspace.getByRole('button', { name: /午时/ }).click();
    const updatedDetail = workspace.getByRole('heading', { name: '午时', exact: true }).last().locator('..').locator('..').locator('..');
    await expect(updatedDetail).toContainText('心经');
    await expect(updatedDetail).toContainText('午餐小憩，养心气');
    await expect(updatedDetail).not.toContainText('胆经');

    const usageCard = workspace.locator('section').filter({ hasText: '使用说明' });
    await expect(usageCard).toBeVisible();
    await expect(usageCard).toContainText('不做医疗诊断');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
