import path from 'node:path';
import { test, expect } from '@playwright/test';
import { BASE_URL, expectNoHorizontalOverflow, openWorkspace } from './p13-helpers';

test.describe('P1.3x 本地历史与收藏用户侧验收', () => {
  test.setTimeout(90000);

  test('导航记录可收藏、删除，并呈现本地脱敏隐私边界', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    await openWorkspace(page, '古籍阅读', 'reader');
    const preview = page.getByTestId('history-save-preview');
    await expect(preview.getByText('保存前预览（默认不保存）')).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('FORTUNE_HISTORY') || '[]').length)).toBe(0);
    await preview.getByRole('button', { name: '保存脱敏摘要' }).click();
    const workspace = await openWorkspace(page, '本地历史与收藏', 'history');

    await expect(workspace.locator('h2').filter({ hasText: '本地历史与收藏' })).toBeVisible();
    await expect(workspace.getByText('历史记录', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('button', { name: '收藏 (0)', exact: true })).toBeVisible();
    await expect(workspace.getByText('最大保留数', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible();
    await expect(workspace.getByLabel('历史自动过期')).toHaveValue('30');
    await expect(workspace.getByText('默认不保存。', { exact: false })).toBeVisible();

    const readerEntry = workspace.getByRole('heading', { name: '古籍阅读', exact: true }).locator('xpath=ancestor::article');
    await readerEntry.getByTitle('收藏').click();
    await expect(readerEntry.getByTitle('取消收藏')).toBeVisible();

    await workspace.getByRole('button', { name: /收藏 \(1\)/ }).click();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toBeVisible();

    await workspace.getByRole('button', { name: /历史 \(1\)/ }).click();
    const readerEntryInHistory = workspace.getByRole('heading', { name: '古籍阅读', exact: true }).locator('xpath=ancestor::article');
    await readerEntryInHistory.getByRole('button', { name: '删除', exact: true }).click();
    await expect(workspace.getByRole('heading', { name: '古籍阅读', exact: true })).toHaveCount(0);

    await expect(workspace.getByText('默认不保存。', { exact: false })).toBeVisible();
    await expect(workspace.getByText('数据完全本地化，不上传任何服务器。')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('可复核结果包先预览再保存，并可原样导出', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    const workspace = await openWorkspace(page, '本地历史与收藏', 'history');
    const input = workspace.getByLabel('导入可复核结果包');
    await input.setInputFiles(path.resolve('src/__fixtures__/analysis/history-safe-bundle.success.json'));
    const preview = workspace.getByTestId('bundle-import-preview');
    await expect(preview.getByText('导入前预览')).toBeVisible();
    await expect(preview).toContainText('2 项已核验结构化事实');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('FORTUNE_HISTORY') || '[]').length)).toBe(0);
    await preview.getByRole('button', { name: '保存到本地历史' }).click();
    const entry = workspace.getByRole('heading', { name: /可复核结果包/ }).locator('xpath=ancestor::article');
    await expect(entry).toContainText('已核验结构化事实：2 项');
    const downloadPromise = page.waitForEvent('download');
    await entry.getByRole('button', { name: '导出可复核结果包' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('bazi_calculate-verified-bundle.json');
  });

});
