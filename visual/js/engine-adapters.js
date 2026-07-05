/**
 * engine-adapters.js — Dashboard 引擎适配层
 *
 * 统一本地引擎、演示数据和未来外部引擎的调用契约。
 * 本文件不改变任何 Canvas render 接口，只负责 calculate/toRenderData 的标准化。
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var ADAPTER_VERSION = "0.3.0";
  var adapters = {};

  var REQUIRED_FIELDS = [
    "engineName", "mode", "version", "inputSchema", "sourceProject",
    "license", "calculate", "toRenderData", "confidenceNote"
  ];

  // toReading() 是可选方法，返回结构化阅读摘要
  // { title, summary, tags, sections, sourceNotes }
  // sections: [{ heading, body }]
  var OPTIONAL_METHODS = ["toReading"];

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeBirth(input) {
    var raw = input && input.birth ? input.birth : input || {};
    return {
      year: Number(raw.year) || 1990,
      month: Number(raw.month) || 6,
      day: Number(raw.day) || 15,
      hour: Number(raw.hour) || 12,
      minute: Number(raw.minute) || 0,
      gender: raw.gender === "女" ? "女" : "男",
      isLunar: raw.isLunar === true,
      useExactCalendar: raw.useExactCalendar !== false
    };
  }

  function seededRand(seed) {
    var s = Math.abs(Number(seed) || 1) % 233280;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function buildSeed(birth) {
    return birth.year * 1000000 + birth.month * 10000 + birth.day * 100 + birth.hour + (birth.gender === "女" ? 7 : 3);
  }
  var TG = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var DZ = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var STEM_WX = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  var STEM_YY = ["阳", "阴", "阳", "阴", "阳", "阴", "阳", "阴", "阳", "阴"];
  var HIDDEN = {
    "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
    "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"],
    "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
    "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"]
  };

  function hasLunarJavascript() {
    return !!(window.Solar && (typeof window.Solar.fromYmdHms === "function" || typeof window.Solar.fromYmd === "function"));
  }

  function callFirst(obj, names) {
    if (!obj) return "";
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (typeof obj[name] === "function") return obj[name]();
      if (obj[name] !== undefined) return obj[name];
    }
    return "";
  }

  function extractPillarText(eightChar, keys) {
    var value = callFirst(eightChar, keys);
    if (value && typeof value.toString === "function") value = value.toString();
    return String(value || "").replace(/\s/g, "").slice(0, 2);
  }

  function pillarFromText(text) {
    var stem = text.charAt(0);
    var branch = text.charAt(1);
    var stemIndex = TG.indexOf(stem);
    var branchIndex = DZ.indexOf(branch);
    if (stemIndex < 0 || branchIndex < 0) throw new Error("无法解析干支: " + text);
    return { stem: stem, branch: branch, stemIndex: stemIndex, branchIndex: branchIndex };
  }

  function getShiShen(dayStem, otherStem) {
    var diff = (otherStem - dayStem + 10) % 10;
    var same = (dayStem % 2 === 0) === (otherStem % 2 === 0);
    if (diff === 0) return same ? "比肩" : "劫财";
    if (diff === 1) return same ? "偏印" : "正印";
    if (diff === 2) return "食神";
    if (diff === 3) return "伤官";
    if (diff === 4) return "偏财";
    if (diff === 5) return "正财";
    if (diff === 6) return "七杀";
    if (diff === 7) return "正官";
    if (diff === 8) return same ? "比肩" : "劫财";
    if (diff === 9) return same ? "偏印" : "正印";
    return "";
  }

  function calcElements(pillars) {
    var c = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
    ["year", "month", "day", "hour"].forEach(function (key) {
      var p = pillars[key];
      c[STEM_WX[p.stemIndex]] += 2;
      var branchWx = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"][p.branchIndex];
      c[branchWx] += 2;
      (HIDDEN[p.branch] || []).forEach(function (h) {
        var hi = TG.indexOf(h);
        if (hi >= 0) c[STEM_WX[hi]] += 1;
      });
    });
    return c;
  }

  function buildBaziResultFromPillars(pillars, birth, fallback) {
    var dm = pillars.day.stemIndex;
    var hiddenStems = {};
    var shishen = {};
    var shishenList = {};
    ["year", "month", "day", "hour"].forEach(function (key) {
      hiddenStems[key] = HIDDEN[pillars[key].branch] || [];
      shishenList[key] = getShiShen(dm, pillars[key].stemIndex);
      var mainH = hiddenStems[key].length ? TG.indexOf(hiddenStems[key][0]) : -1;
      shishen[key] = {
        stem: shishenList[key],
        branch: mainH >= 0 ? getShiShen(dm, mainH) : ""
      };
    });
    return {
      engineName: "BaziLunarAdapter",
      mode: "local-exact",
      confidenceNote: "已通过 lunar-javascript/Solar 全局对象读取节气干支；起运仍沿用本地简化大运。",
      sourceProject: "6tail/lunar-javascript",
      pillars: pillars,
      dayMaster: pillars.day.stem,
      dayMasterWuxing: STEM_WX[dm],
      dayMasterYinYang: STEM_YY[dm],
      gender: birth.gender,
      hiddenStems: hiddenStems,
      shishen: shishen,
      shishenList: shishenList,
      elements: calcElements(pillars),
      luck: fallback && fallback.luck ? fallback.luck : [],
      calendar: { provider: "lunar-javascript", exactSolarTerms: true }
    };
  }

  function calculateBaziWithLunarJavascript(input) {
    var birth = normalizeBirth(input);
    if (birth.useExactCalendar === false || !hasLunarJavascript()) return null;
    var solar = window.Solar.fromYmdHms
      ? window.Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
      : window.Solar.fromYmd(birth.year, birth.month, birth.day);
    var lunar = solar && typeof solar.getLunar === "function" ? solar.getLunar() : null;
    var eightChar = lunar && typeof lunar.getEightChar === "function" ? lunar.getEightChar() : null;
    if (!eightChar) return null;
    var pillars = {
      year: pillarFromText(extractPillarText(eightChar, ["getYear", "getYearGanZhi", "year", "yearGanZhi"])),
      month: pillarFromText(extractPillarText(eightChar, ["getMonth", "getMonthGanZhi", "month", "monthGanZhi"])),
      day: pillarFromText(extractPillarText(eightChar, ["getDay", "getDayGanZhi", "day", "dayGanZhi"])),
      hour: pillarFromText(extractPillarText(eightChar, ["getTime", "getTimeGanZhi", "getHour", "hour", "timeGanZhi"] ))
    };
    var fallback = window.BaziEngine && window.BaziEngine.calculate ? window.BaziEngine.calculate(birth) : null;
    return buildBaziResultFromPillars(pillars, birth, fallback);
  }

  function extractSolarLikeDate(value) {
    if (!value) return null;
    if (typeof value === "string") {
      var m = value.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null;
    }
    var year = callFirst(value, ["getYear", "year"]);
    var month = callFirst(value, ["getMonth", "month"]);
    var day = callFirst(value, ["getDay", "day"]);
    if (year && month && day) return { year: Number(year), month: Number(month), day: Number(day) };
    return null;
  }

  function getDaHanDate(year, useExactCalendar) {
    if (useExactCalendar === false || !hasLunarJavascript()) return null;
    var solar = window.Solar.fromYmd ? window.Solar.fromYmd(year, 1, 15) : window.Solar.fromYmdHms(year, 1, 15, 0, 0, 0);
    var lunar = solar && typeof solar.getLunar === "function" ? solar.getLunar() : null;
    var table = lunar && typeof lunar.getJieQiTable === "function" ? lunar.getJieQiTable() : null;
    if (!table) return null;
    return extractSolarLikeDate(table["大寒"] || table.DA_HAN || table["Dahan"] || table["daHan"]);
  }

  function getYunqiEffectiveYear(birth) {
    var dahan = getDaHanDate(birth.year, birth.useExactCalendar);
    if (!dahan) return { year: birth.year, boundary: "近似按公历年处理，未接入精确大寒节气表", exact: false };
    var beforeDahan = birth.month < dahan.month || (birth.month === dahan.month && birth.day < dahan.day);
    return {
      year: beforeDahan ? birth.year - 1 : birth.year,
      boundary: "大寒定年：" + birth.year + "年大寒为" + dahan.month + "月" + dahan.day + "日，当前使用" + (beforeDahan ? birth.year - 1 : birth.year) + "年运气。",
      exact: true,
      dahan: dahan
    };
  }

  var MEIHUA_TRIGRAMS = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
  var MEIHUA_NATURE = {
    "乾": { symbol: "☰", nature: "天", element: "金", lines: [false, false, false] },
    "兑": { symbol: "☱", nature: "泽", element: "金", lines: [true, false, false] },
    "离": { symbol: "☲", nature: "火", element: "火", lines: [false, true, false] },
    "震": { symbol: "☳", nature: "雷", element: "木", lines: [true, true, false] },
    "巽": { symbol: "☴", nature: "风", element: "木", lines: [false, false, true] },
    "坎": { symbol: "☵", nature: "水", element: "水", lines: [true, false, true] },
    "艮": { symbol: "☶", nature: "山", element: "土", lines: [false, true, true] },
    "坤": { symbol: "☷", nature: "地", element: "土", lines: [true, true, true] }
  };
  var MEIHUA_ELEMENT_GENERATES = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  var MEIHUA_ELEMENT_CONTROLS = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

  function modOne(value, base) {
    var n = Number(value) || 0;
    var r = n % base;
    return r === 0 ? base : r;
  }

  function meihuaTrigramInfo(name) {
    var info = MEIHUA_NATURE[name] || MEIHUA_NATURE["乾"];
    return { name: name || "乾", symbol: info.symbol, nature: info.nature, element: info.element };
  }

  function trigramFromLines(lines) {
    var key = (lines || []).map(function (yin) { return yin ? "1" : "0"; }).join("");
    for (var name in MEIHUA_NATURE) {
      if (MEIHUA_NATURE[name].lines.map(function (yin) { return yin ? "1" : "0"; }).join("") === key) return name;
    }
    return "乾";
  }

  function changedTrigramName(name, localLineFromBottom) {
    var info = MEIHUA_NATURE[name] || MEIHUA_NATURE["乾"];
    var lines = info.lines.slice();
    var indexFromTop = 3 - localLineFromBottom;
    lines[indexFromTop] = !lines[indexFromTop];
    return trigramFromLines(lines);
  }

  function getMeihuaDateNumbers(birth) {
    if (birth.useExactCalendar !== false && hasLunarJavascript()) {
      try {
        var solar = window.Solar.fromYmdHms ? window.Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0) : window.Solar.fromYmd(birth.year, birth.month, birth.day);
        var lunar = solar && typeof solar.getLunar === "function" ? solar.getLunar() : null;
        if (lunar) {
          var lunarYear = Number(callFirst(lunar, ["getYear", "year"])) || birth.year;
          var lunarMonth = Math.abs(Number(callFirst(lunar, ["getMonth", "month"]))) || birth.month;
          var lunarDay = Number(callFirst(lunar, ["getDay", "day"])) || birth.day;
          var timeZhi = String(callFirst(lunar, ["getTimeZhi", "timeZhi"]) || "");
          var timeIndex = DZ.indexOf(timeZhi) + 1;
          return {
            year: lunarYear,
            month: lunarMonth,
            day: lunarDay,
            hourNumber: timeIndex > 0 ? timeIndex : modOne(Math.floor((birth.hour + 1) / 2) + 1, 12),
            source: "lunar-javascript 农历年月日与时支"
          };
        }
      } catch (e) {
        console.warn("meihua lunar fallback:", e.message || e);
      }
    }
    return {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hourNumber: modOne(Math.floor((birth.hour + 1) / 2) + 1, 12),
      source: "公历年月日与本地时辰序数"
    };
  }

  function getBodyUseRelation(bodyName, useName) {
    var bodyElement = (MEIHUA_NATURE[bodyName] || {}).element;
    var useElement = (MEIHUA_NATURE[useName] || {}).element;
    if (!bodyElement || !useElement) return "";
    if (bodyElement === useElement) return "比和";
    if (MEIHUA_ELEMENT_GENERATES[useElement] === bodyElement) return "用生体";
    if (MEIHUA_ELEMENT_GENERATES[bodyElement] === useElement) return "体生用";
    if (MEIHUA_ELEMENT_CONTROLS[useElement] === bodyElement) return "用克体";
    if (MEIHUA_ELEMENT_CONTROLS[bodyElement] === useElement) return "体克用";
    return "";
  }

  function calculateLocalMeihua(input) {
    var birth = normalizeBirth(input);
    var method = (input && input.method) || "time";
    var numbers;
    var sourceLabel;

    if (method === "number" && input && input.numberA != null && input.numberB != null) {
      // 数字起卦：上卦 = numberA % 8, 下卦 = (numberA + numberB) % 8, 动爻 = (numberA + numberB) % 6
      var na = Math.abs(Number(input.numberA) || 0);
      var nb = Math.abs(Number(input.numberB) || 0);
      numbers = { year: na, month: nb, day: 0, hourNumber: 0, source: "数字起卦：上卦=" + na + "%8, 下卦=(" + na + "+" + nb + ")%8, 动爻=(" + na + "+" + nb + ")%6" };
      var upperIndex = modOne(na, 8);
      var lowerIndex = modOne(na + nb, 8);
      var movingLine = modOne(na + nb, 6);
      sourceLabel = "数字起卦";
      return buildMeihuaResult(upperIndex, lowerIndex, movingLine, birth, sourceLabel, numbers);
    }

    // 时间起卦
    numbers = getMeihuaDateNumbers(birth);
    var upperIdx = modOne(numbers.year + numbers.month + numbers.day, 8);
    var lowerIdx = modOne(numbers.year + numbers.month + numbers.day + numbers.hourNumber, 8);
    var moveLine = modOne(numbers.year + numbers.month + numbers.day + numbers.hourNumber, 6);
    sourceLabel = numbers.source;
    return buildMeihuaResult(upperIdx, lowerIdx, moveLine, birth, sourceLabel, numbers);
  }

  function buildMeihuaResult(upperIndex, lowerIndex, movingLine, birth, sourceLabel, numbers) {
    var upper = MEIHUA_TRIGRAMS[upperIndex - 1];
    var lower = MEIHUA_TRIGRAMS[lowerIndex - 1];
    var upperLines = MEIHUA_NATURE[upper].lines;
    var lowerLines = MEIHUA_NATURE[lower].lines;
    var bottomLines = lowerLines.slice().reverse().concat(upperLines.slice().reverse());
    var mutualLower = trigramFromLines([bottomLines[3], bottomLines[2], bottomLines[1]]);
    var mutualUpper = trigramFromLines([bottomLines[4], bottomLines[3], bottomLines[2]]);
    var changedUpper = upper;
    var changedLower = lower;
    if (movingLine <= 3) changedLower = changedTrigramName(lower, movingLine);
    else changedUpper = changedTrigramName(upper, movingLine - 3);
    var bodyTrigram = movingLine <= 3 ? upper : lower;
    var useTrigram = movingLine <= 3 ? lower : upper;
    var hexagramName = MEIHUA_NATURE[upper].nature + MEIHUA_NATURE[lower].nature;
    var changedHexagramName = MEIHUA_NATURE[changedUpper].nature + MEIHUA_NATURE[changedLower].nature;
    return {
      upperTrigram: meihuaTrigramInfo(upper),
      lowerTrigram: meihuaTrigramInfo(lower),
      changingLine: movingLine,
      mutualUpper: meihuaTrigramInfo(mutualUpper),
      mutualLower: meihuaTrigramInfo(mutualLower),
      bodyTrigram: bodyTrigram,
      useTrigram: useTrigram,
      bodyUseRelation: getBodyUseRelation(bodyTrigram, useTrigram),
      hexagramName: hexagramName,
      changingHexagramName: changedHexagramName,
      sourceMethod: sourceLabel,
      numbers: numbers,
      engineName: "LocalMeihuaTimeAdapter",
      mode: birth.useExactCalendar !== false && hasLunarJavascript() ? "local-exact" : "local",
      confidenceNote: "本地时间起卦：按年月日时取数定上下卦与动爻，并计算互卦、变卦、体用生克；不同流派可能采用不同取数口径。"
    };
  }
  function generateDemoDivination(input) {
    var birth = normalizeBirth(input);
    var seed = input && input.seed != null ? input.seed : birth.year * 10000 + birth.month * 100 + birth.day + birth.hour;
    var rng = seededRand(seed);
    var lines = [];
    var branchCycle = ["子", "寅", "辰", "午", "申", "戌"];
    var relationCycle = ["父母", "兄弟", "官鬼", "妻财", "子孙"];
    var godCycle = ["青龙", "朱雀", "勾陈", "滕蛇", "白虎", "玄武"];
    var trigrams = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];

    for (var i = 0; i < 6; i++) {
      var bi = Math.floor(rng() * branchCycle.length);
      lines.push({
        yin: rng() > 0.5,
        changing: rng() < 0.2,
        branch: branchCycle[bi],
        relation: relationCycle[i % relationCycle.length],
        god: godCycle[i]
      });
    }

    var upper = Math.floor(rng() * 8);
    var lower = Math.floor(rng() * 8);
    var moving = Math.floor(rng() * 6) + 1;

    return {
      liuyao: {
        lines: lines,
        hexagramName: trigrams[upper] + trigrams[lower],
        isOriginal: true,
        yongShen: relationCycle[Math.abs(seed) % relationCycle.length],
        shiYao: Math.floor(rng() * 6) + 1,
        yingYao: Math.floor(rng() * 6) + 1,
        engineName: "DemoLiuyaoAdapter",
        mode: "demo"
      },
      meihua: {
        upperTrigram: { name: trigrams[upper] },
        lowerTrigram: { name: trigrams[lower] },
        changingLine: moving,
        bodyTrigram: trigrams[lower],
        useTrigram: trigrams[upper],
        engineName: "DemoMeihuaAdapter",
        mode: "demo"
      }
    };
  }

  function generateDemoZiwei(input) {
    var birth = normalizeBirth(input);
    var mingGua = input && input.mingGua ? input.mingGua : { trigram: "?", group: "?" };
    var rng = seededRand(buildSeed(birth));
    var palaceNames = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];
    var stars = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
    var positions = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
    var brightness = ["庙", "旺", "得", "利", "平", "陷"];
    var palaces = {};

    palaceNames.forEach(function (name, i) {
      var n = Math.floor(rng() * 3) + 1;
      var pStars = [];
      for (var j = 0; j < n; j++) pStars.push(stars[Math.floor(rng() * stars.length)]);
      palaces[name] = {
        stars: Array.from(new Set(pStars)),
        position: positions[(i + birth.month - 1) % 12],
        miaoxian: brightness[Math.floor(rng() * brightness.length)]
      };
    });

    return {
      birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
      mingGua: mingGua,
      palaces: palaces,
      sihua: { "廉贞": "禄", "破军": "权", "武曲": "科", "太阳": "忌" },
      mainStars: stars,
      engineName: "DemoZiweiAdapter",
      mode: "demo"
    };
  }

  // ═══════ iztro 辅助函数 ═══════

  /**
   * iztro palace 名称映射 (英文 -> 中文)
   */
  var IZTRO_PALACE_MAP = {
    "soulPalace": "命宫",
    "parentsPalace": "父母",
    "spiritPalace": "福德",
    "propertyPalace": "田宅",
    "careerPalace": "官禄",
    "friendsPalace": "交友",
    "surfacePalace": "迁移",
    "healthPalace": "疾厄",
    "wealthPalace": "财帛",
    "childrenPalace": "子女",
    "spousePalace": "夫妻",
    "siblingsPalace": "兄弟"
  };

  /**
   * 将 iztro 的 palaces 数组转换为本项目渲染器需要的格式
   */
  function transformIztroPalaces(iztroPalaces) {
    var result = {};
    if (!Array.isArray(iztroPalaces)) return result;
    
    var branches = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
    var brIdx = 0;

    iztroPalaces.forEach(function (p) {
      if (!p) return;
      var pName = IZTRO_PALACE_MAP[p.name];
      if (!pName) return;
      
      var majorStars = [];
      var minorStars = [];
      var brightness = "";

      if (p.majorStars && Array.isArray(p.majorStars)) {
        p.majorStars.forEach(function (s) {
          if (s && s.name) {
            majorStars.push(s.name);
            if (s.brightness && !brightness) brightness = s.brightness;
          }
        });
      }
      if (p.minorStars && Array.isArray(p.minorStars)) {
        p.minorStars.forEach(function (s) {
          if (s && s.name && s.type === "helpful") {
            minorStars.push(s.name);
          }
        });
      }
      
      // 地支序数映射：命宫由月数起始，iztro 按 civil 定位
      var branchIndex = p.earthlyBranch ? branches.indexOf(p.earthlyBranch.substring(0, 1)) : brIdx % 12;
      if (branchIndex < 0) branchIndex = brIdx % 12;
      var branch = branches[branchIndex] || branches[brIdx % 12];

      result[pName] = {
        stars: majorStars.concat(minorStars),
        position: branch,
        miaoxian: brightness || "平",
        earthlyBranch: p.earthlyBranch || ""
      };
      brIdx++;
    });
    
    return result;
  }

  /**
   * 从 iztro 的 huaSihua 数据提取四化映射 { 星名: 禄/权/科/忌 }
   */
  function transformIztroSihua(hua) {
    var result = {};
    if (!hua || typeof hua !== "object") return result;
    
    var starMap = { "lu": "禄", "quan": "权", "ke": "科", "ji": "忌" };
    if (hua.jia) { result[getStarName("甲")] = starMap[hua.jia]; }
    if (hua.yi) { result[getStarName("乙")] = starMap[hua.yi]; }
    if (hua.bing) { result[getStarName("丙")] = starMap[hua.bing]; }
    if (hua.ding) { result[getStarName("丁")] = starMap[hua.ding]; }
    if (hua.wu) { result[getStarName("戊")] = starMap[hua.wu]; }
    if (hua.ji) { result[getStarName("己")] = starMap[hua.ji]; }
    if (hua.geng) { result[getStarName("庚")] = starMap[hua.geng]; }
    if (hua.xin) { result[getStarName("辛")] = starMap[hua.xin]; }
    if (hua.ren) { result[getStarName("壬")] = starMap[hua.ren]; }
    if (hua.gui) { result[getStarName("癸")] = starMap[hua.gui]; }
    
    return result;
  }

  /**
   * 天干对应的星名（四化）
   */
  function getStarName(stem) {
    var map = {
      "甲": "廉贞", "乙": "破军", "丙": "武曲", "丁": "太阳",
      "戊": "天同", "己": "廉贞", "庚": "天府", "辛": "太阴", "壬": "武曲",
      "癸": "贪狼"
    };
    return map[stem] || "";
  }

  /**
   * 提取所有主要星曜列表
   */
  function extractMainStars(iztroPalaces) {
    var stars = [];
    if (!Array.isArray(iztroPalaces)) return stars;
    iztroPalaces.forEach(function (p) {
      if (p && p.majorStars && Array.isArray(p.majorStars)) {
        p.majorStars.forEach(function (s) {
          if (s && s.name && stars.indexOf(s.name) < 0) {
            stars.push(s.name);
          }
        });
      }
    });
    return stars;
  }

  function validateAdapter(name, adapter) {
    var missing = REQUIRED_FIELDS.filter(function (field) {
      return adapter[field] === undefined || adapter[field] === null;
    });
    if (missing.length) throw new Error("Adapter " + name + " 缺少字段: " + missing.join(", "));
    if (typeof adapter.calculate !== "function") throw new Error("Adapter " + name + " calculate 不是函数");
    if (typeof adapter.toRenderData !== "function") throw new Error("Adapter " + name + " toRenderData 不是函数");
  }

  function register(name, adapter) {
    validateAdapter(name, adapter);
    adapters[name] = Object.assign({ id: name }, adapter);
    return adapters[name];
  }

  function get(name) {
    return adapters[name] || null;
  }

  function getAll() {
    var result = {};
    Object.keys(adapters).forEach(function (name) {
      result[name] = Object.assign({}, adapters[name]);
    });
    return result;
  }

  function list() {
    return Object.keys(adapters).map(function (name) {
      var a = adapters[name];
      return {
        id: name,
        engineName: a.engineName,
        mode: a.mode,
        version: a.version,
        sourceProject: a.sourceProject,
        license: a.license,
        confidenceNote: a.confidenceNote
      };
    });
  }

  function calculate(name, input) {
    var adapter = get(name);
    if (!adapter) throw new Error("未注册引擎 Adapter: " + name);
    return adapter.calculate(input || {});
  }

  function toRenderData(name, result, input) {
    var adapter = get(name);
    if (!adapter) throw new Error("未注册引擎 Adapter: " + name);
    return adapter.toRenderData(result, input || {});
  }

  /**
   * 调用 Adapter 的可选 toReading() 方法，返回结构化阅读摘要。
   * 若 Adapter 未实现 toReading()，返回 null。
   *
   * @param {string} name - adapter 名称
   * @param {object} result - calculate() 返回的结果
   * @param {object} input - 原始输入
   * @returns {{title:string, summary:string, tags:string[], sections:Array, sourceNotes:string}|null}
   */
  function toReading(name, result, input) {
    var adapter = get(name);
    if (!adapter || typeof adapter.toReading !== "function") return null;
    return adapter.toReading(result, input || {});
  }

  /**
   * 列出所有 Adapter 的能力摘要（含是否支持 toReading）。
   */
  function listWithReading() {
    return Object.keys(adapters).map(function (name) {
      var a = adapters[name];
      return {
        id: name,
        engineName: a.engineName,
        mode: a.mode,
        version: a.version,
        sourceProject: a.sourceProject,
        license: a.license,
        confidenceNote: a.confidenceNote,
        hasToReading: typeof a.toReading === "function"
      };
    });
  }

  register("bazi", {
    engineName: "BaziEngine / optional BaziLunarAdapter",
    mode: "local-approx",
    version: ADAPTER_VERSION,
    inputSchema: { year: "number", month: "number", day: "number", hour: "number", gender: "男|女", isLunar: "boolean" },
    sourceProject: "local:visual/js/engines/bazi-engine.js; optional: 6tail/lunar-javascript",
    license: "project-local; optional MIT",
    confidenceNote: "默认使用本地近似八字引擎；若页面已加载 lunar-javascript，则自动读取精确节气干支。",
    calculate: function (input) {
      var exact = calculateBaziWithLunarJavascript(input);
      if (exact) return exact;
      if (!window.BaziEngine || typeof window.BaziEngine.calculate !== "function") throw new Error("BaziEngine 不可用");
      return window.BaziEngine.calculate(normalizeBirth(input));
    },
    toRenderData: function (result) {
      if (!window.BaziEngine || typeof window.BaziEngine.getRenderData !== "function") throw new Error("BaziEngine.getRenderData 不可用");
      return window.BaziEngine.getRenderData(result);
    },
    toReading: function (result, input) {
      var birth = normalizeBirth(input);
      var p = result.pillars || {};
      var pillarsStr = [p.year, p.month, p.day, p.hour].filter(Boolean).map(function (col) {
        return col.stem + col.branch;
      }).join(" ");
      var dm = result.dayMaster || "?";
      var dmWx = result.dayMasterWuxing || "?";
      var dmYy = result.dayMasterYinYang || "?";
      var els = result.elements || {};
      var elSummary = Object.keys(els).map(function (k) { return k + ":" + els[k]; }).join(" ");
      var maxEl = ""; var maxVal = -1;
      Object.keys(els).forEach(function (k) { if (els[k] > maxVal) { maxVal = els[k]; maxEl = k; } });
      var minEl = ""; var minVal = Infinity;
      Object.keys(els).forEach(function (k) { if (els[k] < minVal) { minVal = els[k]; minEl = k; } });
      var isStrong = maxVal >= 8;
      return {
        title: "八字命盘 · " + dm + "(" + dmWx + ")",
        summary: "四柱：" + pillarsStr + "。日主" + dm + dmYy + dmWx + "，五行 " + elSummary + "，偏旺" + maxEl + "、偏弱" + minEl + "，整体" + (isStrong ? "偏强" : "偏弱") + "。",
        tags: ["八字", dmWx + "命", dmYy + "干", isStrong ? "身强" : "身弱", result.mode === "local-exact" ? "精确历法" : "近似历法"],
        sections: [
          { heading: "四柱", body: "年柱 " + (p.year ? p.year.stem + p.year.branch : "-") + "、月柱 " + (p.month ? p.month.stem + p.month.branch : "-") + "、日柱 " + (p.day ? p.day.stem + p.day.branch : "-") + "、时柱 " + (p.hour ? p.hour.stem + p.hour.branch : "-") + "。" },
          { heading: "五行分布", body: elSummary + "。最旺：" + maxEl + "(" + maxVal + ")，最弱：" + minEl + "(" + minVal + ")。" },
          { heading: "十神", body: Object.keys(result.shishenList || {}).map(function (k) { return k + "柱" + result.shishenList[k]; }).join("、") + "。" },
          { heading: "日主强弱", body: "日主" + dm + "为" + dmYy + dmWx + "，五行总量" + (Object.keys(els).reduce(function (s, k) { return s + els[k]; }, 0)) + "，判断为" + (isStrong ? "偏强" : "偏弱") + "。此判断基于五行计数近似，仅供参考。" }
        ],
        sourceNotes: result.confidenceNote || "本地近似八字引擎"
      };
    }
  });

  register("yunqi", {
    engineName: "YunqiEngine / optional LunarBoundaryAdapter",
    mode: "local-approx",
    version: ADAPTER_VERSION,
    inputSchema: { year: "number", month: "number", day: "number" },
    sourceProject: "local:visual/js/engines/yunqi-engine.js; optional: 6tail/lunar-javascript",
    license: "project-local; optional MIT",
    confidenceNote: "默认按公历年份近似推算；若页面已加载 lunar-javascript，则按大寒边界修正运气年份。",
    calculate: function (input) {
      if (!window.YunqiEngine || typeof window.YunqiEngine.calculate !== "function") throw new Error("YunqiEngine 不可用");
      var birth = typeof input === "number" ? { year: input, month: 6, day: 15, hour: 12 } : normalizeBirth(input);
      var boundary = getYunqiEffectiveYear(birth);
      var result = window.YunqiEngine.calculate(boundary.year);
      result.queryDate = { year: birth.year, month: birth.month, day: birth.day };
      result.effectiveYear = boundary.year;
      result.yearBoundary = boundary.boundary;
      if (boundary.exact) {
        result.engineName = "YunqiLunarBoundaryAdapter";
        result.mode = "local-exact";
        result.confidenceNote = "已通过 lunar-javascript/Solar 全局对象修正大寒定年；五运六气规则仍由本地表推算。";
        result.dahan = boundary.dahan;
      }
      return result;
    },
    toRenderData: function (result) { return result; },
    toReading: function (result, input) {
      var y = result.effectiveYear || result.year || "?";
      var tg = result.tiangan || "?";
      var dz = result.dizhi || "?";
      var dayun = result.dayun || "?";
      var sitian = result.sitian || "?";
      var zaiquan = result.zaiquan || "?";
      var tendency = result.disease_tendency || "";
      var tags = ["五运六气", tg + dz + "年", dayun, sitian];
      if (result.mode === "local-exact") tags.push("精确历法");
      return {
        title: "五运六气 · " + y + "年(" + tg + dz + ")",
        summary: y + "年(" + tg + dz + ")岁运" + dayun + "，司天" + sitian + "，在泉" + zaiquan + "。疾病倾向：" + tendency + "。",
        tags: tags,
        sections: [
          { heading: "岁运", body: tg + "年岁运为" + dayun + "，主全年气候与体质基本倾向。" },
          { heading: "司天在泉", body: "司天" + sitian + "主上半年气候，在泉" + zaiquan + "主下半年气候。" },
          { heading: "疾病倾向", body: tendency + "。以上为运气推算的文化参考，不作为诊疗建议。" },
          { heading: "年份边界", body: result.yearBoundary || ("按公历" + y + "年处理") }
        ],
        sourceNotes: result.confidenceNote || "本地五运六气推算"
      };
    }
  });

  register("ziwei", {
    engineName: "ZiweiIztroAdapter / fallback DemoZiweiAdapter",
    mode: "local-exact",
    version: ADAPTER_VERSION,
    inputSchema: { birth: "year/month/day/hour/gender", mingGua: "object" },
    sourceProject: "SylarLong/iztro@2.5.8 (MIT)",
    license: "MIT",
    confidenceNote: "紫微斗数排盘采用 SylarLong/iztro (v2.5.8) 引擎；紫微流派存在差异，采用 iztro 默认配置。未加载 iztro 时回退演示数据。",
    calculate: function (input) {
      var birth = normalizeBirth(input);
      // 尝试使用 iztro
      if (typeof window.iztro === "object" && window.iztro.astro && typeof window.iztro.astro.bySolar === "function") {
        try {
          // hour -> timeIndex: 0=早子时(23-1), 1=丑时(1-3), 2=寅时(3-5), 3=卯时(5-7), 4=辰时(7-9), 5=巳时(9-11), 6=午时(11-13), 7=未时(13-15), 8=申时(15-17), 9=酉时(17-19), 10=戌时(19-21), 11=亥时(21-23), 12=晚子时(23-1)
          var timeIndex = Math.floor((birth.hour + 1) / 2);
          if (timeIndex === 12) timeIndex = 0; // 23:00-23:59 映射到早子时
          var genderKey = birth.gender === "男" ? "男" : "女";
          var solarDateStr = birth.year + "-" + birth.month + "-" + birth.day;
          var chart = window.iztro.astro.bySolar(solarDateStr, timeIndex, genderKey);
          if (chart && chart.palaces && Array.isArray(chart.palaces)) {
            return {
              engineName: "ZiweiIztroAdapter",
              mode: "local-exact",
              version: "iztro@2.5.8",
              birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
              mingGua: input && input.mingGua ? input.mingGua : { trigram: "?", group: "?" },
              palaces: transformIztroPalaces(chart.palaces),
              sihua: transformIztroSihua(chart.sihua || {}),
              mainStars: extractMainStars(chart.palaces),
              chart: chart
            };
          }
        } catch (e) {
          console.warn("iztro calculate failed, falling back to demo:", e.message || e);
        }
      }
      // 回退到演示数据
      return generateDemoZiwei(input);
    },
    toRenderData: function (result) { return clone(result); }
  });

  register("liuyao", {
    engineName: "DemoLiuyaoAdapter",
    mode: "demo",
    version: ADAPTER_VERSION,
    inputSchema: { birth: "year/month/day/hour/gender", question: "optional", method: "optional" },
    sourceProject: "local-demo; reference: bopo/najia",
    license: "project-local-demo",
    confidenceNote: "当前 Dashboard 为六爻演示数据；真实纳甲起卦需后续 Adapter 接入。",
    calculate: function (input) { return generateDemoDivination(input).liuyao; },
    toRenderData: function (result) { return clone(result); }
  });

  register("meihua", {
    engineName: "LocalMeihuaTimeAdapter",
    mode: "local",
    version: ADAPTER_VERSION,
    inputSchema: { birth: "year/month/day/hour/gender/useExactCalendar", method: "time|number", numberA: "number (method=number)", numberB: "number (method=number)" },
    sourceProject: "local:visual/js/engine-adapters.js",
    license: "project-local",
    confidenceNote: "本地时间起卦：按年月日时取数定上下卦与动爻，并计算互卦、变卦、体用生克；不同流派可能采用不同取数口径。",
    calculate: calculateLocalMeihua,
    toRenderData: function (result) { return clone(result); },
    toReading: function (result, input) {
      var upper = result.upperTrigram || {};
      var lower = result.lowerTrigram || {};
      var bodyName = result.bodyTrigram || "?";
      var useName = result.useTrigram || "?";
      var relation = result.bodyUseRelation || "-";
      var hexName = result.hexagramName || "?";
      var changedHex = result.changingHexagramName || "?";
      var moveLine = result.changingLine || 0;
      var method = result.sourceMethod || "时间起卦";
      var tags = ["梅花易数", hexName, "动爻" + moveLine, relation];
      if (method.indexOf("数字") >= 0) tags.push("数字起卦");
      else tags.push("时间起卦");
      return {
        title: "梅花易数 · " + hexName + " → " + changedHex,
        summary: "上卦" + (upper.name || "?") + "(" + (upper.nature || "?") + ")、下卦" + (lower.name || "?") + "(" + (lower.nature || "?") + ")，" + moveLine + "爻动。体卦" + bodyName + "、用卦" + useName + "，体用关系" + relation + "。",
        tags: tags,
        sections: [
          { heading: "本卦", body: "上卦" + (upper.name || "?") + " ☇" + (upper.symbol || "?") + " (" + (upper.element || "?") + ")，下卦" + (lower.name || "?") + " ☇" + (lower.symbol || "?") + " (" + (lower.element || "?") + ")，成卦" + hexName + "。" },
          { heading: "动爻与变卦", body: moveLine + "爻动，变卦为" + changedHex + "。动爻在上卦则下卦为体、上卦为用；动爻在下卦则上卦为体、下卦为用。" },
          { heading: "体用生克", body: "体卦" + bodyName + "，用卦" + useName + "，关系" + relation + "。体生用主耗、用生体主进、体克用主得、用克体主失、比和主顺。" },
          { heading: "互卦", body: "互上卦" + ((result.mutualUpper || {}).name || "?") + "，互下卦" + ((result.mutualLower || {}).name || "?") + "，反映事物中间过程。" },
          { heading: "起卦方式", body: method + "。" + result.confidenceNote }
        ],
        sourceNotes: result.confidenceNote || "本地梅花易数时间起卦"
      };
    }
  });

  window.EngineAdapterRegistry = {
    version: ADAPTER_VERSION,
    requiredFields: REQUIRED_FIELDS.slice(),
    optionalMethods: OPTIONAL_METHODS.slice(),
    register: register,
    get: get,
    getAll: getAll,
    list: list,
    listWithReading: listWithReading,
    calculate: calculate,
    toRenderData: toRenderData,
    toReading: toReading,
    helpers: {
      normalizeBirth: normalizeBirth,
      generateDemoZiwei: generateDemoZiwei,
      generateDemoDivination: generateDemoDivination
    }
  };
})();