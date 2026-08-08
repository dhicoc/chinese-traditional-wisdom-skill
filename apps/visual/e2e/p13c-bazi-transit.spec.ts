import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3c 八字动态层联动', () => {
  test('流年、流月、流日共用日期锚点，并可连续浏览日期', async ({ page }) => {
    await page.goto(`${BASE_URL}#bazi`);
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 10000 });

    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible();

    const dateInput = workspace.getByLabel('目标日期');
    await dateInput.fill('2025-07-15');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');
    await expect(workspace.getByText('流年', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流月', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流日', { exact: true })).toBeVisible();

    await workspace.getByRole('button', { name: '后一日' }).click();
    await expect(dateInput).toHaveValue('2025-07-16');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');

    await workspace.getByRole('button', { name: '前一日' }).click();
    await expect(dateInput).toHaveValue('2025-07-15');

    await dateInput.fill('2025-12-31');
    await workspace.getByRole('button', { name: '后一日' }).click();
    await expect(dateInput).toHaveValue('2026-01-01');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2026');
  });
});
