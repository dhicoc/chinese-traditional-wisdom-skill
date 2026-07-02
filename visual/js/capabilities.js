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
      mode: "local-approx",
      modeLabel: "本地近似计算",
      note: "纯 JS 计算四柱、藏干、十神、五行和大运；月柱用近似节气，起运按 3 岁简化。"
    },
    ziwei: {
      label: "紫微斗数",
      mode: "demo",
      modeLabel: "演示数据",
      note: "当前 Dashboard 仅展示十二宫可视化结构；严肃排盘需接入 iztro/iztro-py。"
    },
    liuyao: {
      label: "六爻占卜",
      mode: "demo",
      modeLabel: "演示数据",
      note: "当前 Dashboard 展示卦象渲染格式；真实纳甲起卦需接入 ichingshifa。"
    },
    meihua: {
      label: "梅花易数",
      mode: "demo",
      modeLabel: "演示数据",
      note: "当前 Dashboard 展示体用生克图；真实起卦需按 bootstrap 指南接入。"
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
      mode: "local-approx",
      modeLabel: "本地近似计算",
      note: "按年干支推算岁运、司天在泉、客气六步；暂未接入精确大寒节气表。"
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
    "local-approx": "本地近似计算",
    demo: "演示数据",
    knowledge: "知识/映射",
    derived: "推导数据",
    "optional-cdn": "可选 CDN"
  };

  var MODE_COLORS = {
    local: "#2E7D32",
    "local-approx": "#B26A00",
    demo: "#8D3DAF",
    knowledge: "#1565C0",
    derived: "#5D4037",
    "optional-cdn": "#6D4C41"
  };

  var EngineAdapters = {
    bazi: {
      engineName: "BaziEngine",
      mode: "local-approx",
      inputSchema: "year/month/day/hour/gender/isLunar",
      confidenceNote: CAPABILITIES.bazi.note,
      calculate: function (input) { return window.BaziEngine.calculate(input); },
      toRenderData: function (result) { return window.BaziEngine.getRenderData(result); }
    },
    yunqi: {
      engineName: "YunqiEngine",
      mode: "local-approx",
      inputSchema: "year",
      confidenceNote: CAPABILITIES.yunqi.note,
      calculate: function (input) { return window.YunqiEngine.calculate(input.year || input); },
      toRenderData: function (result) { return result; }
    },
    ziwei: {
      engineName: "iztro/iztro-py",
      mode: "external-required",
      inputSchema: "year/month/day/hour/gender/lunar",
      confidenceNote: "Dashboard 中为演示数据；真实排盘需外部引擎。"
    },
    liuyao: {
      engineName: "ichingshifa",
      mode: "external-required",
      inputSchema: "question/method/time-or-coins",
      confidenceNote: "Dashboard 中为演示数据；真实起卦需外部引擎。"
    },
    meihua: {
      engineName: "meihua-yishu",
      mode: "external-required",
      inputSchema: "time/number/object/sound/direction",
      confidenceNote: "Dashboard 中为演示数据；真实起卦需外部引擎或手工规则。"
    }
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
      value: { year: y, month: m, day: d, hour: h, gender: gender || "男", isLunar: !!input.isLunar }
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
      ziwei: data.ziwei || null,
      liuyao: data.divination && data.divination.liuyao ? data.divination.liuyao : null,
      meihua: data.divination && data.divination.meihua ? data.divination.meihua : null,
      feixing: birth.year ? { year: birth.year } : null,
      bazhai: data.fengshui ? { year: birth.year, gender: birth.gender, mingGua: data.fengshui.mingGua } : null,
      yunqi: data.yunqi || null,
      constitution: data.constitution || null
    };
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
    return "<!DOCTYPE html>\n" +
      "<html lang=\"zh-CN\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
      "<title>" + title + "</title><style>" +
      "body{font-family:'Microsoft YaHei',sans-serif;background:#F5F0EB;color:#2C1810;padding:24px;}" +
      ".wrap{max-width:860px;margin:0 auto}.card{background:#fff;border:1px solid #EFEBE6;border-radius:8px;padding:18px;margin:14px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}" +
      "h1{font-size:24px}h2{font-size:17px;color:#5D4037}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.item{background:#FAFAF7;border-left:3px solid #D4A017;padding:10px;border-radius:4px}pre{white-space:pre-wrap;background:#2C1810;color:#F5F0EB;padding:12px;border-radius:6px;overflow:auto}" +
      "</style></head><body><div class=\"wrap\">" +
      "<h1>" + title + "</h1><p>生成时间：" + reportData.generatedAt + "；脱敏标识：" + reportData.subject.label + "</p>" +
      "<div class=\"card\"><h2>能力说明</h2><p>" + notes.privacy + "</p><p>" + notes.bazi + "</p></div>" +
      "<div class=\"card\"><h2>八字四柱</h2><div class=\"grid\">" +
      ["年柱", "月柱", "日柱", "时柱"].map(function (name, i) {
        return "<div class=\"item\"><b>" + name + "</b><br>" + pillars[i] + "</div>";
      }).join("") + "</div></div>" +
      "<div class=\"card\"><h2>五行统计</h2><div class=\"grid\">" +
      ["木", "火", "土", "金", "水"].map(function (k) {
        return "<div class=\"item\"><b>" + k + "</b><br>" + (wx[k] == null ? "-" : wx[k]) + "</div>";
      }).join("") + "</div></div>" +
      "<div class=\"card\"><h2>完整 REPORT_DATA</h2><pre>" + escapeHtml(JSON.stringify(reportData, null, 2)) + "</pre></div>" +
      "</div></body></html>";
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
      "</div>";
    var grid = home.querySelector(".tool-grid");
    home.insertBefore(actions, grid || home.children[1]);
    document.getElementById("export-report-btn").addEventListener("click", function () { downloadReport(getData()); });
    document.getElementById("case-draft-btn").addEventListener("click", function () { downloadCaseDraft(getData()); });
    document.getElementById("diagnostics-btn").addEventListener("click", function () { openDiagnostics(getData()); });
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
    adapters: EngineAdapters,
    modeLabels: MODE_LABELS,
    getCapabilities: getCapabilities,
    validateBirthInput: validateBirthInput,
    exportReportData: exportReportData,
    downloadReport: downloadReport,
    downloadCaseDraft: downloadCaseDraft,
    showCitation: showCitation,
    init: init
  };
})();
