import { test, expect } from '@playwright/test';
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P4-01 统一咨询向导', () => {
  test.setTimeout(90000);

  test('自然语言事业咨询完成八字缺参确认与本地核验结果', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await expect(wizard.getByRole('heading', { name: '统一咨询向导' })).toBeVisible({ timeout: 60000 });
    await wizard.getByTestId('consultation-query').fill('我想了解自己的事业方向');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await expect(wizard.getByText('bazi_calculate')).toBeVisible();
    const form = wizard.getByTestId('consultation-bazi-form');
    await form.getByRole('button', { name: '运行本地八字计算' }).click();
    await expect(wizard.getByRole('alert')).toContainText('确认本次按民用出生记录');
    await form.getByLabel('确认使用民用时间').check();
    await form.getByRole('button', { name: '运行本地八字计算' }).click();
    const result = wizard.getByTestId('consultation-result');
    await expect(result.getByText('已核验结构化结果')).toBeVisible();
    await expect(result).toContainText('年柱');
    await expect(result).toContainText('facts verified');
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain('我想了解自己的事业方向');
  });

  test('庄子知识问题不排盘并转交古籍阅读', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await wizard.getByTestId('consultation-query').fill('庄子怎么看焦虑');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await expect(wizard.getByText('本次不需要排盘工具')).toBeVisible();
    await wizard.getByRole('button', { name: '打开古籍阅读' }).click();
    await expect(page.locator('[data-testid="workspace-reader"]')).toBeVisible();
  });

  test('八宅请求在向导内完成结构化计算', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await wizard.getByTestId('consultation-query').fill('八宅卧室方位布局');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    const form = wizard.getByTestId('consultation-bazhai-form');
    await form.getByLabel('向导八宅查询年份').fill('2026');
    await form.getByRole('button', { name: '运行本地八宅计算' }).click();
    await expect(wizard.getByTestId('consultation-result')).toContainText('命卦');
    await expect(wizard.getByTestId('consultation-result')).toContainText('facts verified');
  });

  test('飞星与黄历使用显式时间并在向导内完成计算', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await wizard.getByTestId('consultation-query').fill('流年飞星 2026');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await wizard.getByLabel('向导飞星年份').fill('2026');
    await wizard.getByRole('button', { name: '运行本地飞星计算' }).click();
    await expect(wizard.getByTestId('consultation-result')).toContainText('中宫星数');

    await wizard.getByTestId('consultation-query').fill('2026-08-22 黄历宜忌');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await wizard.getByLabel('向导黄历日期').fill('2026-08-22');
    await wizard.getByRole('button', { name: '运行本地黄历计算' }).click();
    await expect(wizard.getByTestId('consultation-result')).toContainText('值日星宿');
    await expect(wizard.getByTestId('consultation-result')).toContainText('facts verified');
  });

  test('未内嵌执行的奇门候选转交既有工作区', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await wizard.getByTestId('consultation-query').fill('奇门遁甲排盘');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await expect(wizard.getByRole('heading', { name: '准备转交：arrange_qimen' })).toBeVisible();
    await wizard.getByRole('button', { name: '打开奇门遁甲' }).click();
    await expect(page.locator('[data-testid="workspace-qimen"]')).toBeVisible();
  });
});
