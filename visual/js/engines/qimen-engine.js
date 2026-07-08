/**
 * qimen-engine.js — 简化时家奇门遁甲排盘引擎
 *
 * 时家奇门简化规则：
 * 1. 按当前时辰的干支定局（年干支 + 月 + 日 + 时取数）
 * 2. 阴阳遁按节气近似（冬至→夏至阳遁，夏至→冬至阴遁）
 * 3. 九宫（洛书）排布八门、九星、八神
 *
 * 这是简化规则，非专业奇门排盘（专业需精确节气、置闰、超神接气等），
 * 仅作文化学习参考。已在 confidenceNote 显式标注。
 */
(function () {
  "use strict";

  // 九宫洛书顺序（中宫不用，1-9 对应坎坤震巽中乾兑艮离）
  var PALACES = ["坎", "坤", "震", "巽", "中", "乾", "兑", "艮", "离"];
  var PALACE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // 八门（休生伤杜景死惊开）
  var DOORS = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];

  // 九星（天蓬天任天冲天辅天英天芮天柱天心天禽）
  var STARS = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心", "天禽"];

  // 八神（直符腾蛇太阴六合白虎玄武九地九天）
  var GODS = ["直符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];

  // 八门吉凶
  var DOOR_LUCK = {
    休门: "吉", 生门: "大吉", 开门: "吉",
    伤门: "凶", 杜门: "凶", 景门: "中平",
    死门: "大凶", 惊门: "凶",
  };

  // 九星吉凶
  var STAR_LUCK = {
    天心: "大吉", 天任: "吉", 天辅: "吉", 天禽: "吉",
    天蓬: "凶", 天芮: "凶", 天柱: "凶",
    天冲: "中平", 天英: "中平",
  };

  // 八神吉凶
  var GOD_LUCK = {
    直符: "大吉", 太阴: "吉", 六合: "吉", 九天: "吉",
    腾蛇: "凶", 白虎: "凶", 玄武: "凶", 九地: "中平",
  };

  // 方位 → 九宫
  var DIR_TO_PALACE = {
    北: 0, 西南: 1, 东: 2, 东南: 3, 中: 4, 西北: 5, 西: 6, 东北: 7, 南: 8,
  };

  /**
   * 简化奇门排盘
   * @param {Object} input - { birth: {year,month,day,hour}, question }
   * @returns {Object} 排盘结果
   */
  function calculate(input) {
    input = input || {};
    var birth = input.birth || {};
    var year = birth.year || 1990;
    var month = birth.month || 1;
    var day = birth.day || 1;
    var hour = birth.hour || 0;

    // 用 lunar-javascript 取时辰干支（若可用）
    var ganZhi = "";
    var lunar = null;
    try {
      if (typeof window !== "undefined" && window.Solar) {
        var solar = window.Solar.fromYmdHms
          ? window.Solar.fromYmdHms(year, month, day, hour, 0, 0)
          : window.Solar.fromYmd(year, month, day);
        lunar = solar.getLunar();
        ganZhi = lunar.getHourInGanZhi ? lunar.getHourInGanZhi() : "";
      }
    } catch (e) {
      // 无 lunar 则用近似
    }

    // 定局：年月日时取数累加 % 9 + 1 → 1-9 局
    var juNum = ((year + month + day + hour) % 9) + 1;

    // 阴阳遁：按月份近似（11-4月阳遁，5-10月阴遁）
    var dun = month >= 5 && month <= 10 ? "阴遁" : "阳遁";

    // 种子数用于轮转排布
    var seed = (year * 1000 + month * 100 + day * 10 + hour) % 8;

    // 八门按种子轮转布九宫（跳过中宫）
    var doorArr = [];
    var palaceIdx = 0;
    for (var i = 0; i < 8; i++) {
      var door = DOORS[(seed + i) % 8];
      // 跳过中宫（index 4）
      while (palaceIdx === 4) palaceIdx++;
      doorArr.push({ palace: PALACES[palaceIdx], palaceNum: PALACE_NUMS[palaceIdx], door: door, luck: DOOR_LUCK[door] || "中平" });
      palaceIdx++;
    }

    // 九星按种子轮转
    var starSeed = (seed + 3) % 9;
    var starArr = [];
    palaceIdx = 0;
    for (var j = 0; j < 9; j++) {
      var star = STARS[(starSeed + j) % 9];
      while (palaceIdx === 4 && j < 8) palaceIdx++;
      if (palaceIdx >= 9) break;
      starArr.push({ palace: PALACES[palaceIdx], palaceNum: PALACE_NUMS[palaceIdx], star: star, luck: STAR_LUCK[star] || "中平" });
      palaceIdx++;
    }

    // 八神按种子轮转
    var godSeed = (seed + 5) % 8;
    var godArr = [];
    palaceIdx = 0;
    for (var k = 0; k < 8; k++) {
      var god = GODS[(godSeed + k) % 8];
      while (palaceIdx === 4) palaceIdx++;
      godArr.push({ palace: PALACES[palaceIdx], palaceNum: PALACE_NUMS[palaceIdx], god: god, luck: GOD_LUCK[god] || "中平" });
      palaceIdx++;
    }

    // 值符（最吉星）与值使（最吉门）
    var zhiFu = starArr[0] || { star: "天心", palace: "坎" };
    var zhiShi = doorArr[0] || { door: "休门", palace: "坎" };

    // 综合吉凶判断
    var jiDoors = doorArr.filter(function (d) { return d.luck === "吉" || d.luck === "大吉"; });
    var xiongDoors = doorArr.filter(function (d) { return d.luck === "凶" || d.luck === "大凶"; });

    return {
      engineName: "LocalQimenSimplifiedAdapter",
      mode: "local-approx",
      version: "1.0.0",
      confidenceNote: "简化时家奇门遁甲排盘：按年月日时取数定局，阴阳遁按月份近似，八门/九星/八神按种子轮转布九宫。非专业奇门排盘（未含超神接气、置闰、精确节气定元），仅作文化学习参考。",
      sourceProject: "local:visual/js/engines/qimen-engine.js",
      license: "project-local",
      birthInfo: { year: year, month: month, day: day, hour: hour },
      timeGanZhi: ganZhi || "（需 lunar-javascript）",
      dun: dun,
      ju: juNum + "局",
      palaces: doorArr.map(function (d, i) {
        return {
          palace: d.palace,
          palaceNum: d.palaceNum,
          door: d.door,
          doorLuck: d.luck,
          star: starArr[i] ? starArr[i].star : "",
          starLuck: starArr[i] ? starArr[i].luck : "",
          god: godArr[i] ? godArr[i].god : "",
          godLuck: godArr[i] ? godArr[i].luck : "",
        };
      }),
      zhiFu: zhiFu.star,
      zhiShi: zhiShi.door,
      summary: dun + juNum + "局，值符" + zhiFu.star + "、值使" + zhiShi.door + "。吉门" + jiDoors.length + "、凶门" + xiongDoors.length + "。",
      question: input.question || "",
    };
  }

  window.QimenEngine = {
    calculate: calculate,
    _internal: { PALACES: PALACES, DOORS: DOORS, STARS: STARS, GODS: GODS },
  };
})();
