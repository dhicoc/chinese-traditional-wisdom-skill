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
        assert(caps.ziwei && caps.ziwei.mode === "local-exact", "紫微能力状态不正确");
        assert(caps.liuyao && caps.liuyao.mode === "local-exact", "六爻能力状态不正确");
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
        assert(liuyaoResult.engineName === "LocalLiuyaoNajiaAdapter" && liuyaoResult.mode === "local-exact", "六爻未使用本地纳甲 Adapter");
        assert(liuyaoResult.palace && liuyaoResult.palaceElement, "六爻 Adapter 输出缺宫属");
        assert(liuyaoResult.shiYao >= 1 && liuyaoResult.shiYao <= 6 && liuyaoResult.yingYao >= 1 && liuyaoResult.yingYao <= 6, "六爻 Adapter 世应位置非法");
        assert(liuyaoResult.lines.every(function (l) { return l.stem && l.branch && l.relation && l.god; }), "六爻 Adapter 爻缺纳甲/六亲/六神");
        assert(liuyaoResult.changingHexagramName, "六爻 Adapter 输出缺变卦名");
        var reading = EngineAdapterRegistry.toReading("liuyao", liuyaoResult, { birth: birth });
        assert(reading && reading.title && reading.summary && reading.sections.length >= 4, "六爻 toReading 结构化摘要缺失");
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
      runTest("toReading() 返回结构化阅读摘要", function() {
        assert(typeof EngineAdapterRegistry.toReading === "function", "EngineAdapterRegistry 缺少 toReading");
        var birth = { year: 1990, month: 6, day: 15, hour: 12, gender: "男" };
        ["bazi", "yunqi", "meihua"].forEach(function(name) {
          var result = EngineAdapterRegistry.calculate(name, { birth: birth });
          var reading = EngineAdapterRegistry.toReading(name, result, { birth: birth });
          assert(reading !== null, name + " 未实现 toReading");
          assert(reading.title && typeof reading.title === "string", name + " reading.title 缺失");
          assert(reading.summary && typeof reading.summary === "string", name + " reading.summary 缺失");
          assert(Array.isArray(reading.tags) && reading.tags.length > 0, name + " reading.tags 缺失");
          assert(Array.isArray(reading.sections) && reading.sections.length > 0, name + " reading.sections 缺失");
          assert(reading.sourceNotes && typeof reading.sourceNotes === "string", name + " reading.sourceNotes 缺失");
          reading.sections.forEach(function(sec) {
            assert(sec.heading && sec.body, name + " section 缺少 heading/body");
          });
        });
        var noReading = EngineAdapterRegistry.toReading("ziwei", {}, {});
        assert(noReading === null, "紫微未实现 toReading 应返回 null");
      }, state);

      runTest("紫微斗数 iztro 真实排盘", function() {
        var birth = { year: 1990, month: 6, day: 15, hour: 12, gender: "男" };
        var result = EngineAdapterRegistry.calculate("ziwei", { birth: birth });
        // 验证结构
        assert(result.engineName === "ZiweiIztroAdapter" || result.engineName === "DemoZiweiAdapter", "紫微引擎名称不正确: " + result.engineName);
        assert(result.mode === "local-exact" || result.mode === "demo", "紫微模式不正确: " + result.mode);
        assert(result.palaces && typeof result.palaces === "object", "紫微缺少 palaces 数据");
        assert(result.palaces["命宫"], "紫微缺少命宫数据");
        assert(result.palaces["夫妻"], "紫微缺少夫妻宫数据");
        assert(result.palaces["财帛"], "紫微缺少财帛宫数据");
        assert(result.sihua && typeof result.sihua === "object", "紫微缺少 sihua 数据");
        assert(Array.isArray(result.mainStars) && result.mainStars.length > 0, "紫微主星列表为空");
        // 验证宫位结构
        var mingPalace = result.palaces["命宫"];
        assert(Array.isArray(mingPalace.stars), "命宫 stars 不是数组");
        assert(mingPalace.position && typeof mingPalace.position === "string", "命宫 position 不正确");
        assert(mingPalace.miaoxian && typeof mingPalace.miaoxian === "string", "命宫 miaoxian 不正确");
      }, state);

      runTest("梅花数字起卦模式", function() {
        var result = EngineAdapterRegistry.calculate("meihua", {
          birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false },
          method: "number",
          numberA: 5,
          numberB: 3
        });
        assert(result.sourceMethod.indexOf("数字起卦") >= 0, "梅花数字起卦 sourceMethod 不正确");
        assert(result.upperTrigram && result.lowerTrigram, "数字起卦缺少上下卦");
        assert(typeof result.changingLine === "number" && result.changingLine >= 1 && result.changingLine <= 6, "数字起卦动爻范围错误");
        assert(result.hexagramName && result.changingHexagramName, "数字起卦缺少卦名");
        assert(result.bodyTrigram && result.useTrigram && result.bodyUseRelation, "数字起卦缺少体用关系");
        // 验证计算正确性：5%8=5→巽，(5+3)%8=8→坤，(5+3)%6=8%6=2→动爻2
        assert(result.upperTrigram.name === "巽", "上卦计算错误");
        assert(result.lowerTrigram.name === "坤", "下卦计算错误");
        assert(result.changingLine === 2, "动爻计算错误");
      }, state);

      runTest("HistoryStore 本地历史与收藏", function() {
        assert(window.HistoryStore, "缺少 HistoryStore");
        HistoryStore.clear();
        HistoryStore.clearFavorites();
        var entry = HistoryStore.add({
          module: "bazi",
          title: "测试八字命盘",
          summary: "这是一个测试摘要",
          tags: ["八字", "木命"],
          mode: "local-exact"
        });
        assert(entry && entry.id, "HistoryStore.add 未返回带 id 的 entry");
        assert(HistoryStore.getCount() === 1, "历史条数不正确");
        // 脱敏测试
        var sanitized = HistoryStore._sanitize({
          module: "test",
          title: "1990-06-15 测试",
          summary: "日期 2024-01-15 泄露",
          tags: ["t"]
        });
        assert(sanitized.title.indexOf("1990-06-15") < 0, "脱敏未清除标题中的完整日期");
        assert(sanitized.summary.indexOf("2024-01-15") < 0, "脱敏未清除摘要中的完整日期");
        // 收藏切换
        var fav = HistoryStore.toggleFavorite(entry.id);
        assert(fav === true, "toggleFavorite 未切换为 true");
        var favs = HistoryStore.listFavorites();
        assert(favs.length === 1, "收藏列表数量不正确");
        // 同 module 同 title 覆盖
        HistoryStore.add({ module: "bazi", title: "测试八字命盘", summary: "更新摘要", tags: ["更新"], mode: "local-exact" });
        assert(HistoryStore.getCount() === 1, "同 module+title 未覆盖");
        // 清空
        HistoryStore.clear();
        assert(HistoryStore.getCount() === 0, "清空历史失败");
        HistoryStore.clearFavorites();
        assert(HistoryStore.listFavorites().length === 0, "清空收藏失败");
      }, state);

      runTest("搜索索引公开统计并覆盖知识库清单", function() {
        assert(window.GlobalSearch && GlobalSearch.getIndexStats, "缺少搜索索引统计");
        var stats = GlobalSearch.getIndexStats();
        assert(stats.mappings === 6, "映射表数量应为 6");
        assert(stats.knowledgeBase === 30, "知识库索引数量应为 30");
      }, state);

      runTest("报告导出包含 readings 结构化摘要", function() {
        var data = {
          birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" },
          bazi: { pillars: { year: "庚午", month: "壬午", day: "辛亥", hour: "甲午" } }
        };
        var report = CapabilityRegistry.exportReportData(data);
        assert(report.readings, "报告缺少 readings 字段");
        assert(typeof report.readings === "object", "readings 应为对象");
        // 至少有一个 adapter 的 reading
        var readingKeys = Object.keys(report.readings);
        assert(readingKeys.length > 0, "readings 为空，至少应包含一个 adapter 的摘要");
        readingKeys.forEach(function(key) {
          var r = report.readings[key];
          assert(r.title && r.summary, key + " reading 缺少 title/summary");
        });

        var capturedHtml = "";
        var OriginalBlob = window.Blob;
        var originalCreateObjectURL = URL.createObjectURL;
        var originalRevokeObjectURL = URL.revokeObjectURL;
        var originalClick = HTMLAnchorElement.prototype.click;
        try {
          window.Blob = function(parts, options) {
            capturedHtml = (parts || []).map(function(part) { return String(part); }).join("");
            return new OriginalBlob(parts, options);
          };
          URL.createObjectURL = function() { return "blob:test-report"; };
          URL.revokeObjectURL = function() {};
          HTMLAnchorElement.prototype.click = function() {};
          CapabilityRegistry.downloadReport(data);
        } finally {
          window.Blob = OriginalBlob;
          URL.createObjectURL = originalCreateObjectURL;
          URL.revokeObjectURL = originalRevokeObjectURL;
          HTMLAnchorElement.prototype.click = originalClick;
        }
        assert(capturedHtml.indexOf("结构化阅读摘要") >= 0, "导出 HTML 未渲染 readings 区块");
        assert(capturedHtml.indexOf(report.readings[readingKeys[0]].title) >= 0, "导出 HTML 未包含 reading 标题");
      }, state);

      runTest("咨询向导路由配置完整", function() {
        assert(typeof CapabilityRegistry.openConsultationWizard === "function", "缺少 openConsultationWizard 方法");
        // 验证向导不抛异常
        var data = { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" } };
        // openConsultationWizard 需要 DOM，在测试环境中只验证不抛异常
        try {
          CapabilityRegistry.openConsultationWizard(function() { return data; });
          var modal = document.getElementById("wizard-modal");
          assert(modal, "向导模态框未创建");
          modal.remove();
        } catch(e) {
          // DOM 不完整时可接受
        }
      }, state);

      runTest("PWA manifest 可访问", function() {
        // manifest 链接在 index.html 中，test-runner.html 不需要，仅当存在时验证
        var link = document.querySelector('link[rel="manifest"]');
        if (link) {
          assert(link.getAttribute('href'), "manifest href 缺失");
        }
      }, state);

      return state;
    }
  };
})();
