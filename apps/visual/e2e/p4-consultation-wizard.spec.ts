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

  test('八宅请求显示必要字段并转交既有工作区', async ({ page }) => {
    await page.goto(`${BASE_URL}#consult`);
    const wizard = page.getByTestId('consultation-wizard');
    await wizard.getByTestId('consultation-query').fill('八宅卧室方位布局');
    await wizard.getByRole('button', { name: '生成本地方案' }).click();
    await expect(wizard.getByRole('heading', { name: '准备转交：calc_bazhai' })).toBeVisible();
    await expect(wizard.getByTestId('consultation-handoff')).toContainText('出生年份');
    await wizard.getByRole('button', { name: '打开八宅大游年' }).click();
    await expect(page.locator('[data-testid="workspace-bazhai"]')).toBeVisible();
  });
});
