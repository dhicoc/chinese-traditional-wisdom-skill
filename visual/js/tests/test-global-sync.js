/**
 * test-global-sync.js — 全局命盘数据同步回归测试
 *
 * 覆盖用户在 Dashboard 全局输入后，各标签页控件和 FORTUNE 快照必须一致。
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

  function ensureInput(parent, id, value) {
    if (document.getElementById(id)) return;
    var input = document.createElement("input");
    input.id = id;
    input.value = value || "";
    parent.appendChild(input);
  }

  function ensureSelect(parent, id, values, selected) {
    if (document.getElementById(id)) return;
    var select = document.createElement("select");
    select.id = id;
    values.forEach(function(value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      if (value === selected) option.selected = true;
      select.appendChild(option);
    });
    parent.appendChild(select);
  }

  function ensureCheckbox(parent, id, checked) {
    if (document.getElementById(id)) return;
    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.checked = checked !== false;
    parent.appendChild(input);
  }

  function ensureCanvas(parent, id, width, height) {
    if (document.getElementById(id)) return;
    var canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.width = width;
    canvas.height = height;
    parent.appendChild(canvas);
  }

  function ensureFixture() {
    var fixture = document.getElementById("global-sync-fixture");
    if (!fixture) {
      fixture = document.createElement("div");
      fixture.id = "global-sync-fixture";
      fixture.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(fixture);
    }

    ["gi-year","gi-month","gi-day","gi-hour","bazi-year","bazi-month","bazi-day","bazi-hour","wx-wood","wx-fire","wx-earth","wx-metal","wx-water","zw-year","ly-hexagram","fs-year","bz-year","yq-year","c1","c2","c3","c4","c5","c6","c7","c8","c9"].forEach(function(id) {
      ensureInput(fixture, id, "");
    });
    ensureSelect(fixture, "gi-gender", ["男","女"], "男");
    ensureCheckbox(fixture, "gi-exact-calendar", true);
    ensureSelect(fixture, "bazi-gender", ["男","女"], "男");
    ensureSelect(fixture, "zw-gender", ["男","女"], "男");
    ensureSelect(fixture, "ly-yongshen", ["父母","兄弟","官鬼","妻财","子孙"], "妻财");
    ensureSelect(fixture, "mh-upper", ["乾","兑","离","震","巽","坎","艮","坤"], "乾");
    ensureSelect(fixture, "mh-lower", ["乾","兑","离","震","巽","坎","艮","坤"], "乾");
    ensureSelect(fixture, "mh-moving", ["1","2","3","4","5","6"], "1");
    ensureSelect(fixture, "bz-gender", ["男","女"], "男");

    var dominant = document.getElementById("dominant-constitution");
    if (!dominant) {
      dominant = document.createElement("span");
      dominant.id = "dominant-constitution";
      fixture.appendChild(dominant);
    }

    ensureCanvas(fixture, "bazi-canvas", 600, 480);
    ensureCanvas(fixture, "wuxing-canvas", 520, 460);
    ensureCanvas(fixture, "ziwei-canvas", 650, 570);
    ensureCanvas(fixture, "liuyao-canvas", 450, 520);
    ensureCanvas(fixture, "meihua-canvas", 500, 460);
    ensureCanvas(fixture, "compass-canvas", 500, 500);
    ensureCanvas(fixture, "flying-stars-canvas", 360, 400);
    ensureCanvas(fixture, "eight-mansions-canvas", 500, 500);
    ensureCanvas(fixture, "yunqi-canvas", 550, 460);
    ensureCanvas(fixture, "constitution-canvas", 400, 420);
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  function canvasHasPixels(id) {
    var canvas = document.getElementById(id);
    var ctx = canvas.getContext("2d");
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  }

  window.TestGlobalSync = {
    run: function() {
      var state = { passed: 0, failed: 0, details: [] };

      runTest("FORTUNE 全局更新同步所有标签控件", function() {
        ensureFixture();
        assert(window.FORTUNE && FORTUNE.update, "缺少 FORTUNE.update");
        FORTUNE.update({ year: 1993, month: 6, day: 15, hour: 12, gender: "女" });

        var birth = FORTUNE.getBirth();
        var data = FORTUNE.getData();
        assert(birth.year === 1993 && birth.month === 6 && birth.day === 15 && birth.hour === 12 && birth.gender === "女", "全局 birth 未更新");
        assert(data.ziwei.birthInfo.year === 1993 && data.ziwei.birthInfo.month === 6 && data.ziwei.birthInfo.day === 15 && data.ziwei.birthInfo.hour === 12 && data.ziwei.birthInfo.gender === "女", "紫微 birthInfo 未同步完整生辰");

        assert(val("gi-year") === "1993" && val("gi-month") === "6" && val("gi-day") === "15" && val("gi-hour") === "12" && val("gi-gender") === "女", "全局输入面板未同步");
        assert(document.getElementById("gi-exact-calendar").checked === true, "精确历法开关未保持开启");
        assert(val("zw-year") === "1993" && val("zw-gender") === "女", "紫微控件未同步");
        assert(val("fs-year") === "1993", "流年飞星年份未同步");
        assert(val("bz-year") === "1993" && val("bz-gender") === "女", "八宅控件未同步");
        assert(val("yq-year") === "1993", "五运六气年份未同步");
        assert(val("bazi-gender") === "女", "八字性别未同步");
        assert(val("ly-hexagram") === data.divination.liuyao.hexagramName, "六爻卦名未同步");
        assert(val("ly-yongshen") === data.divination.liuyao.yongShen, "六爻用神未同步");
        assert(val("mh-upper") === data.divination.meihua.upperTrigram.name, "梅花上卦未同步");
        assert(val("mh-lower") === data.divination.meihua.lowerTrigram.name, "梅花下卦未同步");
        assert(val("mh-moving") === String(data.divination.meihua.changingLine || 1), "梅花动爻未同步");
      }, state);

      runTest("全局同步后核心画布非空", function() {
        ["bazi-canvas", "wuxing-canvas", "ziwei-canvas", "liuyao-canvas", "meihua-canvas", "flying-stars-canvas", "eight-mansions-canvas", "yunqi-canvas", "constitution-canvas"].forEach(function(id) {
          assert(canvasHasPixels(id), id + " 为空");
        });
      }, state);

      runTest("导出报告不泄露完整生辰", function() {
        var report = FORTUNE.exportReportData();
        var serialized = JSON.stringify(report.subject);
        assert(report.subject.birthYear === 1993, "脱敏年份不正确");
        assert(serialized.indexOf("\"month\"") === -1 && serialized.indexOf("\"day\"") === -1 && serialized.indexOf("\"hour\"") === -1, "subject 泄露月日时");
      }, state);

      return state;
    }
  };
})();
