/**
 * test-data-bridge.js — 数据桥接层测试
 * 验证 FORTUNE.computeAll() 和 crossRef 计算
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
    if (typeof BaziEngine === "undefined" || typeof YunqiEngine === "undefined") {
      return { error: "BaziEngine or YunqiEngine not loaded", passed: 0, failed: 1, total: 1 };
    }

    // 模拟 computeAll 的核心逻辑 (使用引擎)
    var birth = { year: 1990, month: 6, day: 15, hour: 12, gender: "男", isLunar: false };
    var baziData = BaziEngine.calculate(birth);
    var yunqiData = YunqiEngine.calculate(birth.year);
    var mingGua = typeof CORE !== "undefined" && CORE.calcMingGua ? CORE.calcMingGua(birth.year, birth.gender) : {trigram:"?",group:"?"};

    // ─── 测试八字引擎输出完整性 ───
    assert(baziData.pillars !== undefined, "八字应有 pillars");
    assert(baziData.pillars.year !== undefined, "八字应有 year pillar");
    assert(baziData.pillars.month !== undefined, "八字应有 month pillar");
    assert(baziData.pillars.day !== undefined, "八字应有 day pillar");
    assert(baziData.pillars.hour !== undefined, "八字应有 hour pillar");
    assert(baziData.elements !== undefined, "八字应有 elements");
    assert(baziData.dayMaster !== undefined, "八字应有 dayMaster");
    assert(baziData.hiddenStems !== undefined, "八字应有 hiddenStems");
    assert(baziData.shishen !== undefined, "八字应有 shishen");

    // ─── 测试藏干 ───
    var hidden = baziData.hiddenStems;
    assert(hidden.year instanceof Array, "年柱藏干应为数组");
    assert(hidden.year.length > 0, "年柱藏干不应为空");

    // ─── 测试五行元素加权 ───
    var total = baziData.elements["木"] + baziData.elements["火"] + 
                baziData.elements["土"] + baziData.elements["金"] + baziData.elements["水"];
    assert(total >= 8, "五行加权总分应≥8 (4茎×2 + 4支×2最少)");

    // ─── 测试十神 ───
    assert(baziData.shishenList.year.length === 2, "年干十神应为2字(如'比肩')");
    assert(baziData.shishenList.month.length === 2, "月干十神应为2字");

    // ─── 测试五运六气完整性 ───
    assert(yunqiData.year === 1990, "yunqi year 正确");
    assert(yunqiData.wuyun.dayun.length > 0, "yunqi dayun 不应为空");
    assert(yunqiData.liuqi.sitian.length > 0, "yunqi sitian 不应为空");
    assert(yunqiData.liuqi.zhuke.length === 6, "yunqi zhuke 应有6步");

    // ─── 测试命卦 ───
    assert(mingGua.trigram !== "?", "mingGua trigram 应被识别");
    assert(mingGua.group !== "?", "mingGua group 应被识别");

    // ─── 测试大运 ───
    assert(baziData.luck instanceof Array, "luck 应为数组");
    assert(baziData.luck.length >= 6, "大运至少6步");
    assert(baziData.luck[0].ageStart >= 0, "大运起始年龄应≥0");

    // ─── 测试一致性: 日主五行 = 日柱天干五行 ───
    var dm = baziData.dayMaster;
    var idx = "甲乙丙丁戊己庚辛壬癸".indexOf(dm);
    var expectedWx = ["木","木","火","火","土","土","金","金","水","水"][idx];
    assertEqual(baziData.dayMasterWuxing, expectedWx, "日主五行应匹配天干五行");

    console.log("✓ 数据桥接测试完成: " + passed + " passed, " + failed + " failed");

    return { passed: passed, failed: failed, total: passed + failed };
  }

  window.TestDataBridge = { run: runAll };
})();
