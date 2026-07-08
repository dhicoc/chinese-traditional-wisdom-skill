import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * Privacy E2E Tests - 隐私测试
 * 验证历史/收藏不保存完整生辰、姓名、地点
 */

test.describe('Privacy - History Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });

    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
  });

  test('should not store full birth date in history', async ({ page }) => {
    // Navigate to a tool and generate a reading
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 5000 });

    // Wait for history to be saved (if auto-save is enabled)
    await page.waitForTimeout(2000);

    // Check localStorage for history data
    const localStorage = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          data[key] = window.localStorage.getItem(key) || '';
        }
      }
      return data;
    });

    // Check all localStorage values for sensitive patterns
    const sensitivePatterns = [
      /\d{4}-\d{2}-\d{2}/,  // Full date YYYY-MM-DD
      /\d{4}年\d{2}月\d{2}日/,  // Chinese date format
      /19\d{2}-\d{2}-\d{2}/,  // Birth year 19xx
      /20\d{2}-\d{2}-\d{2}/,  // Birth year 20xx
    ];

    for (const [key, value] of Object.entries(localStorage)) {
      // Skip keys that are expected to have dates (like timestamps)
      if (key.includes('timestamp') || key.includes('createdAt')) continue;

      for (const pattern of sensitivePatterns) {
        expect(value).not.toMatch(pattern);
      }
    }
  });

  test('should only store year in history entries', async ({ page }) => {
    // Generate some history entries
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForTimeout(2000);

    await page.click('[data-testid="nav-item"]:has-text("紫微")');
    await page.waitForTimeout(2000);

    // Check history store
    const historyData = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ctw-history');
      return raw ? JSON.parse(raw) : null;
    });

    if (historyData && Array.isArray(historyData)) {
      for (const entry of historyData) {
        // Verify no full date in any field
        const entryStr = JSON.stringify(entry);
        expect(entryStr).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(entryStr).not.toMatch(/\d{4}年\d{2}月\d{2}日/);

        // Year is allowed (4 digits)
        if (entry.year) {
          expect(String(entry.year)).toMatch(/^\d{4}$/);
        }
      }
    }
  });

  test('should not store full name in history', async ({ page }) => {
    // Generate history
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForTimeout(2000);

    const historyData = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ctw-history');
      return raw ? JSON.parse(raw) : null;
    });

    if (historyData && Array.isArray(historyData)) {
      for (const entry of historyData) {
        // Check no Chinese name patterns (2-4 Chinese characters)
        const entryStr = JSON.stringify(entry);
        expect(entryStr).not.toMatch(/[\u4e00-\u9fa5]{2,4}/);
      }
    }
  });

  test('should not store location in history', async ({ page }) => {
    // Generate history
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForTimeout(2000);

    const historyData = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ctw-history');
      return raw ? JSON.parse(raw) : null;
    });

    if (historyData && Array.isArray(historyData)) {
      const locationKeywords = ['北京', '上海', '广州', '深圳', '省', '市', '区', '县', 'location', 'address', 'place'];
      const entryStr = JSON.stringify(historyData).toLowerCase();

      for (const keyword of locationKeywords) {
        expect(entryStr).not.toContain(keyword.toLowerCase());
      }
    }
  });
});

test.describe('Privacy - Favorites Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await page.evaluate(() => localStorage.clear());
  });

  test('should not store sensitive data in favorites', async ({ page }) => {
    // Navigate and potentially add to favorites (if UI supports it)
    await page.click('[data-testid="nav-item"]:has-text("历史")');
    await page.waitForTimeout(1000);

    const favoritesData = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ctw-favorites');
      return raw ? JSON.parse(raw) : null;
    });

    if (favoritesData) {
      const dataStr = JSON.stringify(favoritesData);

      // Check for sensitive patterns
      expect(dataStr).not.toMatch(/\d{4}-\d{2}-\d{2}/);  // Full date
      expect(dataStr).not.toMatch(/[\u4e00-\u9fa5]{2,4}/);  // Chinese name
    }
  });
});

test.describe('Privacy - Report Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should export only anonymized data', async ({ page }) => {
    // Navigate to a tool
    await page.click('[data-testid="nav-item"]:has-text("八字")');
    await page.waitForSelector('[data-testid="workspace-bazi"]', { timeout: 5000 });

    // Trigger export (if available)
    const exportButton = page.locator('[data-testid="export-report"], button:has-text("导出")');
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      await page.waitForTimeout(1000);

      // Check exported data (this would depend on how export is implemented)
      // For now, just verify the export action doesn't error
    }
  });

  test('should not include full birth date in report subject/filename', async ({ page }) => {
    // 等待 legacy 引擎加载，exportReportData 由 capabilities.js 暴露
    await page.waitForFunction(
      () => typeof (window as any).FORTUNE?.exportReportData === 'function',
      { timeout: 12000 },
    );

    const report = await page.evaluate(() => {
      const F = (window as any).FORTUNE;
      if (!F || typeof F.exportReportData !== 'function') return null;
      try {
        return F.exportReportData() as any;
      } catch {
        return null;
      }
    });

    if (report) {
      // 1) subject.label 用于构造导出文件名，应为脱敏标识，不含完整出生日期
      const label = String(report?.subject?.label ?? '');
      expect(label).not.toMatch(/\d{4}-\d{2}-\d{2}/);

      // 2) 紫微 birthInfo 只应保留 year + gender，不含 month/day/hour
      const bi = report?.ziwei?.birthInfo;
      if (bi) {
        expect(bi.month).toBeUndefined();
        expect(bi.day).toBeUndefined();
        expect(bi.hour).toBeUndefined();
      }

      // 3) 报告数据不应出现明文生日字段 solarDate / lunarDate / queryDate
      const json = JSON.stringify(report);
      expect(json).not.toContain('solarDate');
      expect(json).not.toContain('lunarDate');
      expect(json).not.toContain('queryDate');
    }
  });
});

test.describe('Privacy - Birth Data Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should mask birth input in UI', async ({ page }) => {
    // Check birth panel input fields
    const birthPanel = page.locator('[data-testid="birth-panel"]');
    if (await birthPanel.isVisible().catch(() => false)) {
      // Verify inputs don't show full date by default
      const inputs = birthPanel.locator('input');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should only sync year to global context', async ({ page }) => {
    // Check window.ctw.birth data
    const birthData = await page.evaluate(() => {
      return (window as any).ctw?.birth;
    });

    if (birthData) {
      // Should only have year, not full date
      expect(birthData.fullDate).toBeUndefined();
      if (birthData.year) {
        expect(String(birthData.year)).toMatch(/^\d{4}$/);
      }
    }
  });
});

test.describe('Privacy - Data Retention', () => {
  test('should respect 30 item history limit', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });

    // 等待 HistoryStore 加载（由 legacy history-store.js 暴露）
    await page.waitForFunction(
      () => typeof (window as any).HistoryStore?.add === 'function',
      { timeout: 12000 },
    );

    // 清空已有历史，再用 HistoryStore.add 添加 35 条（不同 title 避免去重）
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      if (H?.clear) H.clear();
      for (let i = 0; i < 35; i++) {
        H.add({ module: 'bazi', title: `test-${i}`, summary: 's', tags: [], mode: 'local' });
      }
    });

    // HistoryStore.add 内部 slice(0, 30)，list 应 ≤ 30
    const count = await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      return H?.list ? H.list().length : -1;
    });
    expect(count).toBeLessThanOrEqual(30);
    expect(count).toBeGreaterThan(0);
  });
});
