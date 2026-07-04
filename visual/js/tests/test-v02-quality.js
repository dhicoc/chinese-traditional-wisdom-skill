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
        assert(caps.bazi && caps.bazi.mode === "local-exact", "八字能力状态不正确");
        assert(caps.ziwei && caps.ziwei.mode === "demo", "紫微能力状态不正确");
        assert(caps.liuyao && caps.liuyao.mode === "demo", "六爻能力状态不正确");
        assert(caps.meihua && caps.meihua.mode === "local", "梅花能力状态不正确");
      }, state);

      runTest("ToolManifest 声明首页工具目录元数据", function() {
        assert(window.ToolManifest, "缺少 ToolManifest");
        var tools = ToolManifest.getVisibleTools();
        var categories = ToolManifest.getCategories();
        assert(tools.length === 10, "首页工具数量不正确");
        ["命盘", "卜筮", "风水", "健康", "知识"].forEach(function(category) {
          assert(categories.indexOf(category) >= 0, "缺少工具分类: " + category);
        });
        tools.forEach(function(tool) {
          assert(tool.id && tool.title && tool.entryTab && tool.capabilityKey, tool.id + " manifest 核心字段缺失");
          assert(Array.isArray(tool.requiredInputs) && tool.privacyLevel && tool.reportSection, tool.id + " manifest 隐私或报告字段缺失");
        });
        assert(ToolManifest.getById("bazi").capabilityKey === "bazi", "bazi manifest 查询异常");
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

      runTest("EngineAdapterRegistry 声明统一 Adapter 契约", function() {
        assert(window.EngineAdapterRegistry, "缺少 EngineAdapterRegistry");
        var required = EngineAdapterRegistry.requiredFields;
        ["bazi", "yunqi", "ziwei", "liuyao", "meihua"].forEach(function(name) {
          var adapter = EngineAdapterRegistry.get(name);
          assert(adapter, name + " adapter 未注册");
          required.forEach(function(field) {
            assert(adapter[field] !== undefined && adapter[field] !== null, name + " adapter 缺少 " + field);
          });
          assert(typeof adapter.calculate === "function", name + " calculate 缺失");
          assert(typeof adapter.toRenderData === "function", name + " toRenderData 缺失");
        });
      }, state);

      runTest("Adapter 计算结果可供当前渲染数据使用", function() {
        var birth = { year: 1993, month: 6, day: 15, hour: 12, gender: "女" };
        var baziResult = EngineAdapterRegistry.calculate("bazi", birth);
        var baziRender = EngineAdapterRegistry.toRenderData("bazi", baziResult, birth);
        var yunqiResult = EngineAdapterRegistry.calculate("yunqi", birth);
        var ziweiResult = EngineAdapterRegistry.calculate("ziwei", { birth: birth, mingGua: { trigram: "艮", group: "西四命" } });
        var liuyaoResult = EngineAdapterRegistry.calculate("liuyao", { birth: birth });
        var meihuaResult = EngineAdapterRegistry.calculate("meihua", { birth: birth });
        assert(baziResult.pillars && baziRender.year && baziRender.day, "八字 Adapter 输出不可渲染");
        assert(yunqiResult.liuqi && yunqiResult.wuyun, "五运六气 Adapter 输出缺字段");
        assert(ziweiResult.birthInfo.year === 1993 && ziweiResult.palaces["命宫"], "紫微 Adapter 输出缺十二宫");
        assert(liuyaoResult.lines && liuyaoResult.lines.length === 6 && liuyaoResult.hexagramName, "六爻 Adapter 输出缺卦象");
        assert(meihuaResult.engineName === "LocalMeihuaTimeAdapter", "梅花未使用本地时间起卦 Adapter");
        assert(meihuaResult.upperTrigram && meihuaResult.lowerTrigram && typeof meihuaResult.changingLine === "number", "梅花 Adapter 输出缺卦象");
        assert(meihuaResult.mutualUpper && meihuaResult.mutualLower && meihuaResult.changingHexagramName, "梅花 Adapter 输出缺互卦或变卦");
        assert(meihuaResult.bodyTrigram && meihuaResult.useTrigram && meihuaResult.bodyUseRelation, "梅花 Adapter 输出缺体用生克");
      }, state);
      runTest("可选 lunar-javascript Adapter 能升级精确模式", function() {
        var originalSolar = window.Solar;
        try {
          window.Solar = {
            fromYmdHms: function(year, month, day, hour) {
              return {
                getLunar: function() {
                  return {
                    getEightChar: function() {
                      return {
                        getYear: function() { return "癸酉"; },
                        getMonth: function() { return "己未"; },
                        getDay: function() { return "壬辰"; },
                        getTime: function() { return "丙午"; }
                      };
                    }
                  };
                }
              };
            },
            fromYmd: function(year, month, day) {
              return {
                getLunar: function() {
                  return {
                    getJieQiTable: function() {
                      return { "大寒": { getYear: function() { return year; }, getMonth: function() { return 1; }, getDay: function() { return 20; } } };
                    }
                  };
                }
              };
            }
          };
          var exactBazi = EngineAdapterRegistry.calculate("bazi", { year: 1993, month: 6, day: 15, hour: 12, gender: "女" });
          var exactYunqi = EngineAdapterRegistry.calculate("yunqi", { year: 2026, month: 1, day: 15, hour: 12, gender: "男" });
          assert(exactBazi.engineName === "BaziLunarAdapter" && exactBazi.mode === "local-exact", "八字未进入 lunar 精确模式");
          assert(exactBazi.pillars.month.stem === "己" && exactBazi.calendar.exactSolarTerms === true, "八字 lunar 干支未被采用");
          assert(exactYunqi.engineName === "YunqiLunarBoundaryAdapter" && exactYunqi.mode === "local-exact", "五运六气未进入大寒精确边界模式");
          assert(exactYunqi.effectiveYear === 2025 && exactYunqi.yearBoundary.indexOf("大寒定年") !== -1, "大寒前日期未使用上一年运气");
        } finally {
          if (originalSolar === undefined) delete window.Solar;
          else window.Solar = originalSolar;
        }
      }, state);
      runTest("关闭精确历法后回退本地近似", function() {
        var bazi = EngineAdapterRegistry.calculate("bazi", { year: 1993, month: 6, day: 15, hour: 12, gender: "女", useExactCalendar: false });
        var yunqi = EngineAdapterRegistry.calculate("yunqi", { year: 2026, month: 1, day: 15, hour: 12, gender: "男", useExactCalendar: false });
        assert(bazi.mode === "local-approx" && bazi.engineName === "BaziEngine", "八字关闭精确历法后未回退近似");
        assert(yunqi.mode === "local-approx" && yunqi.effectiveYear === 2026, "五运六气关闭精确历法后未回退近似年份");
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
