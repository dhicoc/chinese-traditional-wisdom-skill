import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

async function openBazi(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE_URL);
  await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  await page.getByRole('tab', { name: '八字命盘' }).click();
  await expect(page.getByRole('heading', { name: '八字排盘' })).toBeVisible();
}

async function fillBirthField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.blur();
}

test.describe('出生时间与真太阳时边界验收', () => {
  test('默认以民用时间展示，并明确等待 Agent 真太阳时核验', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '分', '37');

    await expect(page.getByText('民用时间：1990-06-15 12:37')).toBeVisible();
    await expect(page.getByText('等待 Agent 核验出生地点、历史时区与夏令时；当前暂按民用时间展示，尚未称为真太阳时排盘。')).toBeVisible();
    await expect(page.getByText('排盘时间：')).not.toBeVisible();
  });

  test('生辰面板不再提供手动经度或 UTC 偏移校时', async ({ page }) => {
    await openBazi(page);

    await expect(page.getByText('八字地点与校时（可选）')).toHaveCount(0);
    await expect(page.getByLabel('经度（东正西负）')).toHaveCount(0);
    await expect(page.getByLabel('实际 UTC 偏移（分钟）')).toHaveCount(0);
  });

  test('修改小时和分钟后保留民用出生记录', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '时', '13');
    await fillBirthField(page, '分', '5');

    await expect(page.getByText('民用时间：1990-06-15 13:05')).toBeVisible();
  });

  test('子初附近的民用时间不会被前端自行校正', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '时', '00');
    await fillBirthField(page, '分', '10');

    await expect(page.getByText('民用时间：1990-06-15 00:10')).toBeVisible();
    await expect(page.getByText(/真太阳时已跨越/)).toHaveCount(0);
  });
});
