/**
 * test-yunqi.js — 五运六气引擎单元测试
 */
(function() {
  "use strict";
  if (typeof window === "undefined") return;

  var passed = 0, failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error("FAIL: " + msg); }
  }

  function assertEqual(actual, expected, msg) {
    if (actual === expected) { passed++; }
    else { failed++; console.error("FAIL: " + msg + " — expected: " + expected + ", got: " + actual); }
  }

  function runAll() {
    if (typeof YunqiEngine === "undefined") {
      return { error: "YunqiEngine not loaded", passed: 0, failed: 1, total: 1 };
    }

    // ─── 测试 1: 天干地支 ───
    // 2026年: (2026-4)%10 = 2 → 丙, (2026-4)%12 = 10 → 午
    var r1 = YunqiEngine.calculate(2026);
    assertEqual(r1.tiangan, "丙", "2026年天干应为丙");
    assertEqual(r1.dizhi, "午", "2026年地支应为午");

    // 1984年(甲子): (1984-4)%10 = 0 → 甲, (1984-4)%12 = 0 → 子
    var r1b = YunqiEngine.calculate(1984);
    assertEqual(r1b.tiangan, "甲", "1984年天干应为甲");
    assertEqual(r1b.dizhi, "子", "1984年地支应为子");

    // ─── 测试 2: 岁运 ───
    // 甲己土, 乙庚金, 丙辛水, 丁壬木, 戊癸火
    assertEqual(r1.wuyun.dayun, "水运太过", "2026年(丙)岁运应为水运太过");
    assertEqual(YunqiEngine.calculate(2025).wuyun.dayun, "金运不及", "2025年(乙)岁运应为金运不及");
    // 2025: (2025-4)%10 = 1 → 乙, 乙庚金→金运不及

    // ─── 测试 3: 司天在泉 ───
    // 子午少阴君火/阳明燥金
    assertEqual(r1.liuqi.sitian, "少阴君火", "2026年(午)司天应为少阴君火");
    assertEqual(r1.liuqi.zaiquan, "阳明燥金", "2026年(午)在泉应为阳明燥金");

    // 丑未太阴湿土/太阳寒水
    var r3 = YunqiEngine.calculate(2025); // 乙巳年, 巳=厥阴风木
    assertEqual(r3.liuqi.sitian, "厥阴风木", "2025年(巳)司天应为厥阴风木");
    assertEqual(r3.liuqi.zaiquan, "少阳相火", "2025年(巳)在泉应为少阳相火");

    // ─── 测试 4: 客气六步 ───
    assert(r1.liuqi.zhuke instanceof Array, "zhuke 应为数组");
    assertEqual(r1.liuqi.zhuke.length, 6, "客气应有6步");
    assertEqual(r1.liuqi.zhuke[0].step, "初之气", "第一步应为初之气");
    assertEqual(r1.liuqi.zhuke[2].step, "三之气", "第三步应为三之气");
    // 三之气 = 司天 = 少阴君火
    assertEqual(r1.liuqi.zhuke[2].qi, "少阴君火", "2026年三之气应为少阴君火(司天)");

    // ─── 测试 5: 疾病倾向 ───
    assert(typeof r1.disease_tendency === "string", "disease_tendency 应为字符串");
    assert(r1.disease_tendency.length > 0, "disease_tendency 不应为空");

    // ─── 测试 6: 多年份稳定性 ───
    var years = [1984, 1990, 2000, 2010, 2020, 2024, 2026, 2030, 2040];
    years.forEach(function(y) {
      var res = YunqiEngine.calculate(y);
      assert(res.tiangan !== undefined, y + "年天干不应为空");
      assert(res.wuyun.dayun.length > 0, y + "年岁运不应为空");
      assert(res.liuqi.sitian.length > 0, y + "年司天不应为空");
      assert(res.liuqi.zhuke.length === 6, y + "年应有6步客气");
    });

    return { passed: passed, failed: failed, total: passed + failed };
  }

  window.TestYunqi = { run: runAll };
})();
