/**
 * bazi-engine.js — 纯 JS 八字排盘引擎
 * 无外部依赖，基于天文算法计算四柱八字、十神、大运
 *
 * 使用: BaziEngine.calculate({year, month, day, hour, gender, isLunar})
 * 返回: { pillars, dayMaster, hiddenStems, shishen, elements, luck }
 *
 * 月柱使用节气近似（不精确到太阳精确时刻），足够用于可视化展示
 */
(function () {
  "use strict";

  const TG = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const DZ = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const STEM_WX = ["木","木","火","火","土","土","金","金","水","水"];
  const BRANCH_WX = ["水","土","木","木","土","火","火","土","金","金","土","水"];
  const STEM_YY = ["阳","阴","阳","阴","阳","阴","阳","阴","阳","阴"];

  // 地支藏干表
  const HIDDEN = {
    "子":["癸"],"丑":["己","癸","辛"],"寅":["甲","丙","戊"],
    "卯":["乙"],"辰":["戊","乙","癸"],"巳":["丙","庚","戊"],
    "午":["丁","己"],"未":["己","丁","乙"],"申":["庚","壬","戊"],
    "酉":["辛"],"戌":["戊","辛","丁"],"亥":["壬","甲"]
  };

  // 十神: [日干索引, 其他干索引] → 十神名
  function getShiShen(dayStem, otherStem) {
    const d = dayStem, o = otherStem;
    let diff = (o - d + 10) % 10;
    const same = (d % 2 === 0) === (o % 2 === 0);
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

  // 节气日近似表: [月, 日] — 超过此日进入下一节气月
  const SOLAR_TERMS = [
    { m: 2, d: 4 }, { m: 3, d: 6 }, { m: 4, d: 5 },
    { m: 5, d: 6 }, { m: 6, d: 6 }, { m: 7, d: 7 },
    { m: 8, d: 7 }, { m: 9, d: 8 }, { m: 10, d: 8 },
    { m: 11, d: 7 }, { m: 12, d: 7 }, { m: 1, d: 6 }
  ];
  function getMonthIndex(year, month, day) {
    let idx = 0;
    for (let i = 0; i < SOLAR_TERMS.length; i++) {
      const t = SOLAR_TERMS[i];
      if (month > t.m || (month === t.m && day >= t.d)) idx = i + 1;
    }
    return idx >= 12 ? 0 : idx; // 0=寅月
  }

  // 四柱
  function calcPillars(year, month, day, hour, isLunar, gender) {
    // 年柱 (立春前用上年)
    let yStem = (year - 4) % 10;
    let yBranch = (year - 4) % 12;
    if (month < 2 || (month === 2 && day < 4)) {
      yStem = (year - 5) % 10;
      yBranch = (year - 5) % 12;
    }
    if (yStem < 0) yStem += 10;
    if (yBranch < 0) yBranch += 12;

    // 月柱
    const monthIdx = getMonthIndex(year, month, day);
    let mStem = (yStem * 2 + monthIdx + 2) % 10;
    if (mStem < 0) mStem += 10;
    let mBranch = (monthIdx + 2) % 12;

    // 日柱 (公历, 1900-01-01 = 甲子索引35 = 己亥)
    const ref = new Date(1900, 0, 1);
    const tgt = new Date(year, month - 1, day);
    const days = Math.round((tgt - ref) / 86400000);
    let sexa = (35 + days) % 60;
    if (sexa < 0) sexa += 60;
    let dStem = sexa % 10;
    let dBranch = sexa % 12;

    // 时柱
    let hBranch = Math.floor((hour + 1) / 2) % 12;
    let hStem = (dStem * 2 + hBranch) % 10;
    if (hStem < 0) hStem += 10;

    // 子时 23:00+ 日柱用次日
    if (hour >= 23) {
      const nextDay = (sexa + 1) % 60;
      dStem = nextDay % 10;
      dBranch = nextDay % 12;
      hStem = (dStem * 2 + 0) % 10;
    }

    return {
      year:  { stem: TG[yStem], branch: DZ[yBranch], stemIndex: yStem, branchIndex: yBranch },
      month: { stem: TG[mStem], branch: DZ[mBranch], stemIndex: mStem, branchIndex: mBranch },
      day:   { stem: TG[dStem], branch: DZ[dBranch], stemIndex: dStem, branchIndex: dBranch },
      hour:  { stem: TG[hStem], branch: DZ[hBranch], stemIndex: hStem, branchIndex: hBranch }
    };
  }

  // 五行统计: 茎权重2 + 支权重2 + 藏干权重1
  function calcElements(pillars) {
    const c = { "木":0, "火":0, "土":0, "金":0, "水":0 };
    ["year","month","day","hour"].forEach(function(k) {
      const p = pillars[k];
      c[STEM_WX[p.stemIndex]] += 2;
      c[BRANCH_WX[p.branchIndex]] += 2;
      (HIDDEN[p.branch] || []).forEach(function(h) {
        const hi = TG.indexOf(h);
        if (hi >= 0) c[STEM_WX[hi]] += 1;
      });
    });
    return c;
  }

  // 大运
  function calcLuck(pillars, gender) {
    const yStem = pillars.year.stemIndex;
    const mStem = pillars.month.stemIndex;
    const mBranch = pillars.month.branchIndex;
    const yYang = yStem % 2 === 0;
    const isMale = gender === "男";
    const forward = (yYang && isMale) || (!yYang && !isMale);
    const luck = [];
    // 简化: 3岁起运
    for (let i = 0; i < 8; i++) {
      const age = 3 + i * 10;
      let ls = forward ? (mStem + i + 1) % 10 : (mStem - i - 1 + 10) % 10;
      let lb = forward ? (mBranch + i + 1) % 12 : (mBranch - i - 1 + 12) % 12;
      luck.push({
        ageStart: age,
        stem: TG[ls], branch: DZ[lb],
        stemWuxing: STEM_WX[ls]
      });
    }
    return luck;
  }

  // ===== 公开 API =====
  window.BaziEngine = {
    /**
     * 计算完整八字
     * @param {Object} opts  { year, month, day, hour, gender, isLunar }
     * @returns {Object} 八字含 pillars, dayMaster, hiddenStems, shishen, elements, luck
     */
    calculate: function(opts) {
      const y = opts.year, m = opts.month, d = opts.day, h = opts.hour;
      const gender = opts.gender || "男";
      const pillars = calcPillars(y, m, d, h, !!opts.isLunar, gender);
      const dm = pillars.day.stemIndex;
      const hiddenStems = {};
      ["year","month","day","hour"].forEach(function(k) {
        hiddenStems[k] = HIDDEN[pillars[k].branch] || [];
      });
      const shishenList = {};
      ["year","month","day","hour"].forEach(function(k) {
        shishenList[k] = getShiShen(dm, pillars[k].stemIndex);
      });
      const shishen = {};
      ["year","month","day","hour"].forEach(function(k) {
        const hd = HIDDEN[pillars[k].branch];
        const mainH = (hd && hd.length > 0) ? TG.indexOf(hd[0]) : -1;
        shishen[k] = {
          stem: shishenList[k],
          branch: mainH >= 0 ? getShiShen(dm, mainH) : ""
        };
      });
      return {
        engineName: "BaziEngine",
        mode: "local-approx",
        confidenceNote: "纯 JS 本地快速排盘；月柱使用近似节气，起运按 3 岁简化，适合可视化与学习参考。",
        pillars: pillars,
        dayMaster: pillars.day.stem,
        dayMasterWuxing: STEM_WX[dm],
        dayMasterYinYang: STEM_YY[dm],
        gender: gender,
        hiddenStems: hiddenStems,
        shishen: shishen,
        shishenList: shishenList,
        elements: calcElements(pillars),
        luck: calcLuck(pillars, gender)
      };
    },

    /** 转为兼容 bazi.js render 的格式 */
    getRenderData: function(baziResult) {
      const p = baziResult.pillars;
      const h = baziResult.hiddenStems;
      return {
        year:   { stem: p.year.stem,   branch: p.year.branch,   hidden: h.year },
        month:  { stem: p.month.stem,  branch: p.month.branch,  hidden: h.month },
        day:    { stem: p.day.stem,    branch: p.day.branch,    hidden: h.day },
        hour:   { stem: p.hour.stem,   branch: p.hour.branch,   hidden: h.hour },
        dayMaster: baziResult.dayMaster,
        gender: baziResult.gender
      };
    }
  };
})();
