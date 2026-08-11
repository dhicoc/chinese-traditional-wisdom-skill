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

test.describe('P1.3m 奇门遁甲用户侧验收', () => {
  test.setTimeout(90000);

  test('全局出生时刷新奇门盘面、值符值使与解读，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '奇门遁甲', 'qimen');
    const workspace = page.locator('[data-testid="workspace-qimen"]');

    await expect(workspace.getByRole('heading', { name: '奇门遁甲', exact: true })).toBeVisible();
    await expect(workspace.getByText('排盘概要', { exact: true })).toBeVisible();
    await expect(workspace.getByText('九宫式盘', { exact: true })).toBeVisible();
    await expect(workspace.getByTestId('qimen-chart')).toHaveAttribute('aria-label', '奇门九宫式盘');
    await expect(workspace.getByText('各宫格局详情', { exact: true })).toBeVisible();
    await expect(workspace.getByText('奇门遁甲解读', { exact: true })).toBeVisible();

    const chart = workspace.getByTestId('qimen-chart');
    const initialChart = await chart.textContent();
    const hourPillar = workspace.locator('dt').filter({ hasText: /^时柱$/ }).locator('..');
    const initialHourPillar = await hourPillar.textContent();
    const birthHour = page.locator('input[aria-label="全局出生时"]:visible');
    await expect(birthHour).toHaveValue('12');

    await birthHour.fill('9');
    await birthHour.press('Tab');
    await expect(birthHour).toHaveValue('9');
    await expect.poll(() => chart.textContent()).not.toBe(initialChart);
    await expect.poll(() => hourPillar.textContent()).not.toBe(initialHourPillar);

    await birthHour.fill('12');
    await birthHour.press('Tab');
    await expect(birthHour).toHaveValue('12');
    await expect.poll(() => chart.textContent()).toBe(initialChart);
    await expect.poll(() => hourPillar.textContent()).toBe(initialHourPillar);
    await expect(workspace.getByTestId('qimen-chart')).toBeVisible();

    await expect(workspace.getByText('奇门遁甲结果仅作传统术数文化学习参考，不作为现实决策依据。')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
