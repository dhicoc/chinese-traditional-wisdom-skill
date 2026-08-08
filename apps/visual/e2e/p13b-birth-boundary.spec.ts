import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

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

async function enableLongitudeCorrection(page: Page) {
  await page.getByText('八字地点与校时（可选）').click();
  await page.getByLabel('按经度换算地方平太阳时').check();
}

test.describe('P1.3b 出生时间边界验收', () => {
  test('默认不校时时，民用时间直接作为排盘时间', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '分', '37');

    await expect(page.getByText('民用时间：1990-06-15 12:37')).toBeVisible();
    await expect(page.getByText('排盘时间：')).not.toBeVisible();
  });

  test('经度与 UTC 偏移对应标准经线时，显示零分钟校正', async ({ page }) => {
    await openBazi(page);
    await enableLongitudeCorrection(page);
    await fillBirthField(page, '经度（东正西负）', '120');
    await fillBirthField(page, '实际 UTC 偏移（分钟）', '480');

    await expect(page.getByText(/排盘时间：1990-06-15 12:00（地方平太阳时，校正 \+0 分钟）/)).toBeVisible();
  });

  test('校时跨越时辰时，显示时辰边界提示', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '时', '13');
    await fillBirthField(page, '分', '00');
    await enableLongitudeCorrection(page);
    await fillBirthField(page, '经度（东正西负）', '115');
    await fillBirthField(page, '实际 UTC 偏移（分钟）', '480');

    await expect(page.getByText(/排盘时间：1990-06-15 12:40/)).toBeVisible();
    await expect(page.getByText(/校时已跨越时辰/)).toBeVisible();
  });

  test('校时跨越日期与子初时，保留两种时间并显示边界提示', async ({ page }) => {
    await openBazi(page);
    await fillBirthField(page, '时', '00');
    await fillBirthField(page, '分', '10');
    await enableLongitudeCorrection(page);
    await fillBirthField(page, '经度（东正西负）', '105');
    await fillBirthField(page, '实际 UTC 偏移（分钟）', '480');

    await expect(page.getByText('民用时间：1990-06-15 00:10')).toBeVisible();
    await expect(page.getByText(/排盘时间：1990-06-14 23:10/)).toBeVisible();
    await expect(page.getByText(/校时已跨越日期、子初换日边界/)).toBeVisible();
  });
});
