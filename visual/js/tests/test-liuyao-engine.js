/**
 * test-liuyao-engine.js — 六爻纳甲引擎领域规则测试
 *
 * 校验本地京房八宫纳甲引擎(liuyao-engine.js)的固定 oracle：
 *   64卦覆盖、八宫归属、世应位置、八纯卦纳甲天干地支、六亲生克、六神起例、用神选取、起卦方式、变卦、确定性。
 * 规则来源：reference-metaphysics.md 纳甲表 + 《京房易传》八宫演变。
 *
 * 依赖 window.LiuyaoEngine。浏览器端在 test-runner.html 加载；也可在 Node 中 eval 加载。
 */
(function () {
  "use strict";

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function eq(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
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

  window.TestLiuyaoEngine = {
    run: function () {
      var state = { passed: 0, failed: 0, details: [] };
      var I = (window.LiuyaoEngine && window.LiuyaoEngine._internal) || null;
      var E = window.LiuyaoEngine || null;

      runTest("LiuyaoEngine 已加载并暴露 _internal", function () {
        assert(window.LiuyaoEngine && typeof window.LiuyaoEngine.calculate === "function", "缺少 LiuyaoEngine.calculate");
        assert(I, "缺少 _internal 测试入口");
      }, state);

      if (!I || !E) {
        state.details.push("⚠️ LiuyaoEngine 未加载，跳过领域规则测试");
        return state;
      }

      // ─── 64 卦覆盖与八宫归属 ───
      runTest("HEXAGRAM_NAMES 覆盖 64 卦且无重复", function () {
        var names = Object.keys(I.HEXAGRAM_NAMES).map(function (k) { return I.HEXAGRAM_NAMES[k]; });
        assert(names.length === 64, "卦名键数应为 64，实际 " + names.length);
        assert(new Set(names).size === 64, "64 卦名存在重复");
      }, state);

      runTest("八宫表共 64 卦且全部可命名", function () {
        var total = 0, named = 0;
        Object.keys(I.PALACE_HEXAGRAMS).forEach(function (pn) {
          assert(I.PALACE_HEXAGRAMS[pn].length === 8, pn + " 应有 8 卦");
          I.PALACE_HEXAGRAMS[pn].forEach(function (pair) {
            total++;
            if (I.HEXAGRAM_NAMES[pair[0] + "|" + pair[1]]) named++;
          });
        });
        assert(total === 64 && named === 64, "八宫表应覆盖 64 卦并全部命名，实际 " + named + "/" + total);
      }, state);

      runTest("乾宫八卦顺序符合京房演变(乾/姤/遁/否/观/剥/晋/大有)", function () {
        var g = I.PALACE_HEXAGRAMS["乾宫"].map(function (p) { return I.HEXAGRAM_NAMES[p[0] + "|" + p[1]]; });
        assert(eq(g, ["乾为天", "天风姤", "天山遁", "天地否", "风地观", "山地剥", "火地晋", "火天大有"]), "乾宫顺序错误: " + JSON.stringify(g));
      }, state);

      // ─── 世应位置(每宫8卦固定序列 6/1/2/3/4/5/4/3) ───
      runTest("全部 64 卦世爻位置符合八宫规则", function () {
        var EXPECT = [6, 1, 2, 3, 4, 5, 4, 3];
        Object.keys(I.PALACE_HEXAGRAMS).forEach(function (pn) {
          I.PALACE_HEXAGRAMS[pn].forEach(function (pair, idx) {
            var hex = I.lookupHexagram(pair[0], pair[1]);
            var sy = I.shiYing(hex);
            assert(sy.shi === EXPECT[idx], pn + "#" + idx + " " + hex.name + " 世应为 " + sy.shi + " 期望 " + EXPECT[idx]);
            assert(sy.ying === ((sy.shi - 1 + 3) % 6) + 1, hex.name + " 应爻与世爻未隔两位");
          });
        });
      }, state);

      // ─── 八纯卦纳甲固定 oracle ───
      runTest("八纯卦纳甲天干与起始地支符合京房体系", function () {
        var cases = [
          ["乾", ["子", "寅", "辰", "午", "申", "戌"], ["甲", "甲", "甲", "壬", "壬", "壬"]],
          ["坤", ["未", "巳", "卯", "丑", "亥", "酉"], ["乙", "乙", "乙", "癸", "癸", "癸"]],
          ["坎", ["寅", "辰", "午", "申", "戌", "子"], ["戊", "戊", "戊", "戊", "戊", "戊"]],
          ["离", ["卯", "丑", "亥", "酉", "未", "巳"], ["己", "己", "己", "己", "己", "己"]],
          ["震", ["子", "寅", "辰", "午", "申", "戌"], ["庚", "庚", "庚", "庚", "庚", "庚"]],
          ["巽", ["丑", "亥", "酉", "未", "巳", "卯"], ["辛", "辛", "辛", "辛", "辛", "辛"]],
          ["艮", ["辰", "午", "申", "戌", "子", "寅"], ["丙", "丙", "丙", "丙", "丙", "丙"]],
          ["兑", ["巳", "卯", "丑", "亥", "酉", "未"], ["丁", "丁", "丁", "丁", "丁", "丁"]]
        ];
        cases.forEach(function (c) {
          var hex = I.lookupHexagram(c[0], c[0]);
          var nj = I.buildNajia(hex);
          var branches = nj.map(function (n) { return n.branch; });
          var stems = nj.map(function (n) { return n.stem; });
          assert(eq(branches, c[1]), c[0] + " 纳甲地支错误: " + branches.join(","));
          assert(eq(stems, c[2]), c[0] + " 纳甲天干错误: " + stems.join(","));
        });
      }, state);

      // ─── 六亲规则(以宫五行为"我") ───
      runTest("六亲按宫五行生克正确(乾宫金为'我')", function () {
        assert(I.sixRelation("金", "金") === "兄弟", "同我应兄弟");
        assert(I.sixRelation("金", "水") === "子孙", "我生水应子孙");
        assert(I.sixRelation("金", "木") === "妻财", "我克木应妻财");
        assert(I.sixRelation("金", "土") === "父母", "生我土应父母");
        assert(I.sixRelation("金", "火") === "官鬼", "克我火应官鬼");
      }, state);

      runTest("乾为天六亲分布正确(金宫: 子孙/妻财/父母/官鬼/兄弟/父母)", function () {
        var hex = I.lookupHexagram("乾", "乾");
        var nj = I.buildNajia(hex);
        var rels = nj.map(function (n) { return n.relation; });
        assert(eq(rels, ["子孙", "妻财", "父母", "官鬼", "兄弟", "父母"]), "乾为天六亲错误: " + rels.join(","));
      }, state);

      // ─── 六神起例(按日干) ───
      runTest("六神按日干从初爻起安放", function () {
        var lines = [{}, {}, {}, {}, {}, {}];
        I.assignSixGods(lines, "甲");
        assert(eq(lines.map(function (l) { return l.god; }), ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"]), "甲日六神顺序错误");
        I.assignSixGods(lines, "丙");
        assert(eq(lines.map(function (l) { return l.god; }), ["朱雀", "勾陈", "螣蛇", "白虎", "玄武", "青龙"]), "丙日六神顺序错误");
        I.assignSixGods(lines, "壬");
        assert(eq(lines.map(function (l) { return l.god; }), ["玄武", "青龙", "朱雀", "勾陈", "螣蛇", "白虎"]), "壬日六神顺序错误");
      }, state);

      // ─── 用神选取 ───
      runTest("用神按问题事项选取", function () {
        assert(I.resolveYongShen("今日财运如何", "男") === "妻财", "求财应妻财");
        assert(I.resolveYongShen("能否升职", "男") === "官鬼", "升职应官鬼");
        assert(I.resolveYongShen("官非诉讼", "男") === "官鬼", "官非应官鬼");
        assert(I.resolveYongShen("病情如何", "男") === "官鬼", "疾病应官鬼");
        assert(I.resolveYongShen("考试能否通过", "男") === "父母", "考试应父母");
        assert(I.resolveYongShen("买房子", "男") === "父母", "房屋应父母");
        assert(I.resolveYongShen("孩子升学", "男") === "子孙", "子女应子孙");
        assert(I.resolveYongShen("合伙生意", "男") === "兄弟", "合伙应兄弟");
        assert(I.resolveYongShen("感情发展", "男") === "妻财", "男占婚恋应妻财");
        assert(I.resolveYongShen("感情发展", "女") === "官鬼", "女占婚恋应官鬼");
      }, state);

      runTest("无问题文本时按性别默认用神", function () {
        assert(I.resolveYongShen("", "男") === "妻财", "男命无问题文本时应默认妻财");
        assert(I.resolveYongShen(null, "女") === "官鬼", "女命无问题文本时应默认官鬼");
        assert(I.resolveYongShen(undefined, "") === "世爻", "无问题文本且无性别时应默认世爻");
      }, state);

      // ─── 起卦方式 ───
      runTest("铜钱爻值解析: 6老阴变 7少阳 8少阴 9老阳变", function () {
        assert(eq(I.yaoValueToLine(6), { yin: true, changing: true }), "6 应为老阴(变)");
        assert(eq(I.yaoValueToLine(7), { yin: false, changing: false }), "7 应为少阳(静)");
        assert(eq(I.yaoValueToLine(8), { yin: true, changing: false }), "8 应为少阴(静)");
        assert(eq(I.yaoValueToLine(9), { yin: false, changing: true }), "9 应为老阳(变)");
      }, state);

      runTest("手动爻值 789789 起卦: 动爻为第3、6爻", function () {
        var r = E.calculate({ method: "manual", yaoValues: "789789", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false }, question: "求财" });
        assert(eq(r.changingYao, [3, 6]), "动爻应为 [3,6]，实际 " + JSON.stringify(r.changingYao));
        assert(r.hexagramName === "离为火", "789789 本卦应为离为火，实际 " + r.hexagramName);
        assert(r.changingHexagramName === "坤为地", "变卦应为坤为地，实际 " + r.changingHexagramName);
      }, state);

      runTest("手动爻值非法格式抛错", function () {
        var threw = false;
        try { E.calculate({ method: "manual", yaoValues: "123456", birth: { year: 2000, month: 1, day: 1, hour: 12, useExactCalendar: false } }); } catch (e) { threw = true; }
        assert(threw, "非法爻值应抛错");
      }, state);

      runTest("铜钱法同 seed 确定性可复现", function () {
        var a = E.calculate({ method: "coin", seed: 42, birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false }, question: "求财" });
        var b = E.calculate({ method: "coin", seed: 42, birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false }, question: "求财" });
        assert(eq(a.lines, b.lines) && a.hexagramName === b.hexagramName, "同 seed 铜钱法应确定性复现");
      }, state);

      runTest("时间起卦确定性且产出合法卦象", function () {
        var r = E.calculate({ method: "time", birth: { year: 2026, month: 7, day: 6, hour: 14, gender: "男", useExactCalendar: false }, question: "事业" });
        assert(r.hexagramName && r.changingYao.length >= 1, "时间起卦应有动爻");
        assert(r.palace && r.shiYao >= 1, "时间起卦应有宫属与世应");
      }, state);

      // ─── 完整结果契约(对齐 divination.js 渲染) ───
      runTest("calculate 输出满足 divination.js 渲染契约", function () {
        var r = E.calculate({ method: "coin", seed: 7, birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false }, question: "求财" });
        assert(r.lines.length === 6, "应有 6 爻");
        assert(r.lines.every(function (l) { return "yin" in l && "changing" in l && l.god && l.branch && l.relation; }), "每爻应含 yin/changing/god/branch/relation");
        assert(r.hexagramName && typeof r.shiYao === "number" && typeof r.yingYao === "number" && r.yongShen, "缺卦名/世应/用神");
        assert(r.engineName === "LocalLiuyaoNajiaAdapter" && r.mode === "local-exact", "应标注真实引擎");
        assert(r.changingHexagramName, "应有变卦名");
      }, state);

      runTest("无动爻时变卦名等于本卦名", function () {
        // 构造全静爻: 7少阳(8) 混合无 6/9, 用 888888(全少阴静)
        var r = E.calculate({ method: "manual", yaoValues: "888888", birth: { year: 1990, month: 6, day: 15, hour: 12, gender: "男", useExactCalendar: false } });
        assert(r.changingYao.length === 0, "888888 应无动爻");
        assert(r.changingHexagramName === r.hexagramName, "无动爻时变卦名应等于本卦名");
      }, state);

      return state;
    }
  };
})();
