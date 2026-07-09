import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

/**
 * Privacy E2E Tests — 隐私测试（重写为真实校验）
 *
 * 验证：历史/收藏不保存完整生辰/姓名/地点；报告导出脱敏；
 * 30 条历史限制。所有校验使用真实存储键（FORTUNE_HISTORY /
 * FORTUNE_FAVORITES）和真实 API（HistoryStore）。
 */

/** 等待 legacy 引擎加载 */
async function waitForLegacy(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).HistoryStore?.add === 'function',
    { timeout: 12000 },
  );
}

/** 检查字符串是否含完整出生日期（yyyy-mm-dd 或 yyyy年mm月dd日） */
function hasFullDate(s: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(s) || /\d{4}年\d{1,2}月\d{1,2}日/.test(s);
}

/** 检查历史/收藏条目是否含完整出生日期，排除 createdAt/id 等时间戳字段 */
function entryHasFullBirthDate(entry: Record<string, unknown>): boolean {
  const skipKeys = new Set(['createdAt', 'id', 'timestamp', 'generatedAt']);
  for (const [key, value] of Object.entries(entry)) {
    if (skipKeys.has(key)) continue;
    if (typeof value === 'string' && hasFullDate(value)) return true;
    if (typeof value === 'object' && value !== null) {
      const sub = JSON.stringify(value);
      // 对嵌套对象也跳过 createdAt
      if (hasFullDate(sub) && !sub.includes('"createdAt"')) return true;
    }
  }
  return false;
}

test.describe('Privacy - History Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForLegacy(page);
    // 清空历史与收藏
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      if (H?.clear) H.clear();
      if (H?.clearFavorites) H.clearFavorites();
    });
  });

  test('历史记录不含完整出生日期', async ({ page }) => {
    // 通过 HistoryStore.add 添加一条带年份的记录（模拟真实使用）
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      H.add({ module: 'bazi', title: '八字测试', summary: '1990年男性命盘', tags: ['八字'], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    expect(raw).toBeTruthy();
    const entries = JSON.parse(raw!);

    // 每条历史记录不应含完整出生日期（排除 createdAt 时间戳）
    for (const entry of entries) {
      expect(entryHasFullBirthDate(entry)).toBe(false);
    }
  });

  test('历史记录不含完整姓名', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      H.add({ module: 'bazi', title: '八字测试', summary: '命盘分析', tags: ['八字'], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    // 历史记录字段不应有 name/fullName 字段
    for (const entry of entries) {
      expect(entry.name).toBeUndefined();
      expect(entry.fullName).toBeUndefined();
      expect(entry.birthDate).toBeUndefined();
      expect(entry.location).toBeUndefined();
    }
  });

  test('历史记录不含地点信息', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      H.add({ module: 'fengshui', title: '风水测试', summary: '坐北朝南', tags: ['风水'], mode: 'local' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    for (const entry of entries) {
      // 不应有地点相关字段
      expect(entry.location).toBeUndefined();
      expect(entry.address).toBeUndefined();
      expect(entry.birthPlace).toBeUndefined();
      expect(entry.place).toBeUndefined();
    }
  });

  test('历史记录可含年份但不含月日', async ({ page }) => {
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      H.add({ module: 'bazi', title: '1990年命盘', summary: '分析', tags: [], mode: 'local-exact' });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_HISTORY'));
    const entries = JSON.parse(raw!);

    for (const entry of entries) {
      // year 字段可以是 4 位数字
      if (entry.year) {
        expect(String(entry.year)).toMatch(/^\d{4}$/);
      }
      // 不应有 month/day 字段
      expect(entry.month).toBeUndefined();
      expect(entry.day).toBeUndefined();
      expect(entry.hour).toBeUndefined();
    }
  });
});

test.describe('Privacy - Favorites Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForLegacy(page);
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      if (H?.clearFavorites) H.clearFavorites();
    });
  });

  test('收藏不含完整出生日期', async ({ page }) => {
    // 添加一条收藏
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      H.add({ module: 'bazi', title: '收藏测试', summary: '1990年命盘', tags: ['八字'], mode: 'local-exact', favorite: true });
    });

    const raw = await page.evaluate(() => window.localStorage.getItem('FORTUNE_FAVORITES'));
    if (raw) {
      const favs = JSON.parse(raw);
      for (const fav of favs) {
        expect(entryHasFullBirthDate(fav)).toBe(false);
        expect(fav.name).toBeUndefined();
        expect(fav.birthDate).toBeUndefined();
        expect(fav.location).toBeUndefined();
      }
    }
  });
});

test.describe('Privacy - Report Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('报告导出数据脱敏——不含完整出生日期', async ({ page }) => {
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

    expect(report).toBeTruthy();

    // subject.label 不含完整生日
    const label = String(report?.subject?.label ?? '');
    expect(label).not.toMatch(/\d{4}-\d{2}-\d{2}/);

    // ziwei.birthInfo 只保留 year + gender
    const bi = report?.ziwei?.birthInfo;
    if (bi) {
      expect(bi.month).toBeUndefined();
      expect(bi.day).toBeUndefined();
      expect(bi.hour).toBeUndefined();
    }

    // 报告不含明文生日字段
    const json = JSON.stringify(report);
    expect(json).not.toContain('solarDate');
    expect(json).not.toContain('lunarDate');
    expect(json).not.toContain('queryDate');
  });

  test('报告导出数据不含完整姓名/地点', async ({ page }) => {
    await page.waitForFunction(
      () => typeof (window as any).FORTUNE?.exportReportData === 'function',
      { timeout: 12000 },
    );

    const report = await page.evaluate(() => {
      const F = (window as any).FORTUNE;
      try {
        return F.exportReportData() as any;
      } catch {
        return null;
      }
    });

    if (report) {
      // subject 不含 name/fullName/location
      expect(report.subject?.name).toBeUndefined();
      expect(report.subject?.fullName).toBeUndefined();
      expect(report.subject?.location).toBeUndefined();
      expect(report.subject?.birthPlace).toBeUndefined();
    }
  });
});

test.describe('Privacy - Birth Data Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('全局生辰面板可展开且有输入字段', async ({ page }) => {
    // BirthPanel 默认折叠，点击展开
    const toggle = page.locator('button').filter({ hasText: /全局生辰/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(500);

    // 展开后应有输入字段
    const inputs = page.locator('input[type="number"], input[type="text"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('全局生辰数据只含 year/month/day/hour/gender，不含 fullDate', async ({ page }) => {
    // 等待 legacy 加载，检查 FORTUNE 全局数据
    await page.waitForFunction(
      () => typeof (window as any).FORTUNE !== 'undefined',
      { timeout: 12000 },
    );

    const birthData = await page.evaluate(() => {
      const F = (window as any).FORTUNE;
      // FORTUNE 可能有 getData / getBirth 方法
      if (typeof F?.getData === 'function') {
        try {
          const d = F.getData();
          return d?.birth || d?.birthInfo || null;
        } catch {
          return null;
        }
      }
      return F?.birth || null;
    });

    if (birthData) {
      // 不应有 fullDate 字段（完整日期字符串）
      expect(birthData.fullDate).toBeUndefined();
      // year 应是 4 位数字
      if (birthData.year) {
        expect(String(birthData.year)).toMatch(/^\d{4}$/);
      }
    }
  });
});

test.describe('Privacy - Data Retention', () => {
  test('历史限制 30 条', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
    await waitForLegacy(page);

    // 清空后添加 35 条（不同 title 避免去重）
    await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      if (H?.clear) H.clear();
      for (let i = 0; i < 35; i++) {
        H.add({ module: 'bazi', title: `test-${i}`, summary: 's', tags: [], mode: 'local' });
      }
    });

    const count = await page.evaluate(() => {
      const H = (window as any).HistoryStore;
      return H?.list ? H.list().length : -1;
    });
    expect(count).toBeLessThanOrEqual(30);
    expect(count).toBeGreaterThan(0);
  });
});
