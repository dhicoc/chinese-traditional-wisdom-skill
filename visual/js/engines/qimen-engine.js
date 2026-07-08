/**
 * qimen-engine.js — 奇门遁甲排盘引擎（3meta 真实排盘 + 简化版 fallback）
 *
 * 主引擎：3meta v2.6.0（MIT）—— 完整时家奇门排盘，含三奇六仪、九星、
 * 八门、八神、值符值使、空亡、马星、旺相休囚、十二长生、六仪击刑、
 * 十干生克、吉凶格局自动检测。
 *
 * fallback：3meta 未加载时用简化规则（按年月日时取数定局 + 种子轮转），
 * 标注 local-approx，仅作文化学习参考。
 */
(function () {
  "use strict";

  // ── 简化 fallback 数据 ──────────────────────────────
  var PALACES = ["坎", "坤", "震", "巽", "中", "乾", "兑", "艮", "离"];
  var PALACE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var DOORS = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
  var STARS = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心", "天禽"];
  var GODS = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
  var DOOR_LUCK = { 休门: "吉", 生门: "大吉", 开门: "吉", 伤门: "凶", 杜门: "凶", 景门: "中平", 死门: "大凶", 惊门: "凶" };
  var STAR_LUCK = { 天心: "大吉", 天任: "吉", 天辅: "吉", 天禽: "吉", 天蓬: "凶", 天芮: "凶", 天柱: "凶", 天冲: "中平", 天英: "中平" };
  var GOD_LUCK = { 值符: "大吉", 太阴: "吉", 六合: "吉", 九天: "吉", 腾蛇: "凶", 白虎: "凶", 玄武: "凶", 九地: "中平" };

  function has3meta() {
    return typeof window !== "undefined" && window.ThreeMeta && typeof window.ThreeMeta.QimenChart === "function";
  }

  /**
   * 主排盘入口。优先用 3meta 真实排盘，fallback 用简化版。
   */
  function calculate(input) {
    input = input || {};
    var birth = input.birth || {};
    var year = birth.year || 1990;
    var month = birth.month || 1;
    var day = birth.day || 1;
    var hour = birth.hour || 0;
    var minute = birth.minute || 0;

    if (has3meta()) {
      return calculateWith3meta(year, month, day, hour, minute, input);
    }
    return calculateSimplified(year, month, day, hour, input);
  }

  // ── 3meta 真实排盘 ──────────────────────────────────
  function calculateWith3meta(year, month, day, hour, minute, input) {
    var datetime = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0") + " " + String(hour).padStart(2, "0") + ":" + String(minute || 0).padStart(2, "0") + ":00";
    var chart;
    try {
      chart = window.ThreeMeta.QimenChart.byDatetime(datetime);
    } catch (e) {
      return calculateSimplified(year, month, day, hour, input);
    }

    // 转换九宫数据为统一输出格式
    var palaces = chart.palaces.map(function (p) {
      return {
        position: p.position,
        trigram: p.trigram,
        palaceNum: p.position,
        palace: p.trigram,
        gate: typeof p.gate === "string" ? p.gate : "无门",
        gateLuck: getGateLuck(p.gate, p.gatePressure),
        star: Array.isArray(p.star) ? p.star.join("+") : (p.star || ""),
        starLuck: getStarLuck(p.star),
        deity: typeof p.deity === "string" ? p.deity : "无神",
        godLuck: getGodLuck(p.deity),
        heavenlyStem: Array.isArray(p.heavenlyStem) ? p.heavenlyStem.join("+") : (p.heavenlyStem || ""),
        earthlyStem: Array.isArray(p.earthlyStem) ? p.earthlyStem.join("+") : (p.earthlyStem || ""),
        earthBranch: Array.isArray(p.earthBranch) ? p.earthBranch.join("+") : (p.earthBranch || ""),
        fiveElements: p.fiveElements || "",
        status: p.status ? { star: p.status.star || "", gate: p.status.gate || "" } : null,
        innerOuter: p.innerOuter || "",
        voidness: p.voidness ? { hasVoidness: !!p.voidness.hasVoidness, voidInPalace: p.voidness.voidInPalace || [] } : null,
        isZhiFu: !!p.isZhiFu,
        isZhiShi: !!p.isZhiShi,
        horse: !!p.isPostHorse,
        auspiciousPatterns: (p.auspiciousPatterns || []).map(function (a) { return a.name || a.type || ""; }),
        inauspiciousPatterns: (p.inauspiciousPatterns || []).map(function (a) { return a.name || a.type || ""; }),
        tenStemResponse: p.tenStemResponse ? {
          heavenlyToEarthly: p.tenStemResponse.heavenlyToEarthly ? p.tenStemResponse.heavenlyToEarthly.description : "",
          timeToDay: p.tenStemResponse.timeToDay ? p.tenStemResponse.timeToDay.description : "",
        } : null,
      };
    });

    // 全局格局
    var specialPatterns = chart.specialPatterns || {};
    var auspicious = specialPatterns.auspiciousPatterns || [];
    var inauspicious = specialPatterns.inauspiciousPatterns || [];

    return {
      engineName: "Qimen3metaAdapter",
      mode: "local-exact",
      version: "3meta@2.6.0",
      confidenceNote: "基于 3meta v2.6.0 时家奇门排盘（拆补法）：含三奇六仪、九星、八门、八神、值符值使、空亡、马星、旺相休囚、十二长生、六仪击刑、十干生克、吉凶格局自动检测。不同流派在排盘方法（拆补/置闰/均分）与格局解读上可能有差异。",
      sourceProject: "3metaJun/3meta (MIT)",
      license: "MIT",
      birthInfo: { year: year, month: month, day: day, hour: hour, minute: minute },
      timeInfo: chart.timeInfo ? {
        yearGZ: chart.fourPillars ? chart.fourPillars.year.stem + chart.fourPillars.year.branch : "",
        monthGZ: chart.fourPillars ? chart.fourPillars.month.stem + chart.fourPillars.month.branch : "",
        dayGZ: chart.fourPillars ? chart.fourPillars.day.stem + chart.fourPillars.day.branch : "",
        hourGZ: chart.fourPillars ? chart.fourPillars.hour.stem + chart.fourPillars.hour.branch : "",
      } : null,
      dun: chart.ju ? chart.ju.type : "",
      ju: chart.ju ? chart.ju.number + "局" : "",
      yuan: chart.yuan || "",
      season: chart.season || "",
      monthElement: chart.monthElement || "",
      zhiFu: chart.zhiFu ? { star: chart.zhiFu.star, position: chart.zhiFu.position, heavenlyStem: chart.zhiFu.heavenlyStem } : null,
      zhiShi: chart.zhiShi ? { gate: chart.zhiShi.gate, position: chart.zhiShi.position } : null,
      postHorse: chart.postHorse || null,
      palaces: palaces,
      auspiciousPatterns: auspicious.map(function (a) { return a.name || a.type || ""; }),
      inauspiciousPatterns: inauspicious.map(function (a) { return a.name || a.type || ""; }),
      menPo: specialPatterns.menPo || null,
      wuBuYuShi: specialPatterns.wuBuYuShi || null,
      summary: (chart.ju ? chart.ju.type + chart.ju.number + "局" : "") +
        "，值符" + (chart.zhiFu ? chart.zhiFu.star : "") +
        "、值使" + (chart.zhiShi ? chart.zhiShi.gate : "") +
        "。吉格" + auspicious.length + "、凶格" + inauspicious.length + "。",
      question: input.question || "",
      _is3meta: true,
    };
  }

  function getGateLuck(gate, pressure) {
    if (typeof gate !== "string") return "中平";
    var luck = DOOR_LUCK[gate] || "中平";
    if (pressure === "迫") return "凶"; // 门迫为凶
    return luck;
  }
  function getStarLuck(star) {
    if (Array.isArray(star)) {
      return star.map(function (s) { return STAR_LUCK[s] || "中平"; }).join("/");
    }
    return STAR_LUCK[star] || "中平";
  }
  function getGodLuck(deity) {
    if (typeof deity !== "string") return "中平";
    return GOD_LUCK[deity] || "中平";
  }

  // ── 简化 fallback ───────────────────────────────────
  function calculateSimplified(year, month, day, hour, input) {
    var ganZhi = "";
    try {
      if (typeof window !== "undefined" && window.Solar) {
        var solar = window.Solar.fromYmdHms
          ? window.Solar.fromYmdHms(year, month, day, hour, 0, 0)
          : window.Solar.fromYmd(year, month, day);
        var lunar = solar.getLunar();
        ganZhi = lunar.getHourInGanZhi ? lunar.getHourInGanZhi() : "";
      }
    } catch (e) {}

    var juNum = ((year + month + day + hour) % 9) + 1;
    var dun = month >= 5 && month <= 10 ? "阴遁" : "阳遁";
    var seed = (year * 1000 + month * 100 + day * 10 + hour) % 8;

    var doorArr = [], starArr = [], godArr = [];
    var palaceIdx = 0;
    for (var i = 0; i < 8; i++) {
      while (palaceIdx === 4) palaceIdx++;
      doorArr.push({ palace: PALACES[palaceIdx], palaceNum: PALACE_NUMS[palaceIdx], door: DOORS[(seed + i) % 8], luck: DOOR_LUCK[DOORS[(seed + i) % 8]] || "中平" });
      palaceIdx++;
    }
    palaceIdx = 0;
    var starSeed = (seed + 3) % 9;
    for (var j = 0; j < 8; j++) {
      while (palaceIdx === 4) palaceIdx++;
      starArr.push({ palace: PALACES[palaceIdx], star: STARS[(starSeed + j) % 9], luck: STAR_LUCK[STARS[(starSeed + j) % 9]] || "中平" });
      palaceIdx++;
    }
    palaceIdx = 0;
    var godSeed = (seed + 5) % 8;
    for (var k = 0; k < 8; k++) {
      while (palaceIdx === 4) palaceIdx++;
      godArr.push({ palace: PALACES[palaceIdx], god: GODS[(godSeed + k) % 8], luck: GOD_LUCK[GODS[(godSeed + k) % 8]] || "中平" });
      palaceIdx++;
    }

    var palaces = doorArr.map(function (d, i) {
      return {
        position: d.palaceNum, trigram: d.palace, palace: d.palace, palaceNum: d.palaceNum,
        gate: d.door, gateLuck: d.luck,
        star: starArr[i] ? starArr[i].star : "", starLuck: starArr[i] ? starArr[i].luck : "",
        deity: godArr[i] ? godArr[i].god : "", godLuck: godArr[i] ? godArr[i].luck : "",
        heavenlyStem: "", earthlyStem: "", earthBranch: "",
        fiveElements: "", status: null, innerOuter: "", voidness: null,
        isZhiFu: i === 0, isZhiShi: i === 0, horse: false,
        auspiciousPatterns: [], inauspiciousPatterns: [], tenStemResponse: null,
      };
    });

    return {
      engineName: "LocalQimenSimplifiedAdapter",
      mode: "local-approx",
      version: "1.0.0",
      confidenceNote: "3meta 未加载，使用简化时家奇门排盘：按年月日时取数定局，八门/九星/八神按种子轮转布九宫。非专业奇门排盘，仅作文化学习参考。",
      sourceProject: "local:visual/js/engines/qimen-engine.js",
      license: "project-local",
      birthInfo: { year: year, month: month, day: day, hour: hour },
      timeInfo: null,
      timeGanZhi: ganZhi || "（需 lunar-javascript）",
      dun: dun,
      ju: juNum + "局",
      yuan: "", season: "", monthElement: "",
      zhiFu: { star: starArr[0] ? starArr[0].star : "天心", position: 1 },
      zhiShi: { gate: doorArr[0] ? doorArr[0].door : "休门", position: 1 },
      postHorse: null,
      palaces: palaces,
      auspiciousPatterns: [],
      inauspiciousPatterns: [],
      menPo: null, wuBuYuShi: null,
      summary: dun + juNum + "局，值符" + (starArr[0] ? starArr[0].star : "") + "、值使" + (doorArr[0] ? doorArr[0].door : "") + "。简化排盘。",
      question: input.question || "",
      _is3meta: false,
    };
  }

  window.QimenEngine = {
    calculate: calculate,
    has3meta: has3meta,
    _internal: { PALACES: PALACES, DOORS: DOORS, STARS: STARS, GODS: GODS },
  };
})();
