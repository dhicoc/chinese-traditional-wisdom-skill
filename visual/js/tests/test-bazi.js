/**
 * test-bazi.js — 八字引擎单元测试
 * 验证 BaziEngine 计算已知参考日期的四柱正确性
 *
 * 在浏览器中运行（通过 test-runner.html 加载）或 Node.js。
 */

(function() {
  "use strict";
  if (typeof window === "undefined") return;

  var tests = [];
  var passed = 0, failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error("FAIL: " + msg); tests.push("❌ " + msg); }
  }

  function assertEqual(actual, expected, msg) {
    if (actual === expected) { passed++; }
    else { failed++; console.error("FAIL: " + msg + " — expected: " + expected + ", got: " + actual); tests.push("❌ " + msg); }
  }

  function assertDeepEqual(actual, expected, msg) {
    try {
      if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; }
      else { failed++; console.error("FAIL: " + msg + " — expected: " + JSON.stringify(expected) + ", got: " + JSON.stringify(actual)); tests.push("❌ " + msg); }
    } catch(e) {
      failed++; tests.push("❌ " + msg + " (exception: " + e.message + ")");
    }
  }

  function runAll() {
    if (typeof BaziEngine === "undefined") {
      tests.push("⚠️ BaziEngine not loaded");
      return tests;
    }

    // ─── 测试 1: 年柱 ───
    // 1990年立春(2/4)后 → 庚午
    var r1 = BaziEngine.calculate({year:1990, month:6, day:15, hour:12, gender:"男"});
    assertEqual(r1.pillars.year.stem, "庚", "1990年(6月)年柱天干应为庚");
    assertEqual(r1.pillars.year.branch, "午", "1990年(6月)年柱地支应为午");

    // 1990年立春前(1月1日) → 己巳
    var r1b = BaziEngine.calculate({year:1990, month:1, day:15, hour:12, gender:"男"});
    assertEqual(r1b.pillars.year.stem, "己", "1990年(1月,立春前)年柱天干应为己");
    assertEqual(r1b.pillars.year.branch, "巳", "1990年(1月,立春前)年柱地支应为巳");

    // ─── 测试 2: 日柱 (1900-01-01 = 己亥 = 甲子索引35) ───
    var ref = new Date(1900, 0, 1);
    var refCalc = BaziEngine.calculate({year:1900, month:1, day:1, hour:0, gender:"男"});
    assertEqual(refCalc.pillars.day.stem, "己", "1900-01-01 日柱天干应为己");
    assertEqual(refCalc.pillars.day.branch, "亥", "1900-01-01 日柱地支应为亥");

    // 2000-01-01 (距离1900-01-01 = 36524天, 35+36524=19, 19%10=9=癸, 19%12=7=未)
    var r2 = BaziEngine.calculate({year:2000, month:1, day:1, hour:0, gender:"男"});
    assertEqual(r2.pillars.day.stem, "癸", "2000-01-01 日柱天干应为癸");
    assertEqual(r2.pillars.day.branch, "未", "2000-01-01 日柱地支应为未");

    // ─── 测试 3: 时柱 ───
    // 子时(23-0) = 支0, 午时(11-12) = 支6
    var r3 = BaziEngine.calculate({year:1990, month:6, day:15, hour:0, gender:"男"});
    assertEqual(r3.pillars.hour.branch, "子", "0点时柱地支应为子");
    assertEqual(r3.pillars.hour.stem, r3.pillars.day.stemIndex === 0 ? "甲" : 
      "甲乙丙丁戊己庚辛壬癸"[(r3.pillars.day.stemIndex * 2) % 10], "0点时柱天干应匹配日干");

    // 午时(12:00)
    var r3b = BaziEngine.calculate({year:1990, month:6, day:15, hour:12, gender:"男"});
    assertEqual(r3b.pillars.hour.branch, "午", "12点时柱地支应为午");

    // ─── 测试 4: 五行统计 ───
    var r4 = BaziEngine.calculate({year:1990, month:6, day:15, hour:12, gender:"男"});
    var els = r4.elements;
    assert(typeof els === "object", "elements 应为对象");
    assert(typeof els["木"] === "number", "elements.木 应为数字");
    assert(typeof els["火"] === "number", "elements.火 应为数字");
    assert(typeof els["土"] === "number", "elements.土 应为数字");
    assert(typeof els["金"] === "number", "elements.金 应为数字");
    assert(typeof els["水"] === "number", "elements.水 应为数字");

    // 四柱 = 4茎+4支+藏干, 每个茎权重2, 支权重2, 藏干权重1
    var total = els["木"] + els["火"] + els["土"] + els["金"] + els["水"];
    assert(total > 0, "五行总数应>0");

    // ─── 测试 5: 日主 ───
    assert(r4.dayMaster.length === 1, "dayMaster 应为单个汉字");
    assert("甲乙丙丁戊己庚辛壬癸".indexOf(r4.dayMaster) >= 0, "dayMaster 应为有效天干");
    assert(r4.dayMasterWuxing.length === 1, "dayMasterWuxing 应为有效五行");

    // ─── 测试 6: 大运 ───
    assert(r4.luck instanceof Array, "luck 应为数组");
    assert(r4.luck.length > 0, "luck 不應为空");
    assert(r4.luck[0].ageStart !== undefined, "大运应有起始年龄");
    assert(r4.luck[0].stem.length === 1, "大运天干应为单字");

    // ─── 测试 7: getRenderData 兼容性 ───
    var renderData = BaziEngine.getRenderData(r4);
    assert(renderData.year !== undefined, "renderData 应有 year");
    assert(renderData.year.stem !== undefined, "renderData.year 应有 stem");
    assert(renderData.year.hidden instanceof Array, "renderData.year 应有 hidden 数组");
    assert(renderData.dayMaster === r4.dayMaster, "renderData.dayMaster 应与原数据一致");
    assert(renderData.gender === "男", "renderData.gender 应正确");

    // ─── 测试 8: 多日期稳定性 ───
    var dates = [
      {y:2024, m:2, d:29, h:8},  // 闰日
      {y:2000, m:1, d:1, h:0},   // 2000年1月1日
      {y:1984, m:2, d:4, h:23},  // 甲子年立春
      {y:1911, m:10, d:10, h:10}, // 历史日期
      {y:2030, m:12, d:31, h:23}  // 未来日期
    ];
    dates.forEach(function(d) {
      var res = BaziEngine.calculate({year:d.y, month:d.m, day:d.d, hour:d.h, gender:"男"});
      assert(res.pillars.year.stem !== undefined, d.y + "-" + d.m + "-" + d.d + " 年柱天干不应为空");
      assert(res.pillars.month.stem !== undefined, d.y + "-" + d.m + "-" + d.d + " 月柱天干不应为空");
      assert(res.pillars.day.stem !== undefined, d.y + "-" + d.m + "-" + d.d + " 日柱天干不应为空");
      assert(res.pillars.hour.stem !== undefined, d.y + "-" + d.m + "-" + d.d + " 时柱天干不应为空");
    });

    return {
      tests: tests,
      passed: passed,
      failed: failed,
      total: passed + failed
    };
  }

  window.TestBazi = { run: runAll };
})();
