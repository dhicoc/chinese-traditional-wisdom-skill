import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * Navigation E2E Tests - 导航测试
 * 验证标签切换、路由、CommandBar 功能
 */

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should navigate to bazi tab', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
    await expect(page.locator('text=八字命盘')).toBeVisible();
  });

  test('should navigate to ziwei tab', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("紫微")');
    await expect(page.locator('[data-testid="workspace-ziwei"]')).toBeVisible();
    await expect(page.locator('text=紫微斗数')).toBeVisible();
  });

  test('should navigate to liuyao tab', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("六爻")');
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toBeVisible();
    await expect(page.locator('text=六爻占卜')).toBeVisible();
  });

  test('should navigate to meihua tab', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("梅花")');
    await expect(page.locator('[data-testid="workspace-meihua"]')).toBeVisible();
    await expect(page.locator('text=梅花易数')).toBeVisible();
  });

  test('should navigate to fengshui tab', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("风水")');
    await expect(page.locator('[data-testid="workspace-fengshui"]')).toBeVisible();
  });

  test('should navigate through all tool tabs', async ({ page }) => {
    const tools = [
      { name: '八字', id: 'bazi' },
      { name: '紫微', id: 'ziwei' },
      { name: '六爻', id: 'liuyao' },
      { name: '梅花', id: 'meihua' },
      { name: '风水', id: 'fengshui' },
      { name: '飞星', id: 'feixing' },
      { name: '八宅', id: 'bazhai' },
      { name: '五运六气', id: 'yunqi' },
      { name: '体质', id: 'tizhi' },
    ];

    for (const tool of tools) {
      await page.click(`[data-testid="nav-item"]:has-text("${tool.name}")`);
      await expect(page.locator(`[data-testid="workspace-${tool.id}"]`)).toBeVisible();
      // Small delay to ensure transition completes
      await page.waitForTimeout(200);
    }
  });

  test('should update URL hash on tab change', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#bazi');

    await page.click('[data-testid="nav-item"]:has-text("紫微")');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('#ziwei');
  });

  test('should restore tab from URL hash', async ({ page }) => {
    await page.goto(`${BASE_URL}#liuyao`);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="workspace-liuyao"]')).toBeVisible();
  });
});

test.describe('CommandBar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should open command bar with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
  });

  test('should search and navigate via command bar', async ({ page }) => {
    // Open command bar
    await page.click('[data-testid="command-bar"]');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Type search query
    await page.fill('[data-testid="command-input"]', '八字');
    await expect(page.locator('text=八字命盘')).toBeVisible();

    // Select result
    await page.click('text=八字命盘');
    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
  });

  test('should show year navigation in command bar', async ({ page }) => {
    await page.click('[data-testid="command-bar"]');
    await page.fill('[data-testid="command-input"]', '2026');

    // Should show year navigation options
    await expect(page.locator('text=流年飞星')).toBeVisible();
    await expect(page.locator('text=五运六气')).toBeVisible();
  });
});

test.describe('Home Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="home-dashboard"]', { timeout: 10000 });
  });

  test('should navigate to tool from home cards', async ({ page }) => {
    // Click on a tool card in home dashboard
    await page.click('[data-testid="tool-card-bazi"]');
    await expect(page.locator('[data-testid="workspace-bazi"]')).toBeVisible();
  });

  test('should show all tools in directory', async ({ page }) => {
    const toolCards = page.locator('[data-testid="tool-card"]');
    await expect(toolCards).toHaveCount(10);
  });
});
