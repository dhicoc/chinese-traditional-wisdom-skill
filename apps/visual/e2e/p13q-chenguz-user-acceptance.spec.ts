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

test.describe('P1.3q 袁天罡称骨用户侧验收', () => {
  test.setTimeout(90000);

  test('全局出生年份与传抄版本刷新骨重、歌诀和解读，并呈现传统参考边界', async ({ page }) => {
    await openWorkspace(page, '袁天罡称骨', 'chenguz');
    const workspace = page.locator('[data-testid="workspace-chenguz"]');

    await expect(workspace.getByRole('heading', { name: '袁天罡称骨算命', exact: true })).toBeVisible();
    await expect(workspace.getByText('四柱骨重', { exact: true })).toBeVisible();
    await expect(workspace.getByText(/称骨歌 · .+两/)).toBeVisible();
    await expect(workspace.getByRole('heading', { name: /称骨 · .+解读/ })).toBeVisible();
    await expect(workspace.getByText('称骨歌版本（无唯一正本，三版民间传抄本供选择）')).toBeVisible();

    const result = workspace.getByText(/称骨 · 总重.+两/).first().locator('..');
    const initialResult = await result.textContent();
    const birthYear = page.locator('input[aria-label="全局出生年"]:visible');
    await expect(birthYear).toHaveValue('1990');

    await birthYear.fill('1983');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1983');
    await expect.poll(() => result.textContent()).not.toBe(initialResult);

    const yearBone = workspace.getByText(/^年（癸亥）$/).locator('..');
    await expect(yearBone).toContainText('7钱');
    await workspace.getByRole('button', { name: '民间传抄本', exact: true }).click();
    await expect(yearBone).toContainText('6钱');
    await expect(workspace.getByText('民间口耳相传的版本，用词通俗，个别字句与通行本不同。')).toBeVisible();

    await workspace.getByRole('button', { name: '全本异文', exact: true }).click();
    await expect(yearBone).toContainText('7钱');
    await expect(workspace.getByText('另一路流传本，诗诀异文较多，部分条目命格描述与其他版本差异明显。')).toBeVisible();

    await birthYear.fill('1990');
    await birthYear.press('Tab');
    await expect(birthYear).toHaveValue('1990');
    await expect(workspace.getByText('称骨结果仅作传统民俗文化学习参考，不作为现实决策依据。')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  });
});
