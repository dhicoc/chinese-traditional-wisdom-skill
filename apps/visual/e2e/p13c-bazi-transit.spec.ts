import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';

test.describe('P1.3c 八字动态层联动', () => {
  test('流年、流月、流日共用日期锚点，并可连续浏览日期', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE_URL}#bazi`);

    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible({ timeout: 60000 });

    const dateInput = workspace.getByLabel('目标日期');
    await dateInput.fill('2025-07-15');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');
    await expect(workspace.getByText('当前小运', { exact: true })).toBeVisible();
    await expect(workspace.getByText(/虚岁\d+ · [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/)).toBeVisible();
    await expect(workspace.getByText('流年', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流年关系', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流月', { exact: true })).toBeVisible();
    await expect(workspace.getByText('流日', { exact: true })).toBeVisible();
    await expect(workspace.getByText('动态层均按目标日期计算；本命盘保持不变。小运按虚岁定位。')).toBeVisible();
    await expect(workspace.getByText('传统文化参考：上述关系不推导事业、婚恋、健康或财富等现实结论。')).toBeVisible();

    const timeline = workspace.getByRole('list', { name: '大运时间轴' });
    await expect(timeline).toBeVisible();
    const alternateLuck = timeline.locator('button:not([disabled]):not([aria-pressed="true"])').first();
    await alternateLuck.click({ force: true });
    await expect(dateInput).not.toHaveValue('2025-07-15');
    await expect(workspace.getByLabel('目标年份')).toHaveValue(/\d{4}/);
    await dateInput.fill('2025-07-15');

    const natalDayPillar = await workspace.locator('table').getByRole('row').nth(2).locator('td').nth(2).textContent();

    const nextDay = workspace.getByRole('button', { name: '后一日' });
    const previousDay = workspace.getByRole('button', { name: '前一日' });
    await expect(nextDay).toBeVisible();
    await expect(previousDay).toBeVisible();

    await nextDay.click({ force: true });
    await expect(workspace.locator('table').getByRole('row').nth(2).locator('td').nth(2)).toHaveText(natalDayPillar ?? '');
    await expect(dateInput).toHaveValue('2025-07-16');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2025');

    await previousDay.click({ force: true });
    await expect(dateInput).toHaveValue('2025-07-15');

    await dateInput.fill('2025-12-31');
    await nextDay.click({ force: true });
    await expect(dateInput).toHaveValue('2026-01-01');
    await expect(workspace.getByLabel('目标年份')).toHaveValue('2026');
  });
  test('出生时辰范围只比较稳定与变化字段，不反推唯一时辰', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE_URL}#bazi`);
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    const panel = workspace.getByTestId('bazi-time-sensitivity');
    await expect(panel).toBeVisible({ timeout: 60000 });
    await panel.getByRole('button', { name: '开始比较' }).press('Enter');
    await expect(panel.getByText('候选时辰（12）')).toBeVisible();
    await expect(panel.getByText('跨候选稳定')).toBeVisible();
    await expect(panel.getByText('随时辰变化')).toBeVisible();
    await expect(panel.getByText(/年柱：/)).toBeVisible();
    await expect(panel.getByText(/时柱：\d+ 种结果/)).toBeVisible();

    await panel.getByLabel('候选起始小时').fill('23');
    await panel.getByLabel('候选结束小时').fill('1');
    await expect(panel.getByText('候选时辰（2）')).toBeVisible();
    await expect(panel).toContainText('不校时、不反推');
    await expect(panel.getByText(/唯一出生时辰/)).toBeVisible();
  });

  test('规则差异实验室只展示可追溯的结构化 year/day 差异', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE_URL}#bazi`);
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    const panel = workspace.getByTestId('bazi-rule-comparison');
    await expect(panel).toBeVisible({ timeout: 60000 });
    await expect(panel.getByText('本页只显示结构化规则差异，不判断某一流派更准确。')).toBeVisible();
    await panel.getByRole('button', { name: '展开实验' }).press('Enter');
    await expect(panel.getByText('神煞三合按年支', { exact: true })).toBeVisible();
    await expect(panel.getByText('神煞三合按日支', { exact: true })).toBeVisible();
    await expect(panel.getByText('共同字段', { exact: true })).toBeVisible();
    await expect(panel.getByText('差异字段', { exact: true })).toBeVisible();
    await expect(panel.getByText('结构化事实已校验')).toHaveCount(2);
    await expect(panel).toContainText('docs/SHENSHA-REFERENCE.md');

    await panel.getByRole('tab', { name: '称骨版本' }).press('Enter');
    await expect(panel.getByText('通行工整本', { exact: true })).toBeVisible();
    await expect(panel.getByText('民间传抄本', { exact: true })).toBeVisible();
    await expect(panel.getByText('全本异文', { exact: true })).toBeVisible();
    await expect(panel.getByText('结构化事实已校验')).toHaveCount(3);
    await expect(panel).toContainText('称骨歌属于解释性文本');

    await panel.getByRole('tab', { name: '大六壬流派' }).press('Enter');
    await expect(panel.getByText('通行（天盘临方定顺逆）', { exact: true })).toBeVisible();
    await expect(panel.getByText('古法（昼顺夜逆·上神承将）', { exact: true })).toBeVisible();
    await expect(panel.getByText('《大全》（地盘落宫定顺逆）', { exact: true })).toBeVisible();
    await expect(panel.getByText('结构化事实已校验')).toHaveCount(3);

    await panel.getByRole('tab', { name: '太乙局式' }).press('Enter');
    await expect(panel.getByText('年计 · 太乙统宗', { exact: true })).toBeVisible();
    await expect(panel.getByText('時計 · 太乙局', { exact: true })).toBeVisible();
    await expect(panel.getByText('结构化事实已校验')).toHaveCount(4);

    await expect(panel.getByRole('tab', { name: '时间基准（需核验）' })).toBeDisabled();
    await expect(panel).toContainText('本页不会自行补造地点证据');

    await panel.getByRole('tab', { name: '紫微动态口径' }).press('Enter');
    await panel.getByLabel('规则比较目标年份').fill('2025');
    await panel.getByLabel('规则比较目标月份').fill('7');
    await expect(panel.getByText('仅本命层', { exact: true })).toBeVisible();
    await expect(panel.getByText('本命 + 月度动态层', { exact: true })).toBeVisible();
    await expect(panel).toContainText('2025-07-15');
    await expect(panel).toContainText('不补算流日');

    await expect(panel).not.toContainText('最佳流派');
    await expect(panel).not.toContainText('推荐流派');
  });
  test('时间基准页签只在可复算的 Agent 核验结果存在时启用', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE_URL}#bazi`);
    const workspace = page.locator('[data-testid="workspace-bazi"]');
    await expect(workspace.getByTestId('bazi-rule-comparison')).toBeVisible({ timeout: 60000 });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ctw:set-true-solar-time', {
        detail: {
          source: 'agent-local',
          resolution: {
            status: 'resolved',
            source: 'agent-verified',
            civilBirth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男', isLunar: false, useExactCalendar: true },
            trueSolarBirth: { year: 1990, month: 6, day: 15, hour: 11, minute: 4, gender: '男', isLunar: false, useExactCalendar: true },
            location: {
              displayName: '合成测试地点', longitude: -74.006, ianaTimeZone: 'America/New_York', utcOffsetMinutes: -240,
              utcOffsetEvidence: 'IANA 时区历史规则核验：当地夏令时 UTC-04:00',
            },
            longitudeCorrectionMinutes: -56,
            equationOfTimeMinutes: 0,
            trueSolarCorrectionMinutes: -56,
            crossedDate: false,
            crossedShichen: false,
            crossedZiChu: false,
            evidence: ['IANA 时区历史规则核验：当地夏令时 UTC-04:00'],
          },
        },
      }));
    });

    const panel = workspace.getByTestId('bazi-rule-comparison');
    await panel.getByRole('button', { name: '展开实验' }).press('Enter');
    const timeTab = panel.getByRole('tab', { name: '时间基准' });
    await expect(timeTab).toBeEnabled();
    await timeTab.press('Enter');
    await expect(panel.getByText('民用时间基准（对照）', { exact: true })).toBeVisible();
    await expect(panel.getByText('已核验真太阳时', { exact: true })).toBeVisible();
    await expect(panel.getByText('结构化事实已校验')).toHaveCount(2);
    await expect(panel).toContainText('11:04');
    await expect(panel).toContainText('外部核验的经度');
  });

});
