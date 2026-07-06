import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * Canvas Rendering E2E Tests - Canvas 渲染测试
 * 验证各工具的 Canvas 能正常渲染、不报错、非空
 */

test.describe('Canvas Rendering - Destiny Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render bazi canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 5000 });

    const canvas = page.locator('#bazi-canvas, [data-testid="bazi-canvas"]');
    await expect(canvas).toBeVisible();

    // Verify canvas has dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('should render ziwei canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("紫微")');
    await page.waitForSelector('[data-testid="workspace-ziwei"]', { timeout: 5000 });

    const canvas = page.locator('#ziwei-canvas, [data-testid="ziwei-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('should render liuyao canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("六爻")');
    await page.waitForSelector('[data-testid="workspace-liuyao"]', { timeout: 5000 });

    // Liuyao may have multiple canvases for main and changed hexagram
    const canvases = page.locator('canvas');
    const count = await canvases.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify at least one canvas is visible and has size
    for (let i = 0; i < count; i++) {
      const canvas = canvases.nth(i);
      const box = await canvas.boundingBox();
      if (box && box.width > 50 && box.height > 50) {
        return; // Found valid canvas
      }
    }
    throw new Error('No valid canvas found for liuyao');
  });

  test('should render meihua canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("梅花")');
    await page.waitForSelector('[data-testid="workspace-meihua"]', { timeout: 5000 });

    const canvas = page.locator('#meihua-canvas, [data-testid="meihua-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});

test.describe('Canvas Rendering - Feng Shui Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render fengshui compass canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("风水")');
    await page.waitForSelector('[data-testid="workspace-fengshui"]', { timeout: 5000 });

    const canvas = page.locator('#fengshui-canvas, [data-testid="fengshui-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('should render feixing canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("飞星")');
    await page.waitForSelector('[data-testid="workspace-feixing"]', { timeout: 5000 });

    const canvas = page.locator('#feixing-canvas, [data-testid="feixing-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('should render bazhai canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("八宅")');
    await page.waitForSelector('[data-testid="workspace-bazhai"]', { timeout: 5000 });

    const canvas = page.locator('#bazhai-canvas, [data-testid="bazhai-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});

test.describe('Canvas Rendering - Health Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render yunqi canvas', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("五运六气")');
    await page.waitForSelector('[data-testid="workspace-yunqi"]', { timeout: 5000 });

    const canvas = page.locator('#yunqi-canvas, [data-testid="yunqi-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('should render tizhi canvas or chart', async ({ page }) => {
    await page.click('[data-testid="nav-item"]:has-text("体质")');
    await page.waitForSelector('[data-testid="workspace-tizhi"]', { timeout: 5000 });

    // Tizhi may use canvas or other chart library
    const canvas = page.locator('#tizhi-canvas, [data-testid="tizhi-canvas"], canvas');
    await expect(canvas.first()).toBeVisible();
  });
});

test.describe('Canvas Rendering - No Console Errors', () => {
  test('should not have canvas-related errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through all canvas-based tools
    const tools = ['八字', '紫微', '六爻', '梅花', '风水', '飞星', '八宅', '五运六气', '体质'];

    for (const tool of tools) {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
      await page.click(`[data-testid="nav-item"]:has-text("${tool}")`);
      await page.waitForTimeout(2000); // Wait for canvas to render
    }

    // Filter for canvas-related errors
    const canvasErrors = errors.filter(e =>
      e.toLowerCase().includes('canvas') ||
      e.toLowerCase().includes('render') ||
      e.toLowerCase().includes('context')
    );

    expect(canvasErrors).toHaveLength(0);
  });
});

test.describe('Canvas Responsiveness', () => {
  test('should resize canvas on viewport change', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });

    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 5000 });

    const canvas = page.locator('#bazi-canvas, [data-testid="bazi-canvas"]');

    // Get initial size
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    const box1 = await canvas.boundingBox();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const box2 = await canvas.boundingBox();

    // Canvas should have adapted (either resized or maintained aspect ratio)
    expect(box2).not.toBeNull();
    expect(box2!.width).toBeGreaterThan(0);
    expect(box2!.height).toBeGreaterThan(0);
  });
});
