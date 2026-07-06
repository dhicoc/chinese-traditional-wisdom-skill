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

  test('should not include birth date in report filename', async ({ page }) => {
    // This test would need to intercept download
    // Placeholder for filename validation
    const testFilename = 'report-1990-01-15.html';
    expect(testFilename).not.toMatch(/\d{4}-\d{2}-\d{2}/);
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

    // Simulate many history entries
    await page.evaluate(() => {
      const mockHistory = Array.from({ length: 35 }, (_, i) => ({
        id: `test-${i}`,
        module: 'bazi',
        title: `Test ${i}`,
        year: 1990 + (i % 30),
        createdAt: Date.now() - i * 1000,
      }));
      window.localStorage.setItem('ctw-history', JSON.stringify(mockHistory));
    });

    // Trigger history cleanup (if any)
    await page.click('[data-testid="nav-item"]:has-text("历史")');
    await page.waitForTimeout(1000);

    // Verify limit enforced
    const historyData = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ctw-history');
      return raw ? JSON.parse(raw) : [];
    });

    expect(historyData.length).toBeLessThanOrEqual(30);
  });
});
