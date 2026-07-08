import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * Chart Rendering E2E Tests（Phase 10 后：Canvas 已全部替换为 SVG）
 * 验证各工具的 SVG 图表能正常渲染、可见、有尺寸、无控制台致命错误。
 */

/** 等待 legacy 引擎加载完成（八字/紫微/六爻等依赖 legacy adapter） */
async function waitForLegacy(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { EngineAdapterRegistry?: unknown }).EngineAdapterRegistry !== 'undefined',
    { timeout: 12000 },
  );
}

/** 切换到指定工具并等待工作区可见 */
async function openTool(page: import('@playwright/test').Page, navText: string, workspaceTestId: string): Promise<void> {
  await page.locator('[data-testid="nav-item"]').filter({ hasText: navText }).click();
  await page.waitForSelector(`[data-testid="${workspaceTestId}"]`, { timeout: 10000 });
}

/** 校验 SVG 图表可见且有合理尺寸 */
async function expectSvgVisible(page: import('@playwright/test').Page, testId: string): Promise<void> {
  // 六爻有本卦+变卦两个 hexagram-chart，取 first
  const svg = page.locator(`[data-testid="${testId}"]`).first();
  await expect(svg).toBeVisible({ timeout: 10000 });
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(50);
}

test.describe('Chart Rendering - Destiny Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForLegacy(page);
  });

  test('should render bazi SVG chart', async ({ page }) => {
    await openTool(page, '八字', 'workspace-bazi');
    await expectSvgVisible(page, 'bazi-pillars-chart');
  });

  test('should render ziwei SVG chart', async ({ page }) => {
    await openTool(page, '紫微', 'workspace-ziwei');
    await expectSvgVisible(page, 'ziwei-palace-grid');
  });

  test('should render liuyao SVG chart', async ({ page }) => {
    await openTool(page, '六爻', 'workspace-liuyao');
    await expectSvgVisible(page, 'hexagram-chart');
  });

  test('should render meihua SVG chart', async ({ page }) => {
    await openTool(page, '梅花', 'workspace-meihua');
    await expectSvgVisible(page, 'meihua-chart');
  });
});

test.describe('Chart Rendering - Feng Shui Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForLegacy(page);
  });

  test('should render fengshui compass SVG', async ({ page }) => {
    await openTool(page, '风水', 'workspace-fengshui');
    await expectSvgVisible(page, 'fengshui-compass');
  });

  test('should render feixing SVG chart', async ({ page }) => {
    await openTool(page, '飞星', 'workspace-feixing');
    await expectSvgVisible(page, 'nine-palace-grid');
  });

  test('should render bazhai SVG chart', async ({ page }) => {
    await openTool(page, '八宅', 'workspace-bazhai');
    await expectSvgVisible(page, 'eight-mansions-chart');
  });
});

test.describe('Chart Rendering - Health Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should render yunqi SVG chart', async ({ page }) => {
    await waitForLegacy(page);
    await openTool(page, '五运六气', 'workspace-yunqi');
    await expectSvgVisible(page, 'yunqi-chart');
  });

  test('should render tizhi radar SVG chart', async ({ page }) => {
    // 体质雷达图是纯 React 自包含，不依赖 legacy
    await openTool(page, '体质', 'workspace-tizhi');
    await expectSvgVisible(page, 'radar-chart');
  });
});

test.describe('Chart Rendering - No Console Errors', () => {
  test('should not have chart-related errors across all tools', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const tools = ['八字', '紫微', '六爻', '梅花', '风水', '飞星', '八宅', '五运六气', '体质'];
    for (const tool of tools) {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
      try {
        await waitForLegacy(page);
      } catch {
        // legacy 加载超时不阻塞：体质等不依赖 legacy 仍可校验
      }
      await page.locator('[data-testid="nav-item"]').filter({ hasText: tool }).click();
      await page.waitForTimeout(2000);
    }

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('source map') &&
        !e.includes('favicon') &&
        !e.includes('Manifest') &&
        !e.includes('React DevTools'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Chart Responsiveness', () => {
  test('should keep SVG visible on viewport change', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    // 体质雷达图自包含，适合做响应式校验
    await openTool(page, '体质', 'workspace-tizhi');
    const svg = page.locator('[data-testid="radar-chart"]');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    const box1 = await svg.boundingBox();
    expect(box1).not.toBeNull();
    expect(box1!.width).toBeGreaterThan(100);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const box2 = await svg.boundingBox();
    expect(box2).not.toBeNull();
    expect(box2!.width).toBeGreaterThan(0);
    expect(box2!.height).toBeGreaterThan(0);
  });
});
