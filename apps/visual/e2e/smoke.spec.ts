import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * E2E Smoke Tests - 基础冒烟测试
 * 验证应用能正常启动，核心元素可见
 */

test.describe('Application Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React to hydrate
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should display app shell with title', async ({ page }) => {
    await expect(page.locator('h1').getByText('玄学排盘')).toBeVisible();
  });

  test('should render sidebar navigation', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
    // Verify all module nav items exist (home + 18 tools + 联合分析 = 19)
    const navItems = page.locator('[data-testid="nav-item"]');
    await expect(navItems).toHaveCount(21);
    // 联合分析标签应在侧边栏
    await expect(page.getByRole('button', { name: /联合分析/ })).toBeVisible();
  });

  test('should render command bar', async ({ page }) => {
    await expect(page.locator('[data-testid="command-bar"]')).toBeVisible();
    await expect(page.locator('text=搜索工具')).toBeVisible();
  });

  test('should display home dashboard by default', async ({ page }) => {
    await expect(page.locator('[data-testid="home-dashboard"]')).toBeVisible();
    await expect(page.getByTestId('home-dashboard').getByText('排盘信息')).toBeVisible();
    await expect(page.getByTestId('home-dashboard').getByText('四柱 / 九宫工作台')).toBeVisible();
  });

  test('should show core plate and birth input', async ({ page }) => {
    // 面向用户的核心内容：排盘信息 + 四柱命盘
    await expect(page.getByTestId('home-dashboard').getByText('排盘信息')).toBeVisible();
    await expect(page.getByTestId('home-dashboard').getByText('四柱 / 九宫工作台')).toBeVisible();
    await expect(page.getByTestId('home-bazi-plate')).toBeVisible();
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('source map') &&
      !e.includes('favicon') &&
      !e.includes('Manifest')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Legacy Script Loading', () => {
  test('should load legacy engine adapters', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000); // Wait for legacy scripts to load

    const hasEngineRegistry = await page.evaluate(() => {
      return typeof (window as any).EngineAdapterRegistry !== 'undefined';
    });

    expect(hasEngineRegistry).toBe(true);
  });

  test('should have FORTUNE global object', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const hasFortune = await page.evaluate(() => {
      return typeof (window as any).FORTUNE !== 'undefined';
    });

    expect(hasFortune).toBe(true);
  });
});

test.describe('Responsive Layout', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Mobile should show workspace tabs instead of sidebar
    await expect(page.locator('[data-testid="workspace-tabs"]').first()).toBeVisible();
  });

  test('should adapt to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);

    // Desktop should show sidebar
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
  });
});
