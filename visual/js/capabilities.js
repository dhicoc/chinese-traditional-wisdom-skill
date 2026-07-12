/**
 * capabilities.js — v0.2 能力标识、引擎适配器、导出与诊断工具
 *
 * 本文件只提供浏览器端辅助能力，不改变各可视化模块的 render 接口。
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var REPORT_DATA_VERSION = "0.2.0";

  var CAPABILITIES = {
    home: {
      label: "工作台",
      mode: "local",
      modeLabel: "本地工作流",
      note: "咨询向导、报告导出、诊断入口均在浏览器本地运行。"
    },
    bazi: {
      label: "八字命盘",
      mode: "local-exact",
      modeLabel: "本地精确计算",
      note: "内置 lunar-javascript 读取精确节气干支；用户关闭精确历法时回退纯 JS 近似模式。"
    },
    ziwei: {
      label: "紫微斗数",
      mode: "local-exact",
      modeLabel: "本地真实排盘",
      note: "采用 SylarLong/iztro (v2.5.8) 引擎，紫微流派存在差异。未加载 iztro 时回退演示数据。"
    },
    liuyao: {
      label: "六爻占卜",
      mode: "local-exact",
      modeLabel: "本地真实纳甲",
      note: "内置京房八宫纳甲引擎(liuyao-engine.js)：铜钱法/时间起卦/手动爻值，输出纳甲、六亲、六神、世应、用神、变卦；日干取自 lunar-javascript，未加载时回退近似。不同流派在纳甲地支顺逆与六神起例上可能存在口径差异。"
    },
    meihua: {
      label: "梅花易数",
      mode: "local",
      modeLabel: "本地规则计算",
      note: "内置时间起卦规则，按年月日时生成上下卦、动爻、互卦、变卦与体用生克；不同流派可能存在口径差异。"
    },
    fengshui: {
      label: "风水罗盘",
      mode: "knowledge",
      modeLabel: "确定性映射",
      note: "二十四山和罗盘展示基于内置方位表与 Canvas 渲染。"
    },
    feixing: {
      label: "流年飞星",
      mode: "local",
      modeLabel: "本地规则计算",
      note: "按下元七赤起甲子与九宫顺飞规则计算入中星和飞布。"
    },
    bazhai: {
      label: "八宅大游年",
      mode: "local",
      modeLabel: "本地规则计算",
      note: "根据出生年、性别计算命卦，并展示八宅吉凶方位。"
    },
    yunqi: {
      label: "五运六气",
      mode: "local-exact",
      modeLabel: "本地精确边界",
      note: "内置 lunar-javascript 按大寒边界修正运气年份；用户关闭精确历法时回退公历年近似模式。"
    },
    tizhi: {
      label: "体质辨识",
      mode: "derived",
      modeLabel: "推导/问卷数据",
      note: "可手动输入九种体质评分；全局联动数据为八字五行偏颇的辅助推导。"
    },
    mermaid: {
      label: "知识图谱",
      mode: "optional-cdn",
      modeLabel: "可选 CDN",
      note: "Mermaid 加载失败时不影响其他 Canvas 模块；知识图谱会显示离线提示。"
    }
  };

  var MODE_LABELS = {
    local: "本地真实计算",
    "local-exact": "本地精确计算",
    "local-approx": "本地近似计算",
    demo: "演示数据",
    "fallback-demo": "降级演示",
    knowledge: "知识/映射",
    derived: "推导数据",
    "optional-cdn": "可选 CDN"
  };

  var MODE_COLORS = {
    local: "#2E7D32",
    "local-exact": "#1B5E20",
    "local-approx": "#B26A00",
    demo: "#8D3DAF",
    "fallback-demo": "#795548",
    knowledge: "#1565C0",
    derived: "#5D4037",
    "optional-cdn": "#6D4C41"
  };


  function getCapabilities() {
    return JSON.parse(JSON.stringify(CAPABILITIES));
  }

  function validateBirthInput(input) {
    var errors = [];
    var y = Number(input.year);
    var m = Number(input.month);
    var d = Number(input.day);
    var h = Number(input.hour);
    var gender = input.gender;

    if (!Number.isInteger(y) || y < 1900 || y > 2100) errors.push("年份必须是 1900-2100 之间的整数。");
    if (!Number.isInteger(m) || m < 1 || m > 12) errors.push("月份必须是 1-12。");
    if (!Number.isInteger(h) || h < 0 || h > 23) errors.push("时辰必须是 0-23。");
    if (gender !== "男" && gender !== "女") errors.push("性别必须选择男或女。");
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      errors.push("日期必须是 1-31。");
    } else if (errors.length === 0) {
      var test = new Date(y, m - 1, d);
      if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
        errors.push("输入的年月日不是有效公历日期。");
      }
    }

    return {
      ok: errors.length === 0,
      valid: errors.length === 0,
      errors: errors,
      value: { year: y, month: m, day: d, hour: h, gender: gender || "男", isLunar: !!input.isLunar, useExactCalendar: input.useExactCalendar !== false }
    };
  }

  function sanitizeFilename(text) {
    return String(text || "anonymous").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 40);
  }

  function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function exportReportData(data) {
    data = data || {};
    var birth = data.birth || {};
    var bazi = data.bazi || {};
    var readings = {};
    if (window.EngineAdapterRegistry && typeof EngineAdapterRegistry.toReading === "function") {
      ["bazi", "yunqi", "meihua"].forEach(function (name) {
        try {
          var result = EngineAdapterRegistry.calculate(name, { birth: birth });
          var reading = EngineAdapterRegistry.toReading(name, result, { birth: birth });
          if (reading) readings[name] = reading;
        } catch (e) {}
      });
    }
    // 四层归类：对每个 reading 生成 fourLayer（tldr/highlights/details/actions）
    // 复刻 apps/visual/src/legacy/reportLayers.ts toFourLayer 核心规则（精简版）
    var fourLayer = {};
    Object.keys(readings).forEach(function (name) {
      fourLayer[name] = toFourLayerJS(readings[name]);
    });
    return {
      version: REPORT_DATA_VERSION,
      generatedAt: new Date().toISOString(),
      subject: {
        label: "CASE-" + (birth.year || "YYYY") + "-" + (birth.gender || "NA"),
        birthYear: birth.year || null,
        gender: birth.gender || null
      },
      sourceNotes: [
        "八字：" + CAPABILITIES.bazi.note,
        "紫微：" + CAPABILITIES.ziwei.note,
        "六爻：" + CAPABILITIES.liuyao.note,
        "梅花：" + CAPABILITIES.meihua.note,
        "五运六气：" + CAPABILITIES.yunqi.note,
        "隐私：导出数据不包含完整出生日期、姓名或地点。"
      ],
      bazi: data.baziRender || null,
      wuxing: bazi.elements || null,
      ziwei: anonymizeZiwei(data.ziwei),
      liuyao: data.divination && data.divination.liuyao ? data.divination.liuyao : null,
      meihua: data.divination && data.divination.meihua ? data.divination.meihua : null,
      feixing: birth.year ? { year: birth.year } : null,
      bazhai: data.fengshui ? { year: birth.year, gender: birth.gender, mingGua: data.fengshui.mingGua } : null,
      yunqi: anonymizeYunqi(data.yunqi),
      constitution: data.constitution || null,
      readings: readings,
      fourLayer: fourLayer
    };
  }

  /**
   * 精简四层归类（复刻 apps/visual/src/legacy/reportLayers.ts toFourLayer）。
   * 旧 JS 路径用，HTML 报告模板可消费 fourLayer.{name}.{tldr,highlights,details,actions}。
   */
  var HIGHLIGHT_HEADINGS = ["命宫","四化","值符值使","世应用神","体用生克","喜用神","日主强弱","强弱判断","格局","遁局","综合评级","卦象"];
  var ACTION_HEADINGS = ["策略指导","化解","布局建议","择日","行动建议"];
  // 技术细节段直接剔除（不展示给用户）
  var TECHNICAL_HEADINGS = ["起卦方式","边界说明","年份边界","说明","口径","引擎","历法"];
  function toFourLayerJS(reading) {
    if (!reading || !reading.sections) return { tldr: "", highlights: [], details: [], actions: [] };
    var highlights = [], details = [], actions = [];
    reading.sections.forEach(function (section) {
      if (TECHNICAL_HEADINGS.some(function (h) { return section.heading.indexOf(h) >= 0; })) return;
      var isH = HIGHLIGHT_HEADINGS.some(function (h) { return section.heading.indexOf(h) >= 0; });
      var isA = ACTION_HEADINGS.some(function (h) { return section.heading.indexOf(h) >= 0; });
      if (isH) {
        var core = (section.body.split("。")[0] || section.body).slice(0, 80);
        highlights.push({ label: section.heading, value: core, tone: detectToneJS(section.body), strength: detectStrengthJS(section.body) });
      } else if (isA) {
        section.body.split(/[；。\n]/).forEach(function (s) {
          if (s.trim().length >= 4) actions.push({ text: s.trim(), category: detectActionCategoryJS(s) });
        });
      } else {
        details.push(section);
      }
    });
    return {
      tldr: reading.summary || "",
      overallTone: detectToneJS((reading.summary || "") + " " + (reading.tags || []).join(" ")),
      highlights: highlights,
      details: details,
      actions: actions,
      sourceNotes: reading.sourceNotes || "",
      tags: reading.tags || []
    };
  }
  function detectToneJS(text) {
    if (/大吉|吉格|用生体|可成|身强|旺|相|生门|休门|开门|阳遁|禄|权|科/.test(text)) return "吉";
    if (/大凶|凶格|用克体|不利|身弱|死|囚|绝命|五鬼|祸害|六煞|死门|惊门|伤门|忌/.test(text)) return "凶";
    return "中";
  }
  function detectStrengthJS(text) {
    if (/偏强|身强|偏旺|得令|得地|得势/.test(text)) return "强";
    if (/偏弱|身弱|偏衰|失令|失地|失势/.test(text)) return "弱";
    return null;
  }
  function detectActionCategoryJS(text) {
    if (/进|退|变|守|顺|出击|保守|静观|主动|把握/.test(text)) return "决策";
    if (/布局|方位|摆放|财位|催财|化煞|卧室|厨房|书房/.test(text)) return "生活调整";
    if (/养生|食疗|经络|作息|锻炼|饮食|体质/.test(text)) return "养生";
    if (/禅|修心|心性|情绪|豁达|随缘|放下/.test(text)) return "心性";
    if (/择日|择吉|时机|时间窗口|宜|忌/.test(text)) return "择吉";
    return "生活调整";
  }

  /**
   * 紫微脱敏：移除 birthInfo 的 month/day/hour 与 chart 里的 solarDate/lunarDate/
   * rawDates/time 等明文生日字段，仅保留 birthYear 与排盘结果（宫位/星曜/四化）。
   */
  function anonymizeZiwei(ziwei) {
    if (!ziwei) return null;
    var z = shallowClone(ziwei);
    if (z.birthInfo) {
      z.birthInfo = { year: z.birthInfo.year, gender: z.birthInfo.gender };
    }
    if (z.chart) {
      var c = shallowClone(z.chart);
      delete c.solarDate;
      delete c.lunarDate;
      delete c.chineseDate;
      delete c.rawDates;
      delete c.time;
      delete c.timeRange;
      z.chart = c;
    }
    return z;
  }

  /** 五运六气脱敏：移除 queryDate/dahan 等明文日期，保留 year 与运气推算结果。 */
  function anonymizeYunqi(yunqi) {
    if (!yunqi) return null;
    var y = shallowClone(yunqi);
    delete y.queryDate;
    delete y.dahan;
    return y;
  }

  function shallowClone(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.slice();
    var copy = {};
    for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) copy[k] = obj[k]; }
    return copy;
  }


  function renderSourceNotes(notes) {
    if (Array.isArray(notes)) {
      return notes.map(function(note) { return "<li>" + escapeHtml(note) + "</li>"; }).join("");
    }
    return Object.keys(notes || {}).map(function(k) {
      return "<li><b>" + escapeHtml(k) + "</b>：" + escapeHtml(notes[k]) + "</li>";
    }).join("");
  }
  function buildReportHtml(reportData) {
    var title = "传统文化智慧可视化报告";
    var notes = reportData.sourceNotes || [];
    var wx = reportData.wuxing || {};
    var bazi = reportData.bazi || {};
    var pillars = ["year", "month", "day", "hour"].map(function (k) {
      var p = bazi[k];
      return p ? (p.stem || "") + (p.branch || "") : "-";
    });
    var html = "<!DOCTYPE html>\n" +
      "<html lang=\"zh-CN\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
      "<title>" + title + "</title><style>" +
      "body{font-family:'Microsoft YaHei',sans-serif;background:#F5F0EB;color:#2C1810;padding:24px;}" +
      ".wrap{max-width:860px;margin:0 auto}.card{background:#fff;border:1px solid #EFEBE6;border-radius:8px;padding:18px;margin:14px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}" +
      "h1{font-size:24px}h2{font-size:17px;color:#5D4037}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.item{background:#FAFAF7;border-left:3px solid #D4A017;padding:10px;border-radius:4px}pre{white-space:pre-wrap;background:#2C1810;color:#F5F0EB;padding:12px;border-radius:6px;overflow:auto}" +
      "</style></head><body><div class=\"wrap\">" +
      "<h1>" + title + "</h1><p>生成时间：" + reportData.generatedAt + "；脱敏标识：" + reportData.subject.label + "</p>" +
      "<div class=\"card\"><h2>能力说明</h2><ul>" + renderSourceNotes(notes) + "</ul></div>" +
      "<div class=\"card\"><h2>八字四柱</h2><div class=\"grid\">" +
      ["年柱", "月柱", "日柱", "时柱"].map(function (name, i) {
        return "<div class=\"item\"><b>" + name + "</b><br>" + pillars[i] + "</div>";
      }).join("") + "</div></div>" +
      "<div class=\"card\"><h2>五行统计</h2><div class=\"grid\">" +
      ["木", "火", "土", "金", "水"].map(function (k) {
        return "<div class=\"item\"><b>" + k + "</b><br>" + (wx[k] == null ? "-" : wx[k]) + "</div>";
      }).join("") + "</div></div>" +
      "<div class=\"card\"><details><summary style='cursor:pointer;color:#999;font-size:13px;'>完整 REPORT_DATA（供 AI 消费，点击展开）</summary><pre style='margin-top:8px;'>" + escapeHtml(JSON.stringify(reportData, null, 2)) + "</pre></details></div>";
    if (reportData.readings && Object.keys(reportData.readings).length) {
      html += "<div class=\"card\"><details><summary style='cursor:pointer;color:#999;font-size:13px;'>结构化阅读摘要 (readings，供 AI 消费，点击展开)</summary>";
      Object.keys(reportData.readings).forEach(function (name) {
        var r = reportData.readings[name];
        html += "<div class='item' style='margin-bottom:10px;'><b>" + escapeHtml(r.title) + "</b><br>" +
          "<span style='font-size:13px;color:#5D4037;'>" + escapeHtml(r.summary) + "</span><br>";
        if (r.tags && r.tags.length) {
          html += "<div style='margin-top:4px;'>" + r.tags.map(function (t) {
            return "<span style='display:inline-block;background:#FAFAF7;border:1px solid #eee;border-radius:3px;padding:1px 6px;font-size:11px;color:#888;margin-right:4px;'>" + escapeHtml(t) + "</span>";
          }).join("") + "</div>";
        }
        if (r.sections && r.sections.length) {
          html += "<details style='margin-top:6px;'><summary style='cursor:pointer;font-size:12px;color:#999;'>详细分区（" + r.sections.length + "段）</summary><div style='padding:6px 0;'>";
          r.sections.forEach(function (sec) {
            html += "<div style='margin-bottom:4px;font-size:13px;'><b>" + escapeHtml(sec.heading) + "</b>：" + escapeHtml(sec.body) + "</div>";
          });
          html += "</div></details>";
        }
        html += "<p style='font-size:11px;color:#aaa;margin-top:4px;'>" + escapeHtml(r.sourceNotes) + "</p></div>";
      });
      html += "</details></div>";
    }
    // 四层报告
    if (reportData.fourLayer && Object.keys(reportData.fourLayer).length) {
      html += "<div class=\"card\"><h2>四层报告 (fourLayer)</h2>";
      Object.keys(reportData.fourLayer).forEach(function (name) {
        var fl = reportData.fourLayer[name];
        if (!fl || !fl.tldr) return;
        var toneColor = fl.overallTone === "吉" ? "#2e7d32" : fl.overallTone === "凶" ? "#c62828" : "#757575";
        // overallTone=中时省略徽章（与 React FourLayerReport 对齐，中是默认态）
        var overallBadge = fl.overallTone !== "中"
          ? "<span style='display:inline-block;border:1px solid " + toneColor + ";color:" + toneColor + ";border-radius:3px;padding:1px 6px;font-size:11px;'>" + escapeHtml(fl.overallTone) + "</span> "
          : "";
        html += "<div class='item' style='margin-bottom:14px;'><b>" + escapeHtml(name) + " · 四层报告</b> " +
          overallBadge + "<br>" +
          "<p style='font-size:14px;margin-top:6px;'>" + escapeHtml(fl.tldr) + "</p>";
        // highlights
        if (fl.highlights && fl.highlights.length) {
          html += "<div style='margin-top:8px;font-size:12px;color:#666;'>关键亮点 / 风险</div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;'>";
          fl.highlights.forEach(function (h) {
            var hc = h.tone === "吉" ? "#2e7d32" : h.tone === "凶" ? "#c62828" : "#999";
            // tone=中时省略徽章（与 React 对齐，避免与身强/身弱标并排显示成「身强 中」混淆）
            var toneBadge = h.tone !== "中"
              ? "<span style='font-size:10px;color:" + hc + ";'>" + escapeHtml(h.tone) + "</span>"
              : "";
            html += "<div style='border:1px solid " + hc + "33;background:" + hc + "0d;border-radius:4px;padding:6px;'><b style='font-size:12px;'>" + escapeHtml(h.label) + "</b> " +
              (h.strength ? "<span style='font-size:10px;color:#b8860b;border:1px solid #b8860b66;border-radius:2px;padding:0 4px;'>" + escapeHtml(h.strength === "强" ? "身强" : "身弱") + "</span>" : "") +
              toneBadge + "<br>" +
              "<span style='font-size:11px;color:#777;'>" + escapeHtml(h.value) + "</span></div>";
          });
          html += "</div>";
        }
        // actions
        if (fl.actions && fl.actions.length) {
          html += "<div style='margin-top:8px;font-size:12px;color:#666;'>可执行建议</div>";
          fl.actions.forEach(function (a) {
            html += "<div style='font-size:12px;margin-top:2px;'><span style='color:#888;'>[" + escapeHtml(a.category) + "]</span> " + escapeHtml(a.text) + "</div>";
          });
        }
        // details（折叠）
        if (fl.details && fl.details.length) {
          html += "<details style='margin-top:6px;'><summary style='cursor:pointer;font-size:12px;color:#999;'>详细分析（" + fl.details.length + "段）</summary><div style='padding:6px 0;'>";
          fl.details.forEach(function (d) {
            html += "<div style='margin-bottom:4px;font-size:13px;'><b>" + escapeHtml(d.heading) + "</b>：" + escapeHtml(d.body) + "</div>";
          });
          html += "</div></details>";
        }
        html += "</div>";
      });
      html += "</div>";
    }
    html += "</div></body></html>";
    return html;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch];
    });
  }

  function downloadText(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadReport(data) {
    var reportData = exportReportData(data);
    var filename = "visual-report-" + sanitizeFilename(reportData.subject.label) + "-" + formatDate(new Date()) + ".html";
    downloadText(filename, buildReportHtml(reportData), "text/html;charset=utf-8");
  }

  function downloadCaseDraft(data) {
    data = data || {};
    var birth = data.birth || {};
    var date = formatDate(new Date()).replace(/-/g, "");
    var filename = "CASE-" + date + "-001-draft.md";
    var content = [
      "# CASE-" + date + "-001",
      "",
      "- 日期：" + formatDate(new Date()),
      "- 类型：[健康/事业/婚恋/占卜/择居/综合]",
      "- 脱敏标识：CASE-" + (birth.year || "YYYY") + "-" + (birth.gender || "NA"),
      "- 主要学科：[待填写]",
      "- 状态：open",
      "",
      "## 输入摘要",
      "",
      "- 出生年份：" + (birth.year || "未提供"),
      "- 性别：" + (birth.gender || "未提供"),
      "- 问题摘要：[只写脱敏后的问题类别，不记录完整生辰、姓名、地点]",
      "",
      "## 分析路径",
      "",
      "- 路由：[待填写]",
      "- 使用引擎：[待填写]",
      "- 能力边界：[真实计算/近似计算/演示数据/外部引擎]",
      "",
      "## 经验沉淀",
      "",
      "- 成功点：",
      "- 失败点：",
      "- 后续改进："
    ].join("\n");
    downloadText(filename, content, "text/markdown;charset=utf-8");
  }

  function renderCapabilityBadges() {
    Object.keys(CAPABILITIES).forEach(function (tab) {
      var cap = CAPABILITIES[tab];
      var color = MODE_COLORS[cap.mode] || "#5D4037";
      var content = document.getElementById("tab-" + tab);
      if (content && !content.querySelector(".capability-note")) {
        var card = content.querySelector(".card");
        if (card) {
          var note = document.createElement("div");
          note.className = "capability-note";
          note.style.cssText = "margin-bottom:12px;padding:9px 12px;background:#FAFAF7;border-left:4px solid " + color + ";border-radius:4px;color:#5D4037;font-size:12px;line-height:1.6;";
          note.innerHTML = "<b style=\"color:" + color + ";\">" + cap.modeLabel + "</b> · " + cap.note;
          card.insertBefore(note, card.children[1] || card.firstChild);
        }
      }
      var btn = document.querySelector(".tab-btn[data-tab='" + tab + "']");
      if (btn && !btn.querySelector(".tab-cap-dot")) {
        var dot = document.createElement("span");
        dot.className = "tab-cap-dot";
        dot.title = cap.modeLabel;
        dot.style.cssText = "display:inline-block;width:7px;height:7px;margin-left:5px;border-radius:50%;background:" + color + ";vertical-align:middle;";
        btn.appendChild(dot);
      }
    });
  }

  function renderHomeEnhancements(getData) {
    if (document.getElementById("roadmap-actions")) return;
    var home = document.getElementById("tab-home");
    if (!home) return;
    var actions = document.createElement("div");
    actions.id = "roadmap-actions";
    actions.className = "card";
    actions.innerHTML =
      "<div class=\"card-title\">🧭 咨询向导与开发者工具</div>" +
      "<div class=\"wizard-grid\">" +
      wizardButton("健康养生", "yunqi", "五运六气 + 体质") +
      wizardButton("事业决策", "bazi", "八字 + 道家") +
      wizardButton("婚恋合婚", "bazi", "八字 + 紫微") +
      wizardButton("占卜决策", "liuyao", "六爻 / 梅花") +
      wizardButton("择居选址", "fengshui", "风水 + 八宅") +
      wizardButton("综合咨询", "mermaid", "全维度知识图谱") +
      "</div>" +
      "<div class=\"action-row\">" +
      "<button id=\"export-report-btn\">导出静态 HTML 报告</button>" +
      "<button id=\"case-draft-btn\">生成脱敏案例草稿</button>" +
      "<button id=\"diagnostics-btn\">打开开发者诊断</button>" +
      "<button id=\"wizard-btn\">打开咨询向导</button>" +
      "</div>";
    var anchor = home.querySelector(".home-note") || home.children[1] || null;
    if (anchor && anchor.parentNode !== home) anchor = null;
    home.insertBefore(actions, anchor);
    document.getElementById("export-report-btn").addEventListener("click", function () { downloadReport(getData()); });
    document.getElementById("case-draft-btn").addEventListener("click", function () { downloadCaseDraft(getData()); });
    document.getElementById("diagnostics-btn").addEventListener("click", function () { openDiagnostics(getData()); });
    var wizardBtn = document.getElementById("wizard-btn");
    if (wizardBtn) wizardBtn.addEventListener("click", function () { openConsultationWizard(getData()); });
    renderHistoryPanel(home);
  }

  /**
   * 渲染历史记录面板。
   * 在首页显示最近 10 条脱敏阅读摘要，提供"查看全部"和"清空历史"入口。
   */
  function renderHistoryPanel(homeEl) {
    var existing = document.getElementById("history-panel");
    if (existing) existing.remove();
    if (!window.HistoryStore) return;

    var panel = document.createElement("div");
    panel.id = "history-panel";
    panel.className = "card";
    panel.style.marginTop = "16px";

    var history = HistoryStore.list();
    var favorites = HistoryStore.listFavorites();
    var preview = history.slice(0, 10);

    var historyHtml = preview.length ? preview.map(function (entry) {
      var tagsHtml = (entry.tags || []).slice(0, 4).map(function (t) {
        return "<span class=\"history-tag\">" + escapeHtml(t) + "</span>";
      }).join("");
      var favMark = entry.favorite ? "★" : "☆";
      return "<div class=\"history-entry\" data-id=\"" + escapeHtml(entry.id) + "\">" +
        "<div class=\"history-entry-head\"><span class=\"history-fav-btn\" data-id=\"" + escapeHtml(entry.id) + "\">" + favMark + "</span>" +
        "<strong>" + escapeHtml(entry.title) + "</strong>" +
        "<span class=\"history-module\">" + escapeHtml(entry.module) + "</span></div>" +
        "<p class=\"history-summary\">" + escapeHtml(entry.summary) + "</p>" +
        (tagsHtml ? "<div class=\"history-tags\">" + tagsHtml + "</div>" : "") +
        "<span class=\"history-time\">" + escapeHtml((entry.createdAt || "").slice(0, 16).replace("T", " ")) + "</span>" +
        "</div>";
    }).join("") : "<p style='color:#888;font-size:13px;'>暂无历史记录。生成命盘或起卦后将自动保存脱敏摘要。</p>";

    var favHtml = favorites.length ? "<span style='color:#666;font-size:12px;'>收藏 " + favorites.length + " 条</span>" : "";

    panel.innerHTML =
      "<div class=\"card-title\">📋 本地历史与收藏</div>" +
      "<p style='color:#666;font-size:12px;margin-bottom:10px;'>仅保存脱敏摘要，不保存完整姓名、完整出生日期或具体地点。最多保留 30 条。</p>" +
      "<div class=\"history-list\">" + historyHtml + "</div>" +
      "<div style='margin-top:10px;display:flex;gap:8px;align-items:center;'>" +
      favHtml +
      "<button id=\"history-clear-btn\" style='font-size:12px;padding:4px 10px;background:#f5f5f0;border:1px solid #ddd;border-radius:4px;cursor:pointer;color:#666;'>清空历史</button>" +
      "<button id=\"history-clear-fav-btn\" style='font-size:12px;padding:4px 10px;background:#f5f5f0;border:1px solid #ddd;border-radius:4px;cursor:pointer;color:#666;'>清空收藏</button>" +
      "</div>";

    homeEl.appendChild(panel);

    // 绑定收藏切换
    panel.querySelectorAll(".history-fav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        HistoryStore.toggleFavorite(id);
        renderHistoryPanel(homeEl);
      });
    });

    // 绑定清空按钮
    var clearBtn = document.getElementById("history-clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (confirm("确定清空全部历史记录？收藏不会删除。")) {
          HistoryStore.clear();
          renderHistoryPanel(homeEl);
        }
      });
    }
    var clearFavBtn = document.getElementById("history-clear-fav-btn");
    if (clearFavBtn) {
      clearFavBtn.addEventListener("click", function () {
        if (confirm("确定清空全部收藏？")) {
          HistoryStore.clearFavorites();
          renderHistoryPanel(homeEl);
        }
      });
    }
  }

  /**
   * 从当前数据生成 reading 并保存到历史。
   * 在 FORTUNE.onUpdate 中调用。
   */
  function saveReadingToHistory(data) {
    if (!window.HistoryStore || !window.EngineAdapterRegistry) return;
    if (!data || !data.birth) return;
    var adaptersWithReading = ["bazi", "yunqi", "meihua"];
    adaptersWithReading.forEach(function (adapterName) {
      try {
        var result = EngineAdapterRegistry.calculate(adapterName, { birth: data.birth });
        var reading = EngineAdapterRegistry.toReading(adapterName, result, { birth: data.birth });
        if (reading) {
          HistoryStore.add({
            module: adapterName,
            title: reading.title,
            summary: reading.summary,
            tags: reading.tags,
            mode: result.mode || "unknown"
          });
        }
      } catch (e) {
        // 静默忽略单个 adapter 失败
      }
    });
  }

  function wizardButton(title, tab, desc) {
    return "<button class=\"wizard-card\" data-wizard-tab=\"" + tab + "\"><b>" + title + "</b><span>" + desc + "</span></button>";
  }

  function bindWizardButtons() {
    document.querySelectorAll("[data-wizard-tab]").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-wizard-tab");
        if (typeof window.switchTab === "function") window.switchTab(tab);
      });
    });
  }

  /**
   * 咨询向导：引导用户选择问题类型，生成 toReading() 摘要，再跳转对应工具。
   */
  var WIZARD_ROUTES = {
    "健康养生": { adapters: ["yunqi"], tab: "yunqi", desc: "五运六气与体质偏向分析" },
    "事业决策": { adapters: ["bazi"], tab: "bazi", desc: "八字命盘与五行强弱分析" },
    "婚恋合婚": { adapters: ["bazi"], tab: "bazi", desc: "八字日主与十神关系分析" },
    "占卜决策": { adapters: ["meihua"], tab: "meihua", desc: "梅花易数时间起卦与体用生克" },
    "择居选址": { adapters: ["bazi"], tab: "fengshui", desc: "命卦与方位吉凶分析" },
    "综合咨询": { adapters: ["bazi", "yunqi", "meihua"], tab: "mermaid", desc: "多维度交叉分析" }
  };

  function openConsultationWizard(getData) {
    var existing = document.getElementById("wizard-modal");
    if (existing) existing.remove();
    var data = (typeof getData === "function") ? getData() : {};
    var birth = (data && data.birth) || {};

    var modal = document.createElement("div");
    modal.id = "wizard-modal";
    modal.innerHTML = "<div class='diag-overlay'></div><div class='diag-dialog wizard-dialog'>" +
      "<button class='diag-close' title='关闭'>×</button>" +
      "<h2>咨询向导</h2>" +
      "<p style='color:#666;font-size:13px;margin-bottom:14px;'>选择问题类型，生成结构化分析摘要。当前生辰：" + escapeHtml(String(birth.year || "YYYY")) + "年 " + escapeHtml(birth.gender || "NA") + "命。</p>" +
      "<div id='wizard-types' class='wizard-types'></div>" +
      "<div id='wizard-result'></div>" +
      "</div>";
    document.body.appendChild(modal);
    modal.querySelector(".diag-overlay").addEventListener("click", function () { modal.remove(); });
    modal.querySelector(".diag-close").addEventListener("click", function () { modal.remove(); });

    var typesContainer = modal.querySelector("#wizard-types");
    Object.keys(WIZARD_ROUTES).forEach(function (qType) {
      var route = WIZARD_ROUTES[qType];
      var btn = document.createElement("button");
      btn.className = "wizard-type-btn";
      btn.innerHTML = "<strong>" + escapeHtml(qType) + "</strong><span>" + escapeHtml(route.desc) + "</span>";
      btn.addEventListener("click", function () {
        renderWizardResult(modal, qType, route, data);
      });
      typesContainer.appendChild(btn);
    });
  }

  function renderWizardResult(modal, qType, route, data) {
    var resultEl = modal.querySelector("#wizard-result");
    if (!resultEl) return;
    var birth = (data && data.birth) || {};
    var readings = [];

    route.adapters.forEach(function (adapterName) {
      try {
        var result = EngineAdapterRegistry.calculate(adapterName, { birth: birth });
        var reading = EngineAdapterRegistry.toReading(adapterName, result, { birth: birth });
        if (reading) {
          readings.push({ adapter: adapterName, reading: reading, mode: result.mode });
        }
      } catch (e) {
        readings.push({ adapter: adapterName, error: e.message || String(e) });
      }
    });

    var html = "<div style='margin-top:16px;border-top:1px solid #eee;padding-top:14px;'>" +
      "<h3 style='color:#5D4037;'>" + escapeHtml(qType) + " · 分析摘要</h3>";

    readings.forEach(function (item) {
      if (item.error) {
        html += "<div class='wizard-reading-error'><strong>" + escapeHtml(item.adapter) + "</strong> 生成失败：" + escapeHtml(item.error) + "</div>";
        return;
      }
      var r = item.reading;
      html += "<div class='wizard-reading-card'>" +
        "<div class='wizard-reading-head'><strong>" + escapeHtml(r.title) + "</strong>" +
        "<span class='wizard-mode-pill' style='background:#f0f0e8;color:#666;font-size:11px;padding:2px 8px;border-radius:10px;'>" + escapeHtml(item.mode) + "</span></div>" +
        "<p style='color:#5D4037;font-size:13px;line-height:1.7;margin:6px 0;'>" + escapeHtml(r.summary) + "</p>";
      if (r.tags && r.tags.length) {
        html += "<div style='margin:4px 0;'>" + r.tags.map(function (t) {
          return "<span style='display:inline-block;background:#FAFAF7;border:1px solid #eee;border-radius:3px;padding:1px 6px;font-size:11px;color:#888;margin-right:4px;'>" + escapeHtml(t) + "</span>";
        }).join("") + "</div>";
      }
      if (r.sections && r.sections.length) {
        html += "<details style='margin-top:8px;'><summary style='cursor:pointer;font-size:12px;color:#999;'>详细分区（" + r.sections.length + "段）</summary><div style='padding:8px 0;'>";
        r.sections.forEach(function (sec) {
          html += "<div style='margin-bottom:6px;'><b style='color:#5D4037;'>" + escapeHtml(sec.heading) + "</b>：" + escapeHtml(sec.body) + "</div>";
        });
        html += "</div></details>";
      }
      html += "<p style='font-size:11px;color:#aaa;margin-top:6px;'>" + escapeHtml(r.sourceNotes) + "</p>";
      html += "</div>";
    });

    // 保存到历史
    readings.forEach(function (item) {
      if (!item.reading || !window.HistoryStore) return;
      HistoryStore.add({
        module: item.adapter,
        title: item.reading.title,
        summary: item.reading.summary,
        tags: item.reading.tags,
        mode: item.mode || "unknown"
      });
    });

    html += "<div style='margin-top:14px;display:flex;gap:8px;'>" +
      "<button id='wizard-goto-tab' class='wizard-action-btn'>进入" + escapeHtml(route.tab) + "工具页</button>" +
      "<button id='wizard-close' class='wizard-action-btn'>关闭向导</button>" +
      "</div>";

    resultEl.innerHTML = html + "</div>";

    var gotoBtn = resultEl.querySelector("#wizard-goto-tab");
    if (gotoBtn) gotoBtn.addEventListener("click", function () {
      modal.remove();
      if (typeof window.switchTab === "function") window.switchTab(route.tab);
    });
    var closeBtn = resultEl.querySelector("#wizard-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { modal.remove(); });
  }

  function openDiagnostics(data) {
    data = data || {};
    var existing = document.getElementById("diagnostics-modal");
    if (existing) existing.remove();
    var caps = getCapabilities();
    var rows = Object.keys(caps).map(function (k) {
      return "<tr><td>" + caps[k].label + "</td><td>" + caps[k].modeLabel + "</td><td>" + caps[k].note + "</td></tr>";
    }).join("");
    var modal = document.createElement("div");
    modal.id = "diagnostics-modal";
    modal.innerHTML =
      "<div class=\"diag-overlay\"></div><div class=\"diag-dialog\">" +
      "<button class=\"diag-close\" title=\"关闭\">×</button>" +
      "<h2>开发者诊断</h2>" +
      "<p>浏览器：" + escapeHtml(navigator.userAgent) + "</p>" +
      "<p>Mermaid：" + (window.mermaid ? "已加载" : "未加载/离线降级") + "；BaziEngine：" + (window.BaziEngine ? "可用" : "不可用") + "；YunqiEngine：" + (window.YunqiEngine ? "可用" : "不可用") + "</p>" +
      "<p>当前数据：" + (data && data.birth ? data.birth.year + " 年，" + data.birth.gender : "尚未初始化") + "</p>" +
      "<table><thead><tr><th>模块</th><th>能力</th><th>说明</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<p><a href=\"test-runner.html\" target=\"_blank\">打开自动化测试套件</a></p>" +
      "</div>";
    document.body.appendChild(modal);
    modal.querySelector(".diag-overlay").addEventListener("click", function () { modal.remove(); });
    modal.querySelector(".diag-close").addEventListener("click", function () { modal.remove(); });
  }

  function showCitation(title, body, source, x, y) {
    var popup = document.getElementById("cite-popup");
    var titleEl = document.getElementById("cite-popup-title");
    var bodyEl = document.getElementById("cite-popup-body");
    var srcEl = document.getElementById("cite-popup-source");
    if (!popup || !titleEl || !bodyEl || !srcEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    srcEl.textContent = source;
    popup.style.display = "block";
    popup.style.left = Math.max(4, Math.min(x || 20, window.innerWidth - 380)) + "px";
    popup.style.top = Math.max(4, Math.min(y || 20, window.innerHeight - 220)) + "px";
  }

  function init(getData) {
    renderCapabilityBadges();
    renderHomeEnhancements(getData || function () { return null; });
    bindWizardButtons();
  }

  window.CapabilityRegistry = {
    version: REPORT_DATA_VERSION,
    capabilities: CAPABILITIES,
    get adapters() { return window.EngineAdapterRegistry ? EngineAdapterRegistry.getAll() : {}; },
    modeLabels: MODE_LABELS,
    getCapabilities: getCapabilities,
    validateBirthInput: validateBirthInput,
    exportReportData: exportReportData,
    downloadReport: downloadReport,
    downloadCaseDraft: downloadCaseDraft,
    showCitation: showCitation,
    saveReadingToHistory: saveReadingToHistory,
    openConsultationWizard: openConsultationWizard,
    refreshHistoryPanel: function () { var home = document.getElementById("tab-home"); if (home) renderHistoryPanel(home); },
    init: init
  };
})();
