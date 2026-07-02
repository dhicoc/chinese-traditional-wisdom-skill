/**
 * test-v02-quality.js — v0.2 质量基线测试
 *
 * 覆盖能力注册、输入校验、报告快照隐私字段、搜索索引和增强引擎元数据。
 */
(function() {
  "use strict";

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function runTest(name, fn, state) {
    try {
      fn();
      state.passed++;
      state.details.push("✅ " + name);
    } catch (e) {
      state.failed++;
      state.details.push("❌ " + name + ": " + e.message);
    }
  }

  window.TestV02Quality = {
    run: function() {
      var state = { passed: 0, failed: 0, details: [] };

      runTest("CapabilityRegistry 可用并声明核心模块", function() {
        assert(window.CapabilityRegistry, "缺少 CapabilityRegistry");
        var caps = CapabilityRegistry.getCapabilities();
        assert(caps.bazi && caps.bazi.mode === "local-approx", "八字能力状态不正确");
        assert(caps.ziwei && caps.ziwei.mode === "demo", "紫微能力状态不正确");
        assert(caps.liuyao && caps.liuyao.mode === "demo", "六爻能力状态不正确");
      }, state);

      runTest("生辰输入校验拦截非法日期", function() {
        var ok = CapabilityRegistry.validateBirthInput({ year: 1990, month: 6, day: 15, hour: 12, gender: "男" });
        var badDate = CapabilityRegistry.validateBirthInput({ year: 1990, month: 2, day: 31, hour: 12, gender: "男" });
        var badHour = CapabilityRegistry.validateBirthInput({ year: 1990, month: 6, day: 15, hour: 24, gender: "男" });
        assert(ok.valid, "合法日期被拒绝");
        assert(!badDate.valid, "非法日期未被拒绝");
        assert(!badHour.valid, "非法时辰未被拒绝");
      }, state);

      runTest("报告快照包含 v0.2 字段且脱敏", function() {
        var data = {
          birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" },
          bazi: { pillars: { year: "庚午", month: "壬午", day: "辛亥", hour: "甲午" } }
        };
        var report = CapabilityRegistry.exportReportData(data);
        assert(report.version === CapabilityRegistry.version, "版本号不一致");
        assert(report.generatedAt, "缺少 generatedAt");
        assert(Array.isArray(report.sourceNotes) && report.sourceNotes.length > 0, "缺少 sourceNotes");
        assert(report.subject.birthYear === 1990, "缺少出生年份");
        assert(report.subject.month === undefined && report.subject.day === undefined && report.subject.hour === undefined, "subject 泄露完整生辰");
      }, state);

      runTest("引擎输出包含模式和可信度说明", function() {
        var bazi = BaziEngine.calculate({ year: 1990, month: 6, day: 15, hour: 12, gender: "男" });
        var yunqi = YunqiEngine.calculate(1990);
        assert(bazi.engineName === "BaziEngine", "八字引擎名称缺失");
        assert(bazi.mode === "local-approx" && bazi.confidenceNote, "八字可信度说明缺失");
        assert(yunqi.engineName === "YunqiEngine", "五运六气引擎名称缺失");
        assert(yunqi.mode === "local-approx" && yunqi.confidenceNote, "五运六气可信度说明缺失");
        assert(yunqi.yearBoundary && yunqi.liuqi.current_step && yunqi.liuqi.kezhujialin, "五运六气增强字段缺失");
      }, state);

      runTest("搜索索引公开统计并覆盖知识库清单", function() {
        assert(window.GlobalSearch && GlobalSearch.getIndexStats, "缺少搜索索引统计");
        var stats = GlobalSearch.getIndexStats();
        assert(stats.mappings === 6, "映射表数量应为 6");
        assert(stats.knowledgeBase === 30, "知识库索引数量应为 30");
      }, state);

      return state;
    }
  };
})();
