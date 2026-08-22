import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './p13-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

async function openIchingLibrary(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/#reader`);
  const reader = page.locator('[data-testid="workspace-reader"]');
  await expect(reader.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible({ timeout: 60000 });
  await reader.getByRole('button', { name: '周易六十四卦', exact: true }).click();
  await expect(reader.getByRole('heading', { name: '周易六十四卦' })).toBeVisible();
  return reader;
}

test.describe('周易六十四卦全量用户验收', () => {
  test.setTimeout(90000);

  test('文王卦序完整展示 64 卦和乾卦原文', async ({ page }) => {
    const reader = await openIchingLibrary(page);
    await expect(reader.getByTestId('iching-sequence-grid').getByRole('button')).toHaveCount(64);
    await expect(reader.getByRole('heading', { name: '䷀ 乾为天' })).toBeVisible();
    await expect(reader.getByRole('heading', { name: '卦辞' })).toBeVisible();
    await expect(reader.getByRole('heading', { name: '爻辞' })).toBeVisible();
    await expect(reader.getByRole('heading', { name: '彖传' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('按卦名搜索晋卦、选择动爻并查看关系卦', async ({ page }) => {
    const reader = await openIchingLibrary(page);
    await reader.getByLabel('查找六十四卦').fill('火地晋');
    await expect(reader.getByText('找到 1 卦')).toBeVisible();
    await reader.getByTestId('iching-sequence-grid').getByRole('button', { name: /晋/ }).click();

    await expect(reader.getByRole('heading', { name: '䷢ 火地晋' })).toBeVisible();
    await expect(reader.getByText('上离（火） · 下坤（地）')).toBeVisible();
    await reader.getByRole('button', { name: '二爻', exact: true }).click();
    await expect(reader.getByRole('button', { name: /变卦/ })).toBeVisible();
    await expect(reader.getByRole('button', { name: /错卦/ })).toBeVisible();
    await expect(reader.getByRole('button', { name: /综卦/ })).toBeVisible();
    await expect(reader.getByRole('button', { name: /互卦/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('上下卦矩阵覆盖 64 种组合并可打开指定卦', async ({ page }) => {
    const reader = await openIchingLibrary(page);
    await reader.getByRole('tab', { name: '上下卦矩阵' }).click();
    const matrix = reader.getByTestId('iching-trigram-matrix');
    await expect(matrix.getByRole('button')).toHaveCount(64);
    await matrix.getByRole('button', { name: '上离下坤，第35卦晋' }).click();
    await expect(reader.getByRole('heading', { name: '䷢ 火地晋' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('六爻阴阳定位可从乾卦切换到姤卦', async ({ page }) => {
    const reader = await openIchingLibrary(page);
    await reader.getByRole('tab', { name: '六爻定位' }).click();
    const locator = reader.getByTestId('iching-line-locator');
    await expect(locator.getByRole('heading', { name: '第1卦 · 乾' })).toBeVisible();
    await locator.getByRole('button', { name: '初爻，当前为阳爻，点击切换' }).click();
    await expect(locator.getByRole('heading', { name: '第44卦 · 姤' })).toBeVisible();
    await locator.getByRole('button', { name: '阅读此卦原文' }).click();
    await expect(reader.getByRole('heading', { name: '䷫ 天风姤' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
