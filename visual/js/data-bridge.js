/**
 * data-bridge.js — 全局数据桥接层
 *
 * 职责:
 * 1. FORTUNE 单例 — 全局共享数据存储，所有 tab 从此读取
 * 2. 全局输入面板 — 生辰+性别输入 + 更新按钮
 * 3. 引擎调度 — 输入变化时调用各引擎生成真实数据并分发到各 tab
 *
 * 加载顺序: 必须在 core.js / 各 viz 模块之后，在尾部 <script> 之前加载
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  // ═══════════════════════════════════════════════════════
  //  内置数据 (页面直接使用 CORE, BaziEngine, YunqiEngine)
  // ═══════════════════════════════════════════════════════

  const SELF = {};

  // ─── 默认生辰 ───
  const DEFAULT_BIRTH = {
    year: 1990, month: 6, day: 15, hour: 12, minute: 0,
    gender: "男", isLunar: false, useExactCalendar: true
  };

  // ─── 内部数据 ───
  let _birth = Object.assign({}, DEFAULT_BIRTH);
  let _data = null;       // 当前完整数据快照
  let _listeners = [];    // 数据变更回调

  function getEngineAdapter(name) {
    return window.EngineAdapterRegistry && EngineAdapterRegistry.get ? EngineAdapterRegistry.get(name) : null;
  }

  function calculateWithAdapter(name, input) {
    var adapter = getEngineAdapter(name);
    if (!adapter || typeof adapter.calculate !== "function") return null;
    try {
      return adapter.calculate(input || {});
    } catch (e) {
      console.warn(name + " adapter fallback:", e.message || e);
      return null;
    }
  }

  function renderDataWithAdapter(name, result, input) {
    var adapter = getEngineAdapter(name);
    if (!adapter || typeof adapter.toRenderData !== "function") return null;
    try {
      return adapter.toRenderData(result, input || {});
    } catch (e) {
      console.warn(name + " render adapter fallback:", e.message || e);
      return null;
    }
  }
  // ═══════════════════════════════════════════════════════
  //  核心引擎调度
  // ═══════════════════════════════════════════════════════

  /** 根据生辰计算所有数据 */
  function computeAll(birth) {
    const y = birth.year, m = birth.month, d = birth.day, h = birth.hour;

    // 1. 八字
    let baziData = calculateWithAdapter("bazi", {
      year: y, month: m, day: d, hour: h,
      gender: birth.gender, isLunar: birth.isLunar, useExactCalendar: birth.useExactCalendar !== false
    });
    let baziRender = baziData ? renderDataWithAdapter("bazi", baziData, birth) : null;
    if (!baziData || !baziRender) {
      // fallback: 仅计算年柱+日柱
      const yStem = (y - 4) % 10, yBranch = (y - 4) % 12;
      const ref = new Date(1900,0,1), tgt = new Date(y, m-1, d);
      const days = Math.round((tgt - ref)/86400000);
      const sexa = (35 + days) % 60;
      baziData = {
        pillars: {
          year:  { stem: "甲乙丙丁戊己庚辛壬癸"[yStem], branch: "子丑寅卯辰巳午未申酉戌亥"[yBranch] },
          month: { stem: "甲", branch: "寅" },
          day:   { stem: "甲乙丙丁戊己庚辛壬癸"[sexa%10], branch: "子丑寅卯辰巳午未申酉戌亥"[sexa%12] },
          hour:  { stem: "甲", branch: "子" }
        },
        dayMaster: "甲", elements: {木:0,火:0,土:0,金:0,水:0}, luck: [],
        engineName: "FallbackBazi", mode: "fallback-demo", confidenceNote: "BaziEngine 不可用时的最低限度 fallback。"
      };
      baziRender = {
        year: {stem:baziData.pillars.year.stem,branch:baziData.pillars.year.branch,hidden:[]},
        month:{stem:baziData.pillars.month.stem,branch:baziData.pillars.month.branch,hidden:[]},
        day:  {stem:baziData.pillars.day.stem,branch:baziData.pillars.day.branch,hidden:[]},
        hour: {stem:baziData.pillars.hour.stem,branch:baziData.pillars.hour.branch,hidden:[]},
        dayMaster: baziData.dayMaster, gender: birth.gender
      };
    }

    // 2. 五运六气
    let yunqiData = calculateWithAdapter("yunqi", birth);
    if (!yunqiData) {
      const tgIdx = (y - 4) % 10, dzIdx = (y - 4) % 12;
      yunqiData = {
        year: y,
        tiangan: "甲乙丙丁戊己庚辛壬癸"[(tgIdx+10)%10],
        dizhi: "子丑寅卯辰巳午未申酉戌亥"[(dzIdx+12)%12],
        wuyun: { dayun: "", zhuyun: ["木","火","土","金","水"], keyun: ["木","火","土","金","水"] },
        liuqi: {
          sitian: "少阴君火", zaiquan: "阳明燥金",
          zhuke: [
            {step:"初之气",qi:"厥阴风木",start:"大寒",end:"春分"},
            {step:"二之气",qi:"少阴君火",start:"春分",end:"小满"},
            {step:"三之气",qi:"太阴湿土",start:"小满",end:"大暑"},
            {step:"四之气",qi:"少阳相火",start:"大暑",end:"秋分"},
            {step:"五之气",qi:"阳明燥金",start:"秋分",end:"小雪"},
            {step:"六之气",qi:"太阳寒水",start:"小雪",end:"大寒"}
          ]
        },
        disease_tendency: "",
        engineName: "FallbackYunqi", mode: "fallback-demo", confidenceNote: "YunqiEngine 不可用时的最低限度 fallback。"
      };
    }

    // 3. 风水信息
    const mingGua = typeof CORE !== "undefined" && CORE.calcMingGua
      ? CORE.calcMingGua(y, birth.gender) : {trigram:"?",group:"?"};

    // 4. 体质 (根据八字五行生成合理模拟数据)
    const constitution = generateConstitution(baziData);

    // 5. 六爻 + 梅花 (Adapter 优先, 原演示生成兜底)
    const seed = y * 10000 + m * 100 + d + h;
    const divinationFallback = generateDivination(seed, birth);
    const divination = {
      liuyao: calculateWithAdapter("liuyao", { birth: birth, seed: seed }) || divinationFallback.liuyao,
      meihua: calculateWithAdapter("meihua", { birth: birth, seed: seed }) || divinationFallback.meihua
    };

    const ziweiData = calculateWithAdapter("ziwei", { birth: birth, mingGua: mingGua }) || generateZiweiDefault(birth, mingGua);

    // 6. 交叉引用 (跨标签页关联)
    const crossRef = computeCrossReferences(baziData, yunqiData, constitution, mingGua);

    return {
      meta: { source: "engine", computedAt: Date.now(), reportDataVersion: (window.CapabilityRegistry && CapabilityRegistry.version) || "0.1.0" },
      birth: {
        year: y, month: m, day: d, hour: h,
        gender: birth.gender, isLunar: birth.isLunar, useExactCalendar: birth.useExactCalendar !== false, useExactCalendar: birth.useExactCalendar !== false
      },
      bazi: baziData,
      baziRender: baziRender,
      yunqi: yunqiData,
      fengshui: {
        mingGua: mingGua,
        lifeTrigram: mingGua.trigram,
        mansion: mingGua.group
      },
      constitution: constitution,
      divination: divination,
      ziwei: ziweiData,
      crossRef: crossRef
    };
  }

  /** 计算跨标签页交叉引用 */
  function computeCrossReferences(baziData, yunqiData, constitution, mingGua) {
    var results = { hints: [], baziToConstitution: null, baziToFengshui: null, baziToYunqi: null };

    var dm = baziData.dayMaster || "";
    var dmWx = baziData.dayMasterWuxing || "";
    var els = baziData.elements || {};
    var total = (els.木||0) + (els.火||0) + (els.土||0) + (els.金||0) + (els.水||0) || 1;

    // ── 八字 → 体质 ──
    var wxPct = {木: els.木/total*100, 火: els.火/total*100, 土: els.土/total*100, 金: els.金/total*100, 水: els.水/total*100};
    var constitutionHints = [];
    if (wxPct.木 < 10) constitutionHints.push({type:"气郁质", reason:"五行木弱，肝气易郁", severity:"中"});
    if (wxPct.火 < 10) constitutionHints.push({type:"阳虚质", reason:"五行火弱，阳气不足", severity:"中"});
    if (wxPct.土 < 10) constitutionHints.push({type:"痰湿质", reason:"五行土弱，脾虚生湿", severity:"中"});
    if (wxPct.金 < 10) constitutionHints.push({type:"气虚质", reason:"五行金弱，肺气不固", severity:"中"});
    if (wxPct.水 < 10) constitutionHints.push({type:"阴虚质", reason:"五行水弱，阴液亏虚", severity:"中"});
    // 过旺也提示
    if (wxPct.木 > 35) constitutionHints.push({type:"气郁质", reason:"五行木过旺，肝火偏盛", severity:"低"});
    if (wxPct.火 > 35) constitutionHints.push({type:"湿热质", reason:"五行火过旺，湿热内蕴", severity:"低"});
    if (wxPct.土 > 35) constitutionHints.push({type:"痰湿质", reason:"五行土过旺，痰湿壅盛", severity:"低"});
    if (wxPct.金 > 35) constitutionHints.push({type:"特禀质", reason:"五行金过旺，肺燥易敏", severity:"低"});
    if (wxPct.水 > 35) constitutionHints.push({type:"血瘀质", reason:"五行水过旺，寒凝血瘀", severity:"低"});
    if (constitutionHints.length > 0) {
      results.baziToConstitution = constitutionHints;
    }

    // ── 八字 → 风水 (喜用色/方位) ──
    var wxCycle = ["木","火","土","金","水"];
    var dmIdx = wxCycle.indexOf(dmWx);
    var favWx, unfavWx;
    if (dmIdx >= 0) {
      favWx = wxCycle[(dmIdx + 2) % 5];  // 我克者 = 妻财 = 喜用
      unfavWx = wxCycle[(dmIdx + 3) % 5]; // 克我者 = 官鬼 = 忌神（简化处理）
      var colorMap = {"木":"绿色","火":"红色","土":"黄色","金":"白色","水":"蓝色"};
      var dirMap = {"木":"东方","火":"南方","土":"中央","金":"西方","水":"北方"};
      results.baziToFengshui = {
        favorable: favWx,
        unfavorable: unfavWx,
        favorableColor: colorMap[favWx],
        unfavorableColor: colorMap[unfavWx],
        favorableDirection: dirMap[favWx],
        unfavorableDirection: dirMap[unfavWx],
        description: "日主" + dm + "(" + dmWx + "命)，喜用" + colorMap[favWx] + "、" + dirMap[favWx] + "方，忌" + colorMap[unfavWx] + "、" + dirMap[unfavWx] + "方"
      };
    }

    // ── 八字 → 五运六气 ──
    if (yunqiData && yunqiData.wuyun && yunqiData.wuyun.dayun) {
      var dayunWx = extractWuxingFromYunqi(yunqiData.wuyun.dayun);
      if (dayunWx && dmWx) {
        var rel = CORE.wuxingRelation ? CORE.wuxingRelation(dmWx, dayunWx) : -1;
        var relText = ["同气","生我","我生","克我","我克"];
        var relDesc = ["同气相助,年份平顺","岁运生助日主,得天地之力","日主生助岁运,付出较多","岁运克制日主,压力较大","日主克制岁运,可掌控局面"];
        if (rel >= 0 && rel <= 4) {
          results.baziToYunqi = {
            relation: relText[rel],
            description: relDesc[rel] + "（" + dmWx + "命遇" + dayunWx + "运）",
            yearWuxing: dayunWx
          };
        }
      }
    }

    // ── 命卦 ──
    if (mingGua && mingGua.trigram) {
      results.mingGua = mingGua;
    }

    // ── 汇总 hints ──
    if (results.baziToConstitution) {
      results.hints.push({from:"八字→体质", text: "五行偏颇提示关注" + results.baziToConstitution.map(function(h){return h.type;}).join("、")});
    }
    if (results.baziToFengshui) {
      results.hints.push({from:"八字→风水", text: results.baziToFengshui.description});
    }
    if (results.baziToYunqi) {
      results.hints.push({from:"八字→五运六气", text: results.baziToYunqi.description});
    }

    return results;
  }

  function extractWuxingFromYunqi(dayun) {
    var chars = ["金","木","水","火","土"];
    for (var i = 0; i < chars.length; i++) {
      if (dayun.indexOf(chars[i]) !== -1) return chars[i];
    }
    return "";
  }

  /** 根据八字五行生成合理体质数据 */
  function generateConstitution(baziData) {
    const els = baziData.elements || {木:2,火:2,土:2,金:2,水:2};
    const total = els.木 + els.火 + els.土 + els.金 + els.水;
    // 缺水体质偏阴虚, 缺火偏阳虚, 缺木偏气郁, 缺金偏气虚, 缺土偏痰湿
    let scores = {
      "平和质": 60, "气虚质": 20, "阳虚质": 20, "阴虚质": 20,
      "痰湿质": 20, "湿热质": 20, "血瘀质": 20, "气郁质": 20, "特禀质": 10
    };
    // 修正: 基于五行偏颇
    if (els.水 < total * 0.12) { scores.阴虚质 += 20; scores.平和质 -= 10; }
    if (els.火 < total * 0.12) { scores.阳虚质 += 20; scores.平和质 -= 10; }
    if (els.木 < total * 0.12) { scores.气郁质 += 15; scores.平和质 -= 5; }
    if (els.金 < total * 0.12) { scores.气虚质 += 15; scores.平和质 -= 5; }
    if (els.土 < total * 0.12) { scores.痰湿质 += 15; scores.平和质 -= 5; }
    // 取最高分为 dominant
    let maxN = "平和质", maxV = 0;
    for (const k in scores) {
      if (scores[k] > maxV) { maxV = scores[k]; maxN = k; }
    }
    return { scores: scores, dominant: maxN };
  }

  /** 生成基于生辰种子的随机六爻/梅花数据 */
  function generateDivination(seed, birth) {
    function seededRand(s) {
      return function() {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    }
    const rng = seededRand(seed);
    // 六爻: 6个爻 (随机阴阳, 部分动爻)
    const lines = [];
    const branchCycle = ["子","寅","辰","午","申","戌"];
    const relationCycle = ["父母","兄弟","官鬼","妻财","子孙"];
    const godCycle = ["青龙","朱雀","勾陈","滕蛇","白虎","玄武"];
    for (let i = 0; i < 6; i++) {
      const yin = rng() > 0.5;
      const changing = rng() < 0.2;
      const bi = Math.floor(rng() * branchCycle.length);
      lines.push({
        yin: yin, changing: changing,
        branch: branchCycle[bi],
        relation: relationCycle[i % relationCycle.length],
        god: godCycle[i]
      });
    }
    // 梅花
    const trigrams = ["乾","兑","离","震","巽","坎","艮","坤"];
    const upper = Math.floor(rng() * 8);
    const lower = Math.floor(rng() * 8);
    const moving = Math.floor(rng() * 6) + 1;
    return {
      liuyao: {
        lines: lines,
        hexagramName: trigrams[upper] + trigrams[lower],
        isOriginal: true,
        yongShen: relationCycle[Math.abs(seed) % relationCycle.length],
        shiYao: Math.floor(rng() * 6) + 1,
        yingYao: Math.floor(rng() * 6) + 1
      },
      meihua: {
        upperTrigram: {name: trigrams[upper]},
        lowerTrigram: {name: trigrams[lower]},
        changingLine: moving,
        bodyTrigram: trigrams[lower],
        useTrigram: trigrams[upper]
      }
    };
  }

  /** 生成基于生辰的紫微默认数据 */
  function generateZiweiDefault(birth, mingGua) {
    const year = Number(birth.year) || DEFAULT_BIRTH.year;
    const gender = birth.gender || DEFAULT_BIRTH.gender;
    const month = Number(birth.month) || DEFAULT_BIRTH.month;
    const day = Number(birth.day) || DEFAULT_BIRTH.day;
    const hour = Number(birth.hour) || DEFAULT_BIRTH.hour;
    const seedBase = year * 1000000 + month * 10000 + day * 100 + hour + (gender === "女" ? 7 : 3);
    let seed = seedBase % 233280;
    function nextRand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const palaceNames = ["命宫","兄弟","夫妻","子女","财帛","疾厄","迁移","交友","官禄","田宅","福德","父母"];
    const stars = ["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"];
    const positions = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const brightness = ["庙","旺","得","利","平","陷"];
    const palaces = {};
    palaceNames.forEach(function(name, i) {
      const n = Math.floor(nextRand() * 3) + 1;
      const pStars = [];
      for (let j = 0; j < n; j++) {
        pStars.push(stars[Math.floor(nextRand() * stars.length)]);
      }
      palaces[name] = {
        stars: [...new Set(pStars)],
        position: positions[(i + month - 1) % 12],
        miaoxian: brightness[Math.floor(nextRand() * brightness.length)]
      };
    });
    return {
      birthInfo: { year: year, month: month, day: day, hour: hour, gender: gender },
      mingGua: mingGua,
      palaces: palaces,
      sihua: {"廉贞":"禄","破军":"权","武曲":"科","太阳":"忌"},
      mainStars: stars
    };
  }
  // ═══════════════════════════════════════════════════════
  //  数据变更通知
  // ═══════════════════════════════════════════════════════

  function notifyListeners() {
    _listeners.forEach(function(fn) { try { fn(_data); } catch(e) { console.warn("FORTUNE listener error:", e); } });
  }

  // ═══════════════════════════════════════════════════════
  //  刷新所有标签页
  // ═══════════════════════════════════════════════════════

  function setControlValue(id, value) {
    var el = document.getElementById(id);
    if (!el || value === undefined || value === null) return;
    if (el.type === "checkbox") el.checked = value !== false && value !== "false";
    else el.value = String(value);
  }

  function pillarText(pillar) {
    if (!pillar) return "";
    return (pillar.stem || "") + (pillar.branch || "");
  }

  function refreshAllTabs() {
    if (!_data) return;
    const d = _data;
    setControlValue("gi-year", d.birth.year);
    setControlValue("gi-month", d.birth.month);
    setControlValue("gi-day", d.birth.day);
    setControlValue("gi-hour", d.birth.hour);
    setControlValue("gi-gender", d.birth.gender);
    setControlValue("gi-exact-calendar", d.birth.useExactCalendar !== false);

    if (d.baziRender && typeof VizModules !== "undefined" && VizModules.bazi) {
      setControlValue("bazi-year", pillarText(d.baziRender.year));
      setControlValue("bazi-month", pillarText(d.baziRender.month));
      setControlValue("bazi-day", pillarText(d.baziRender.day));
      setControlValue("bazi-hour", pillarText(d.baziRender.hour));
      setControlValue("bazi-gender", d.birth.gender);
      VizModules.bazi.render("bazi-canvas", d.baziRender);
      if (d.bazi && d.bazi.elements) {
        setControlValue("wx-wood", d.bazi.elements.木 || 0);
        setControlValue("wx-fire", d.bazi.elements.火 || 0);
        setControlValue("wx-earth", d.bazi.elements.土 || 0);
        setControlValue("wx-metal", d.bazi.elements.金 || 0);
        setControlValue("wx-water", d.bazi.elements.水 || 0);
        VizModules.bazi.renderWuxing("wuxing-canvas", d.bazi.elements);
      }
    }

    if (d.ziwei && VizModules.ziwei) {
      setControlValue("zw-year", d.birth.year);
      setControlValue("zw-gender", d.birth.gender);
      VizModules.ziwei.render("ziwei-canvas", d.ziwei);
    }

    if (d.divination && d.divination.liuyao && VizModules.divination) {
      setControlValue("ly-hexagram", d.divination.liuyao.hexagramName);
      setControlValue("ly-yongshen", d.divination.liuyao.yongShen);
      VizModules.divination.renderLiuyao("liuyao-canvas", d.divination.liuyao);
    }

    if (d.divination && d.divination.meihua && VizModules.divination) {
      setControlValue("mh-upper", d.divination.meihua.upperTrigram && d.divination.meihua.upperTrigram.name);
      setControlValue("mh-lower", d.divination.meihua.lowerTrigram && d.divination.meihua.lowerTrigram.name);
      setControlValue("mh-moving", d.divination.meihua.changingLine || 1);
      VizModules.divination.renderMeihua("meihua-canvas", d.divination.meihua);
    }

    if (d.yunqi && VizModules.health) {
      setControlValue("yq-year", d.birth.year);
      VizModules.health.renderYunqi("yunqi-canvas", d.yunqi);
    }

    if (d.constitution && VizModules.health) {
      var names = ["平和质","气虚质","阳虚质","阴虚质","痰湿质","湿热质","血瘀质","气郁质","特禀质"];
      var ids = ["c1","c2","c3","c4","c5","c6","c7","c8","c9"];
      names.forEach(function(name, i) { setControlValue(ids[i], d.constitution.scores[name]); });
      var dominantEl = document.getElementById("dominant-constitution");
      if (dominantEl) dominantEl.textContent = d.constitution.dominant;
      VizModules.health.renderConstitution("constitution-canvas", d.constitution);
    }

    if (VizModules.fengshui) {
      VizModules.fengshui.renderCompass("compass-canvas");
    }

    setControlValue("fs-year", d.birth.year);
    if (typeof updateFlyingStars === "function") {
      updateFlyingStars();
    } else if (VizModules.fengshui && typeof VizModules.fengshui.renderFlyingStars === "function") {
      VizModules.fengshui.renderFlyingStars("flying-stars-canvas", { year: d.birth.year });
    }

    setControlValue("bz-year", d.birth.year);
    setControlValue("bz-gender", d.birth.gender === "女" ? "女" : "男");
    if (typeof updateEightMansions === "function") {
      updateEightMansions();
    } else if (VizModules.fengshui && typeof VizModules.fengshui.renderEightMansions === "function") {
      VizModules.fengshui.renderEightMansions("eight-mansions-canvas", { year: d.birth.year, gender: d.birth.gender });
    }
  }
  // ═══════════════════════════════════════════════════════
  //  全局输入面板
  // ═══════════════════════════════════════════════════════

  /** 创建或获取全局输入面板 HTML */
  function createGlobalInputPanel() {
    // 如果已存在, 跳过
    if (document.getElementById("global-input-panel")) return;

    const panel = document.createElement("div");
    panel.id = "global-input-panel";
    panel.style.cssText = `
      background: linear-gradient(135deg, #3E2723 0%, #5D4037 100%);
      border-radius: 12px; padding: 16px 24px; margin-bottom: 20px;
      color: #F5F0EB; font-family: "Noto Sans SC","Microsoft YaHei",sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:18px;font-weight:bold;">☯ 全局命盘数据</span>
        <span style="font-size:12px;color:#BCAAA4;">输入生辰后一键更新所有标签页</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;">
        <div style="flex:1;min-width:80px;">
          <label for="gi-year" style="display:block;font-size:11px;color:#BCAAA4;margin-bottom:3px;">公历年份</label>
          <input type="number" id="gi-year" value="${_birth.year}"
            style="width:100%;padding:6px 10px;border:1px solid #8D6E63;border-radius:6px;
                   background:#4E342E;color:#F5F0EB;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="flex:1;min-width:60px;">
          <label for="gi-month" style="display:block;font-size:11px;color:#BCAAA4;margin-bottom:3px;">月</label>
          <input type="number" id="gi-month" value="${_birth.month}" min="1" max="12"
            style="width:100%;padding:6px 10px;border:1px solid #8D6E63;border-radius:6px;
                   background:#4E342E;color:#F5F0EB;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="flex:1;min-width:60px;">
          <label for="gi-day" style="display:block;font-size:11px;color:#BCAAA4;margin-bottom:3px;">日</label>
          <input type="number" id="gi-day" value="${_birth.day}" min="1" max="31"
            style="width:100%;padding:6px 10px;border:1px solid #8D6E63;border-radius:6px;
                   background:#4E342E;color:#F5F0EB;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="flex:1;min-width:60px;">
          <label for="gi-hour" style="display:block;font-size:11px;color:#BCAAA4;margin-bottom:3px;">时 (0-23)</label>
          <input type="number" id="gi-hour" value="${_birth.hour}" min="0" max="23"
            style="width:100%;padding:6px 10px;border:1px solid #8D6E63;border-radius:6px;
                   background:#4E342E;color:#F5F0EB;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="flex:0 0 80px;">
          <label for="gi-gender" style="display:block;font-size:11px;color:#BCAAA4;margin-bottom:3px;">性别</label>
          <select id="gi-gender"
            style="width:100%;padding:6px 10px;border:1px solid #8D6E63;border-radius:6px;
                   background:#4E342E;color:#F5F0EB;font-size:14px;">
            <option value="男" ${_birth.gender==="男"?"selected":""}>男</option>
            <option value="女" ${_birth.gender==="女"?"selected":""}>女</option>
          </select>
        </div>
        <div style="flex:0 0 150px;min-width:145px;padding-bottom:7px;">
          <label for="gi-exact-calendar" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#F5F0EB;cursor:pointer;white-space:nowrap;">
            <input type="checkbox" id="gi-exact-calendar" ${_birth.useExactCalendar!==false?"checked":""} style="accent-color:#F9A825;">
            精确历法测算
          </label>
        </div>
        <div style="flex:0 0 auto;">
          <button id="gi-update"
            style="padding:8px 24px;background:linear-gradient(135deg,#D4A017,#F9A825);
                   border:none;border-radius:6px;color:#3E2723;font-size:14px;font-weight:bold;
                   cursor:pointer;box-shadow:0 2px 8px rgba(212,160,23,0.3);
                   transition:all 0.2s;">
            ⟳ 更新全局
          </button>
        </div>
      </div>
      <div id="gi-error" class="input-error" style="display:none;"></div>
      <div id="gi-summary" style="margin-top:10px;font-size:12px;color:#A1887F;">
        点击「更新全局」将使用此生辰数据刷新所有标签页
      </div>
    `;

    // 插入到 .header 之后, .tab-bar 之前
    const header = document.querySelector(".header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(panel, header.nextSibling);
    } else {
      document.body.insertBefore(panel, document.body.firstChild);
    }

    // 绑定更新按钮
    document.getElementById("gi-update").addEventListener("click", function() {
      const raw = {
        year: document.getElementById("gi-year").value,
        month: document.getElementById("gi-month").value,
        day: document.getElementById("gi-day").value,
        hour: document.getElementById("gi-hour").value,
        gender: document.getElementById("gi-gender").value,
        useExactCalendar: document.getElementById("gi-exact-calendar") ? document.getElementById("gi-exact-calendar").checked : true
      };
      const validator = window.CapabilityRegistry && CapabilityRegistry.validateBirthInput;
      const result = validator ? validator(raw) : { ok: true, value: {
        year: parseInt(raw.year, 10), month: parseInt(raw.month, 10), day: parseInt(raw.day, 10), hour: parseInt(raw.hour, 10), gender: raw.gender
      }, errors: [] };
      const errorEl = document.getElementById("gi-error");
      if (!result.ok) {
        if (errorEl) {
          errorEl.style.display = "block";
          errorEl.innerHTML = result.errors.join("<br>");
        }
        return;
      }
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }
      updateBirth(result.value);
    });
  }

  /** 更新全局作息并刷新 */
  function updateBirth(newBirth) {
    if (window.CapabilityRegistry && CapabilityRegistry.validateBirthInput) {
      var checked = CapabilityRegistry.validateBirthInput(Object.assign({}, _birth, newBirth));
      if (!checked.ok) {
        throw new Error(checked.errors.join("; "));
      }
      newBirth = checked.value;
    }
    _birth = Object.assign({}, _birth, newBirth);
    _data = computeAll(_birth);
    notifyListeners();
    // 如果面板已存在, 同步显示
    const summary = document.getElementById("gi-summary");
    if (summary) {
      const d = _data;
      const b = d.bazi;
      summary.innerHTML = `
        <strong>${d.birth.year}年${d.birth.month}月${d.birth.day}日 ${d.birth.gender}命</strong>
        &nbsp;·&nbsp; 日主: <strong style="color:#F9A825;">${b.dayMaster}</strong> ${b.dayMasterWuxing||""}命
        &nbsp;·&nbsp; 四柱: ${b.pillars.year.stem}${b.pillars.year.branch} / ${b.pillars.month.stem}${b.pillars.month.branch} / ${b.pillars.day.stem}${b.pillars.day.branch} / ${b.pillars.hour.stem}${b.pillars.hour.branch}
        &nbsp;·&nbsp; ${d.yunqi.wuyun.dayun || ""}
        &nbsp;·&nbsp; 命卦: ${d.fengshui.mingGua.trigram} (${d.fengshui.mingGua.group})
      `;
    }
    // 更新交叉引用面板
    renderCrossRefPanel(_data);
    refreshAllTabs();
  }

  /** 渲染交叉引用面板 */
  function renderCrossRefPanel(data) {
    var panel = document.getElementById("cross-ref-panel");
    if (!panel) return;
    var cr = data && data.crossRef;
    if (!cr || !cr.hints || cr.hints.length === 0) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "";
    var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">';
    html += '<span style="font-size:12px;color:#D4A017;font-weight:bold;">🔗 交叉分析</span>';
    cr.hints.forEach(function(h) {
      html += '<span style="display:inline-block;background:rgba(212,160,23,0.12);color:#5D4037;font-size:11px;padding:4px 10px;border-radius:12px;border:1px solid rgba(212,160,23,0.25);">';
      html += '<b>' + h.text.split("，")[0] + '</b>';
      if (h.text.indexOf("，") > 0) html += '，' + h.text.slice(h.text.indexOf("，") + 1);
      html += '</span>';
    });
    html += '</div>';
    panel.innerHTML = html;
  }

  /** 绑定 Canvas 交互: 八宅/飞星点击查古籍 */
  function bindCanvasInteractions() {
    // 八宅/飞星点击 → 古籍引用
    var citeData = {
      "flying-stars-canvas":  { field:"feixing", label:"流年飞星", source: "《紫白诀》" },
      "eight-mansions-canvas": { field:"bazhai", label:"八宅大游年", source: "《八宅明镜》" }
    };
    Object.keys(citeData).forEach(function(id) {
      var c = document.getElementById(id);
      if (!c) return;
      c.style.cursor = "pointer";
      c.addEventListener("click", function(e) {
        if (!_data || !_data.crossRef) return;
        var popup = document.getElementById("cite-popup");
        var titleEl = document.getElementById("cite-popup-title");
        var bodyEl = document.getElementById("cite-popup-body");
        var srcEl = document.getElementById("cite-popup-source");
        if (!popup || !titleEl || !bodyEl || !srcEl) return;

        var info = citeData[id];
        var cr = _data.crossRef;
        var bodyText = "", sourceText = "";

        if (id === "eight-mansions-canvas" && cr.baziToFengshui) {
          bodyText = "基于八字日主分析：<br>" + cr.baziToFengshui.description;
          sourceText = "参考：八字喜用神理论 + " + info.source;
        } else if (id === "flying-stars-canvas" && cr.baziToYunqi) {
          bodyText = "基于八字与岁运生克：<br>" + cr.baziToYunqi.description;
          sourceText = "参考：五行生克 + 玄空飞星理论";
        } else {
          // Fallback: show term explanation from CORE
          var term = (id === "flying-stars-canvas") ? "飞星" : "八宅";
          if (typeof CORE !== "undefined" && CORE.termExplanations) {
            var exp = CORE.termExplanations[term];
            if (exp) bodyText = "<b>" + term + "</b>：" + exp;
          }
          if (!bodyText) bodyText = "点击宫位可查看古籍原文。";
          sourceText = info.source;
        }

        if (window.CapabilityRegistry && CapabilityRegistry.showCitation) {
          CapabilityRegistry.showCitation(info.label, bodyText, sourceText, e.clientX + 12, e.clientY + 8);
          return;
        }

        titleEl.textContent = info.label;
        bodyEl.innerHTML = bodyText;
        srcEl.textContent = sourceText;

        // 定位
        popup.style.display = "block";
        var px = e.clientX + 12;
        var py = e.clientY + 8;
        if (px + 370 > window.innerWidth) px = e.clientX - 370;
        if (py + 200 > window.innerHeight) py = window.innerHeight - 210;
        if (px < 4) px = 4;
        if (py < 4) py = 4;
        popup.style.left = px + "px";
        popup.style.top = py + "px";
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  公开 API
  // ═══════════════════════════════════════════════════════

  window.FORTUNE = {
    /** 获取当前生辰 */
    getBirth: function() { return Object.assign({}, _birth); },

    /** 获取完整数据快照 */
    getData: function() { return _data; },

    /** 获取八字渲染数据 (兼容 bazi.js) */
    getBaziRender: function() { return _data && _data.baziRender; },

    /** 获取五运六气数据 */
    getYunqi: function() { return _data && _data.yunqi; },

    /** 获取体质数据 */
    getConstitution: function() { return _data && _data.constitution; },

    /** 获取风水数据 */
    getFengshui: function() { return _data && _data.fengshui; },

    /** 获取模块能力状态 */
    getCapabilities: function() {
      return window.CapabilityRegistry ? CapabilityRegistry.getCapabilities() : {};
    },

    /** 导出可填入 REPORT_DATA 的脱敏快照 */
    exportReportData: function() {
      return window.CapabilityRegistry ? CapabilityRegistry.exportReportData(_data) : null;
    },

    /** 初始化: 创建输入面板 + 计算默认数据 + 刷新 */
    init: function(defaultBirth) {
      if (defaultBirth) _birth = Object.assign({}, DEFAULT_BIRTH, defaultBirth);
      createGlobalInputPanel();
      _data = computeAll(_birth);
      if (window.CapabilityRegistry) {
        CapabilityRegistry.init(function() { return _data; });
      }
      // 延迟刷新 (等 DOM 渲染完成)
      setTimeout(function() {
        refreshAllTabs();
        bindCanvasInteractions();
        // 触发 summary 更新
        const btn = document.getElementById("gi-update");
        if (btn) btn.click();
      }, 500);
    },

    /** 注册数据变更回调 */
    onUpdate: function(fn) { _listeners.push(fn); },

    /** 手动更新生辰并刷新 */
    update: function(birthObj) { updateBirth(birthObj); }
  };
})();
