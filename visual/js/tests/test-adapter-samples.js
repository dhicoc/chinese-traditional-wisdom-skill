/**
 * test-adapter-samples.js — 八字/紫微/梅花/五运六气 Adapter 固定样例测试
 *
 * 按 ROADMAP「Adapter 验收标准」：每个 adapter 至少 3 组固定样例——
 * 普通日期、节气/年份边界、性别/时辰差异。并验证确定性（同输入两次结果一致）。
 * 依赖 window.EngineAdapterRegistry 与 lunar-javascript/iztro vendor。
 */
(function () {
  "use strict";

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
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

  var REG = window.EngineAdapterRegistry;

  function calc(name, input) {
    return REG && typeof REG.calculate === "function" ? REG.calculate(name, input) : null;
  }

  function stable(obj) {
    return JSON.stringify(obj);
  }

  window.TestAdapterSamples = {
    run: function () {
      var state = { passed: 0, failed: 0, details: [] };

      runTest("EngineAdapterRegistry 已加载", function () {
        assert(REG && typeof REG.calculate === "function", "缺少 EngineAdapterRegistry.calculate");
      }, state);

      // ── 八字 BaziLunarAdapter ───────────────────────
      var baziSamples = [
        { label: "普通日期 1990-06-15 12时男", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" } },
        { label: "节气边界 2026-02-04 6时女(立春前后)", birth: { year: 2026, month: 2, day: 4, hour: 6, gender: "女" } },
        { label: "时辰差异 1990-06-15 23时男(晚子时)", birth: { year: 1990, month: 6, day: 15, hour: 23, gender: "男" } },
      ];
      baziSamples.forEach(function (s) {
        runTest("八字 " + s.label + " 输出四柱与日主", function () {
          var r = calc("bazi", { birth: s.birth });
          assert(r, "八字计算返回空");
          assert(r.pillars && r.pillars.year && r.pillars.month && r.pillars.day && r.pillars.hour, "缺四柱");
          assert(r.pillars.year.stem && r.pillars.year.branch, "年柱缺干支");
          assert(r.dayMaster, "缺日主");
          assert(r.engineName === "BaziLunarAdapter", "engineName 不符");
          assert(r.mode === "local-exact", "应为 local-exact");
        }, state);
        runTest("八字 " + s.label + " 确定性", function () {
          var a = calc("bazi", { birth: s.birth });
          var b = calc("bazi", { birth: s.birth });
          assert(stable(a) === stable(b), "同输入两次结果不一致");
        }, state);
      });

      // ── 紫微 ZiweiIztroAdapter ──────────────────────
      var ziweiSamples = [
        { label: "普通日期 1990-06-15 12时男", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" }, mingGua: { trigram: "坎", group: "东四命" } },
        { label: "节气边界 2026-02-04 6时女", birth: { year: 2026, month: 2, day: 4, hour: 6, gender: "女" }, mingGua: { trigram: "坤", group: "西四命" } },
        { label: "性别差异 1990-06-15 12时女", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "女" }, mingGua: { trigram: "离", group: "东四命" } },
      ];
      ziweiSamples.forEach(function (s) {
        runTest("紫微 " + s.label + " 输出十二宫", function () {
          var r = calc("ziwei", { birth: s.birth, mingGua: s.mingGua });
          assert(r, "紫微计算返回空");
          assert(r.palaces, "缺 palaces");
          assert(r.engineName === "ZiweiIztroAdapter", "engineName 不符");
          assert(r.mode === "local-exact", "应为 local-exact");
          var palaceNames = Object.keys(r.palaces);
          assert(palaceNames.length === 12, "应有 12 宫，实际 " + palaceNames.length);
          assert(palaceNames.indexOf("命宫") >= 0, "缺命宫");
        }, state);
        runTest("紫微 " + s.label + " 确定性", function () {
          var a = calc("ziwei", { birth: s.birth, mingGua: s.mingGua });
          var b = calc("ziwei", { birth: s.birth, mingGua: s.mingGua });
          assert(stable(a) === stable(b), "同输入两次结果不一致");
        }, state);
      });

      // ── 梅花 LocalMeihuaTimeAdapter ─────────────────
      var meihuaSamples = [
        { label: "普通日期 1990-06-15 12时男", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男" } },
        { label: "节气边界 2026-02-04 6时女", birth: { year: 2026, month: 2, day: 4, hour: 6, gender: "女" } },
        { label: "时辰差异 1990-06-15 23时男", birth: { year: 1990, month: 6, day: 15, hour: 23, gender: "男" } },
      ];
      meihuaSamples.forEach(function (s) {
        runTest("梅花 " + s.label + " 输出卦象与动爻", function () {
          var r = calc("meihua", { birth: s.birth });
          assert(r, "梅花计算返回空");
          assert(r.upperTrigram && r.lowerTrigram, "缺上下卦");
          assert(r.upperTrigram.name && r.lowerTrigram.name, "缺卦名");
          assert(typeof r.changingLine === "number" && r.changingLine >= 1 && r.changingLine <= 6, "动爻应在 1-6");
          assert(r.hexagramName, "缺卦名");
          assert(r.engineName === "LocalMeihuaTimeAdapter", "engineName 不符");
        }, state);
        runTest("梅花 " + s.label + " 确定性", function () {
          var a = calc("meihua", { birth: s.birth });
          var b = calc("meihua", { birth: s.birth });
          assert(stable(a) === stable(b), "同输入两次结果不一致");
        }, state);
      });

      // ── 五运六气 YunqiLunarBoundaryAdapter ──────────
      var yunqiSamples = [
        { label: "普通年份 1990", year: 1990 },
        { label: "年份边界 2026", year: 2026 },
        { label: "远年 1900", year: 1900 },
      ];
      yunqiSamples.forEach(function (s) {
        runTest("五运六气 " + s.label + " 输出岁运与司天在泉", function () {
          var r = calc("yunqi", { birth: { year: s.year, month: 6, day: 15, hour: 12, gender: "男" } });
          assert(r, "五运六气计算返回空");
          assert(r.wuyun && r.wuyun.dayun, "缺岁运");
          assert(r.liuqi && r.liuqi.sitian && r.liuqi.zaiquan, "缺司天/在泉");
          assert(r.liuqi.zhuke && r.liuqi.zhuke.length === 6, "客气六步应为 6 步");
          assert(r.engineName === "YunqiLunarBoundaryAdapter", "engineName 不符");
        }, state);
        runTest("五运六气 " + s.label + " 确定性", function () {
          var a = calc("yunqi", { birth: { year: s.year, month: 6, day: 15, hour: 12, gender: "男" } });
          var b = calc("yunqi", { birth: { year: s.year, month: 6, day: 15, hour: 12, gender: "男" } });
          assert(stable(a) === stable(b), "同输入两次结果不一致");
        }, state);
      });

      return state;
    }
  };
})();
