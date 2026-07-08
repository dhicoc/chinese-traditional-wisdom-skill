/**
 * health.js — 五运六气 & 中医体质 可视化模块
 * 绘制五运六气 (Wuyun Liuqi) 图表和九种体质雷达图
 * 依赖 core.js 的 CORE 全局对象
 *
 * 注册:
 *   registerVizModule("health", { renderYunqi: yunqiRender, renderConstitution: constitutionRender })
 *
 * 使用:
 *   yunqiRender("canvasId", yunqiData)                  — 绘制五运六气
 *   constitutionRender("canvasId", constitutionData)      — 绘制九种体质雷达图
 */
(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════
  //  常量
  // ═══════════════════════════════════════════════════════

  /** 六气 → 颜色映射 */
  var QI_COLORS = {
    "厥阴风木": "#4CAF50",
    "少阴君火": "#F44336",
    "少阳相火": "#B71C1C",
    "太阴湿土": "#FF9800",
    "阳明燥金": "#9E9E9E",
    "太阳寒水": "#2196F3"
  };

  var QI_COLORS_LIGHT = {
    "厥阴风木": "#E8F5E9",
    "少阴君火": "#FFEBEE",
    "少阳相火": "#FFCDD2",
    "太阴湿土": "#FFF3E0",
    "阳明燥金": "#F5F5F5",
    "太阳寒水": "#E3F2FD"
  };

  /** 九种体质固定顺序 */
  var CONSTITUTION_ORDER = [
    "平和质", "气虚质", "阳虚质", "阴虚质", "痰湿质",
    "湿热质", "血瘀质", "气郁质", "特禀质"
  ];

  /** 绿色系渐变配色（由深到浅） */
  var CONSTITUTION_COLORS = [
    "#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#4CAF50",
    "#66BB6A", "#81C784", "#A5D6A7", "#C8E6C9"
  ];

  var CONSTITUTION_COLOR_MAIN = "#2E7D32";
  var CONSTITUTION_COLOR_LIGHT = "#E8F5E9";
  var CONSTITUTION_COLOR_FILL = "rgba(46,125,50,0.15)";
  var CONSTITUTION_COLOR_STROKE = "#2E7D32";

  /** 六气 → 五行归类（用于图例） */
  var QI_WUXING_MAP = {
    "厥阴风木": "木", "少阴君火": "火", "少阳相火": "火",
    "太阴湿土": "土", "阳明燥金": "金", "太阳寒水": "水"
  };

  var QI_WUXING_ORDER = ["风", "寒", "暑", "湿", "燥", "火"];
  var QI_WUXING_COLORS = {
    "风": "#4CAF50", "寒": "#2196F3", "暑": "#F44336",
    "湿": "#FF9800", "燥": "#9E9E9E", "火": "#B71C1C"
  };

  // ═══════════════════════════════════════════════════════
  //  辅助函数
  // ═══════════════════════════════════════════════════════

  /** 从岁运名称中提取五行（如 "水运太过" → "水"） */
  function extractWuxing(dayun) {
    var chars = ["金", "木", "水", "火", "土"];
    for (var i = 0; i < chars.length; i++) {
      if (dayun.indexOf(chars[i]) !== -1) return chars[i];
    }
    return "土";
  }

  /** 获取六气颜色 */
  function qiColor(qi, light) {
    var c = light ? QI_COLORS_LIGHT[qi] : QI_COLORS[qi];
    return c || (light ? "#F5F5F5" : "#9E9E9E");
  }

  /** 将角度转换为弧度 */
  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  /** 绘制实心圆 */
  function fillCircle(ctx, x, y, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /** 绘制空心圆 */
  function strokeCircle(ctx, x, y, r, color, lw) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
    ctx.restore();
  }

  /** 绘制五角星 */
  function drawStar(ctx, cx, cy, outerR, innerR, color) {
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var angle = degToRad(i * 36 - 90);
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }


  // ═══════════════════════════════════════════════════════
  //  五运六气 渲染
  // ═══════════════════════════════════════════════════════

  /**
   * 绘制五运六气综合图表
   * @param {string} canvasId - Canvas 元素 ID
   * @param {Object} data     - 五运六气数据
   *
   * data 结构:
   * {
   *   year: 2026,
   *   tiangan: "丙", dizhi: "午",
   *   wuyun: {
   *     dayun: "水运太过",
   *     zhuyun: ["木","火","土","金","水"],
   *     keyun:  ["水","火","土","金","木"]
   *   },
   *   liuqi: {
   *     sitian: "少阴君火",
   *     zaiquan: "阳明燥金",
   *     zhuke: [
   *       {step:"初之气", qi:"太阳寒水", start:"大寒", end:"春分"},
   *       ...
   *     ]
   *   },
   *   disease_tendency: "心脑血管疾病、热证"
   * }
   */
  function yunqiRender(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var W = 550, H = 450;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    CORE.clearCanvas(canvas);

    var year = data.year;
    var tiangan = data.tiangan;
    var dizhi = data.dizhi;
    var wuyun = data.wuyun;
    var liuqi = data.liuqi;
    var diseaseTendency = data.disease_tendency || "";

    // 按「，」断点对病势倾向文字做换行，使每行宽度不超过 maxW。
    // 优先以「，」切分；单段仍超宽时按字符硬折行兜底。
    function wrapTendencyLines(ctx, text, maxW) {
      var segs = text.split("，");
      var lines = [];
      var cur = "";
      for (var si = 0; si < segs.length; si++) {
        var seg = segs[si];
        var candidate = cur ? cur + "，" + seg : seg;
        if (ctx.measureText(candidate).width <= maxW || !cur) {
          cur = candidate;
        } else {
          lines.push(cur);
          cur = seg;
        }
      }
      if (cur) lines.push(cur);
      // 单段超宽的兜底硬折行
      var finalLines = [];
      for (var fi = 0; fi < lines.length; fi++) {
        var line = lines[fi];
        if (ctx.measureText(line).width <= maxW) {
          finalLines.push(line);
          continue;
        }
        var buf = "";
        for (var ci = 0; ci < line.length; ci++) {
          var test = buf + line[ci];
          if (ctx.measureText(test).width <= maxW) {
            buf = test;
          } else {
            if (buf) finalLines.push(buf);
            buf = line[ci];
          }
        }
        if (buf) finalLines.push(buf);
      }
      return finalLines;
    }

    // ── 背景 ──
    ctx.save();
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#FDF8F0");
    bgGrad.addColorStop(0.4, "#F9F0DA");
    bgGrad.addColorStop(1, "#F0E3CA");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 外框
    CORE.drawRoundRect(ctx, 3, 3, W - 6, H - 6, 10, "transparent", "#D4C5A9", 1);

    // ══════════════════════════════════════════════════════
    //  1. 岁运区 (顶部)
    // ══════════════════════════════════════════════════════

    // ── 标题栏 ──
    var titleGrad = ctx.createLinearGradient(0, 0, W, 0);
    titleGrad.addColorStop(0, "#5D4037");
    titleGrad.addColorStop(0.5, "#795548");
    titleGrad.addColorStop(1, "#5D4037");
    CORE.drawRoundRect(ctx, 3, 3, W - 6, 34, 10, titleGrad, "#4E342E", 1);
    // 修正顶部圆角（底部直角）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(3 + 10, 3 + 34);
    ctx.lineTo(3, 3 + 34);
    ctx.lineTo(3, 3 + 10);
    ctx.quadraticCurveTo(3, 3, 3 + 10, 3);
    ctx.lineTo(W - 3 - 10, 3);
    ctx.quadraticCurveTo(W - 3, 3, W - 3, 3 + 10);
    ctx.lineTo(W - 3, 3 + 34);
    ctx.lineTo(3 + 10, 3 + 34);
    ctx.closePath();
    ctx.fillStyle = titleGrad;
    ctx.fill();
    ctx.strokeStyle = "#4E342E";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    CORE.drawCenterText(ctx, "五运六气 · " + year + "年", W / 2, 20, {
      size: 15, color: "#FFF", bold: true
    });

    // 病势倾向标签不再放在标题栏右上角——disease_tendency 由岁运与司天
    // 两条倾向拼接，文字较长时会向左延伸并覆盖居中的「五运六气 · 年」标题。
    // 改为在客气六步时间线下方独立一行展示（见下方病势倾向总结行）。

    // ── 天干+地支 大字 ──
    var yearChars = tiangan + dizhi;
    CORE.drawCenterText(ctx, yearChars, W / 2, 70, {
      size: 42, color: "#4E342E", bold: true,
      family: '"Noto Serif SC","SimSun","KaiTi",serif'
    });

    // ── 岁运信息胶囊框 ──
    var dayunWx = extractWuxing(wuyun.dayun);
    var wxColor = CORE.getWuxingColor(dayunWx);
    var wxLight = CORE.getWuxingColor(dayunWx, "light");

    var boxW = 210, boxH = 30;
    var boxX = (W - boxW) / 2;
    var boxY = 90;
    CORE.drawRoundRect(ctx, boxX, boxY, boxW, boxH, 15, wxLight, wxColor, 1.5);
    CORE.drawCenterText(ctx, yearChars + "  " + wuyun.dayun, W / 2, boxY + boxH / 2, {
      size: 13, color: wxColor, bold: true
    });

    // ══════════════════════════════════════════════════════
    //  2. 司天在泉 (中部)
    // ══════════════════════════════════════════════════════

    // ── 分隔虚线 ──
    ctx.save();
    ctx.strokeStyle = "#D4C5A9";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(30, 126);
    ctx.lineTo(W - 30, 126);
    ctx.stroke();
    ctx.restore();

    // ── 区域标签 ──
    CORE.drawCenterText(ctx, "司天 · 在泉", W / 2, 138, {
      size: 10, color: "#A1887F"
    });

    var bxW = 180, bxH = 28;
    var cx = W / 2;
    var stY = 150;   // 司天 y
    var zqY = 198;   // 在泉 y

    // 司天 box
    CORE.drawRoundRect(ctx, cx - bxW / 2, stY, bxW, bxH, 6, "#FFF", "#E53935", 1.5);
    CORE.drawCenterText(ctx, "司天  " + liuqi.sitian, cx, stY + bxH / 2, {
      size: 12, color: "#C62828", bold: true
    });

    // 箭头（司天 → 在泉）
    CORE.drawArrow(ctx, cx, stY + bxH, cx, zqY, "#E53935", 1.5);

    // 在泉 box
    CORE.drawRoundRect(ctx, cx - bxW / 2, zqY, bxW, bxH, 6, "#FFF", "#F57C00", 1.5);
    CORE.drawCenterText(ctx, "在泉  " + liuqi.zaiquan, cx, zqY + bxH / 2, {
      size: 12, color: "#E65100", bold: true
    });

    // ══════════════════════════════════════════════════════
    //  3. 客气六步时间线 (底部)
    // ══════════════════════════════════════════════════════

    // ── 分隔虚线 ──
    ctx.save();
    ctx.strokeStyle = "#D4C5A9";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(30, 234);
    ctx.lineTo(W - 30, 234);
    ctx.stroke();
    ctx.restore();

    CORE.drawCenterText(ctx, "客气六步", W / 2, 246, {
      size: 10, color: "#A1887F"
    });

    var steps = liuqi.zhuke;
    if (steps && steps.length > 0) {
      var segX = 20;
      var segTotalW = W - 40;
      var segGap = 4;
      var segCount = steps.length;
      var segW = (segTotalW - (segCount - 1) * segGap) / segCount;
      var segY = 258;
      var segH = 115;

      for (var i = 0; i < segCount; i++) {
        var step = steps[i];
        var sX = segX + i * (segW + segGap);
        var qiName = step.qi;
        var fullColor = qiColor(qiName, false);
        var lightColor = qiColor(qiName, true);
        var isDark = (qiName === "少阳相火" || qiName === "少阴君火");

        // 外阴影
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.06)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        // 主背景（浅色）
        CORE.drawRoundRect(ctx, sX, segY, segW, segH, 6, lightColor, fullColor, 1.5);
        ctx.restore();

        // 顶部彩色横条
        ctx.save();
        var barH = 6;
        CORE.drawRoundRect(ctx, sX + 1, segY + 1, segW - 2, barH, 3, fullColor, "none");
        ctx.restore();

        // Qi 名称（加粗，彩色）
        CORE.drawCenterText(ctx, qiName, sX + segW / 2, segY + 32, {
          size: 11, color: fullColor, bold: true
        });

        // 五行小标签（风/寒/暑/湿/燥/火）
        var wxLabel = QI_WUXING_MAP[qiName] || "";
        if (wxLabel) {
          CORE.drawCenterText(ctx, "[" + wxLabel + "]", sX + segW / 2, segY + 48, {
            size: 8, color: fullColor
          });
        }

        // 步名
        CORE.drawCenterText(ctx, step.step, sX + segW / 2, segY + 64, {
          size: 10, color: "#666"
        });

        // 节气范围
        CORE.drawCenterText(ctx, step.start + "→" + step.end, sX + segW / 2, segY + 80, {
          size: 8, color: "#999"
        });

        // 底部小圆点
        fillCircle(ctx, sX + segW / 2, segY + segH - 12, 3, fullColor);
      }
    }

    // ══════════════════════════════════════════════════════
    //  4. 病势倾向总结行 (客气六步与图例之间)
    // ══════════════════════════════════════════════════════
    if (diseaseTendency) {
      var tendH = 22;
      var tendY = 388;            // 客气六步底边 ~373 之下、图例 420 之上的空隙
      // 框宽须按实际绘制字体（size 10 bold）量取完整文字（含「病势倾向  」前缀），
      // 否则前缀未计入、字体不匹配，会导致文字溢出框外。
      var tendText = "病势倾向  " + diseaseTendency;
      ctx.save();
      ctx.font = "bold 10px \"Noto Sans SC\",\"Microsoft YaHei\",sans-serif";
      var tendW = ctx.measureText(tendText).width + 24;
      ctx.restore();
      var tendMaxW = W - 40;
      if (tendW > tendMaxW) {
        // 超宽时换行：按「，」切分，逐行绘制，框高随行数自适应。
        var lines = wrapTendencyLines(ctx, tendText, tendMaxW - 24);
        var lineH = 14;
        tendH = lines.length * lineH + 10;
        tendW = tendMaxW;
        var tendX = (W - tendW) / 2;
        CORE.drawRoundRect(ctx, tendX, tendY, tendW, tendH, 11, "#FFF3E0", "#E65100", 1);
        for (var li = 0; li < lines.length; li++) {
          CORE.drawCenterText(ctx, lines[li], W / 2, tendY + 10 + li * lineH, {
            size: 10, color: "#BF360C", bold: true, baseline: "top"
          });
        }
      } else {
        var tendX2 = (W - tendW) / 2;
        CORE.drawRoundRect(ctx, tendX2, tendY, tendW, tendH, 11, "#FFF3E0", "#E65100", 1);
        CORE.drawCenterText(ctx, tendText, W / 2, tendY + tendH / 2, {
          size: 10, color: "#BF360C", bold: true
        });
      }
    }

    // ══════════════════════════════════════════════════════
    //  5. 图例 (底部)
    // ══════════════════════════════════════════════════════

    var legendY = 420;
    var legendSpacing = 62;
    var legendCount = QI_WUXING_ORDER.length;
    var legendTotalW = legendCount * legendSpacing;
    var legendStartX = (W - legendTotalW) / 2 + legendSpacing / 2;

    for (var li = 0; li < legendCount; li++) {
      var lx = legendStartX + li * legendSpacing;
      var label = QI_WUXING_ORDER[li];
      var lColor = QI_WUXING_COLORS[label];

      // 圆点
      fillCircle(ctx, lx - 14, legendY, 4, lColor);

      // 标签
      CORE.drawCenterText(ctx, label, lx, legendY, {
        size: 9, color: "#999"
      });
    }
  }


  // ═══════════════════════════════════════════════════════
  //  九种体质雷达图 渲染
  // ═══════════════════════════════════════════════════════

  /**
   * 绘制九种体质雷达图
   * @param {string} canvasId - Canvas 元素 ID
   * @param {Object} data     - 体质数据
   *
   * data 结构:
   * {
   *   scores: {
   *     "平和质": 65, "气虚质": 45, "阳虚质": 30,
   *     "阴虚质": 25, "痰湿质": 50, "湿热质": 35,
   *     "血瘀质": 20, "气郁质": 40, "特禀质": 15
   *   },
   *   dominant: "痰湿质"
   * }
   */
  function constitutionRender(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var W = 400, H = 400;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    CORE.clearCanvas(canvas);

    var scores = data.scores || {};
    var dominant = data.dominant || "";

    // ── 解析分数 ──
    var values = [];
    var hasData = false;
    for (var i = 0; i < CONSTITUTION_ORDER.length; i++) {
      var type = CONSTITUTION_ORDER[i];
      var val = scores[type];
      if (val === undefined || val === null) val = 0;
      val = Math.max(0, Math.min(100, val));
      if (val > 0) hasData = true;
      values.push({
        type: type,
        score: val,
        isDominant: type === dominant
      });
    }

    // ── 背景 ──
    ctx.save();
    ctx.fillStyle = "#FAFAF5";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 外框
    CORE.drawRoundRect(ctx, 3, 3, W - 6, H - 6, 8, "transparent", "#E0E0D8", 1);

    // ── 标题 ──
    var titleY = 24;
    var titleText = dominant
      ? "主要体质: " + dominant
      : "九种体质分析";

    // 标题底色
    CORE.drawRoundRect(ctx, 40, titleY - 12, W - 80, 24, 12, CONSTITUTION_COLOR_LIGHT, CONSTITUTION_COLOR_MAIN, 1);

    CORE.drawCenterText(ctx, titleText, W / 2, titleY, {
      size: 13, color: CONSTITUTION_COLOR_MAIN, bold: true
    });

    // ── 雷达图参数 ──
    var cx = W / 2;
    var cy = H / 2 + 16;
    var maxR = 130;
    var axisCount = CONSTITUTION_ORDER.length;
    var angleStep = 360 / axisCount;

    // 起始角度：从正上方开始（-90度）
    var startAngle = -90;

    // ── 绘制同心环 (25, 50, 75, 100) ──
    var ringLevels = [25, 50, 75, 100];
    for (var ri = 0; ri < ringLevels.length; ri++) {
      var r = maxR * ringLevels[ri] / 100;
      ctx.save();
      ctx.strokeStyle = ri === ringLevels.length - 1 ? "#C8E6C9" : "#E8F0E8";
      ctx.lineWidth = ri === ringLevels.length - 1 ? 1.2 : 0.8;
      ctx.setLineDash(ri === ringLevels.length - 1 ? [] : [2, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 环刻度标签
      if (ri > 0 || true) {
        CORE.drawCenterText(ctx, String(ringLevels[ri]), cx + r + 4, cy, {
          size: 8, color: "#BBB"
        });
      }
    }

    // 中心小点
    fillCircle(ctx, cx, cy, 2, "#CCC");

    // ── 计算各轴端点坐标 ──
    var axisEndpoints = [];
    for (var ai = 0; ai < axisCount; ai++) {
      var angle = degToRad(startAngle + ai * angleStep);
      axisEndpoints.push({
        x: cx + maxR * Math.cos(angle),
        y: cy + maxR * Math.sin(angle),
        angle: angle,
        deg: startAngle + ai * angleStep,
        type: CONSTITUTION_ORDER[ai]
      });
    }

    // ── 绘制轴线 ──
    ctx.save();
    ctx.strokeStyle = "#E0E8E0";
    ctx.lineWidth = 0.8;
    for (var li = 0; li < axisEndpoints.length; li++) {
      var ep = axisEndpoints[li];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ep.x, ep.y);
      ctx.stroke();
    }
    ctx.restore();

    // ── 绘制数据多边形 ──
    var dataPoints = [];
    for (var di = 0; di < axisCount; di++) {
      var val = values[di];
      var ap = axisEndpoints[di];
      var ratio = val.score / 100;
      dataPoints.push({
        x: cx + maxR * ratio * Math.cos(ap.angle),
        y: cy + maxR * ratio * Math.sin(ap.angle),
        score: val.score,
        type: val.type,
        isDominant: val.isDominant
      });
    }

    // 填充多边形
    if (hasData) {
      ctx.save();
      ctx.beginPath();
      for (var pi = 0; pi < dataPoints.length; pi++) {
        var dp = dataPoints[pi];
        if (pi === 0) ctx.moveTo(dp.x, dp.y);
        else ctx.lineTo(dp.x, dp.y);
      }
      ctx.closePath();
      ctx.fillStyle = CONSTITUTION_COLOR_FILL;
      ctx.fill();
      ctx.strokeStyle = CONSTITUTION_COLOR_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ── 绘制轴标签（体质名称） ──
    for (var ti = 0; ti < axisEndpoints.length; ti++) {
      var tep = axisEndpoints[ti];
      var tv = values[ti];
      var labelAngle = tep.deg;
      var labelR = maxR + 20;

      // 根据角度调整标签位置
      var lx = cx + labelR * Math.cos(tep.angle);
      var ly = cy + labelR * Math.sin(tep.angle);

      // 文字对齐方式
      var align = "center";
      var baseline = "middle";
      if (labelAngle > -100 && labelAngle < -80) {
        // 正上方
        align = "center";
        baseline = "bottom";
      } else if (labelAngle > 80 && labelAngle < 100) {
        // 正下方
        align = "center";
        baseline = "top";
      } else if (labelAngle > -180 && labelAngle < 0) {
        // 上半部分
        baseline = "bottom";
      } else {
        // 下半部分
        baseline = "top";
      }
      if (labelAngle > 10 && labelAngle < 170) {
        align = "left";
      } else if (labelAngle > -170 && labelAngle < -10) {
        align = "right";
      }

      // 标签文字
      ctx.save();
      var isDom = tv.isDominant;
      ctx.font = (isDom ? "bold " : "") + "10px \"Noto Sans SC\",\"Microsoft YaHei\",sans-serif";
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillStyle = isDom ? CONSTITUTION_COLOR_MAIN : "#666";
      ctx.fillText(tv.type, lx, ly);
      ctx.restore();
    }

    // ── 绘制数据点 ──
    for (var si = 0; si < dataPoints.length; si++) {
      var sdp = dataPoints[si];
      if (sdp.score <= 0) continue;

      var ptColor = sdp.isDominant ? "#FFD600" : CONSTITUTION_COLOR_MAIN;
      var ptR = sdp.isDominant ? 6 : 3.5;

      // 数据点
      fillCircle(ctx, sdp.x, sdp.y, ptR, ptColor);

      // 外圈描边（dominant 加重）
      if (sdp.isDominant) {
        strokeCircle(ctx, sdp.x, sdp.y, ptR + 3, "rgba(255,214,0,0.4)", 2);
      }

      // 分数标签
      var scoreAngle = axisEndpoints[si].deg;
      var scoreOffset = sdp.isDominant ? 14 : 10;
      var sx = sdp.x + scoreOffset * Math.cos(axisEndpoints[si].angle);
      var sy = sdp.y + scoreOffset * Math.sin(axisEndpoints[si].angle);

      ctx.save();
      ctx.font = (sdp.isDominant ? "bold " : "") + "9px \"Noto Sans SC\",\"Microsoft YaHei\",sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = sdp.isDominant ? "#1B5E20" : "#888";
      ctx.fillText(String(sdp.score), sx, sy);
      ctx.restore();
    }

    // ── 如果主要体质存在，额外标记 ⭑ ──
    if (dominant) {
      var dominantIndex = CONSTITUTION_ORDER.indexOf(dominant);
      if (dominantIndex >= 0 && dataPoints[dominantIndex]) {
        var dd = dataPoints[dominantIndex];
        // 在大圆点上方画一个星标
        var starX = dd.x;
        var starY = dd.y - 16;
        drawStar(ctx, starX, starY, 7, 3, "#FFD600");
      }
    }

    // ── 右下角评分参考 ──
    CORE.drawCenterText(ctx, "评分: 0-100", W - 12, H - 10, {
      size: 8, color: "#CCC", align: "right"
    });
  }


  // ═══════════════════════════════════════════════════════
  //  鼠标悬停解释
  // ═══════════════════════════════════════════════════════

  function yunqiHitTest(mx, my, data) {
    var W = 550;
    // 岁运区：天干地支大字 (y~70)
    if (my >= 55 && my <= 85 && mx >= W/2 - 40 && mx <= W/2 + 40) {
      if (mx < W/2) return { term: data.tiangan };
      else return { term: data.dizhi };
    }
    // 岁运信息框 (y~90, boxH=30)
    if (my >= 90 && my <= 120) {
      return { term: "岁运", explanation: "<b>岁运</b>：" + data.wuyun.dayun + "。<br>" + (CORE.explain("岁运") || "") };
    }
    // 司天 (y~150)
    if (my >= 148 && my <= 180) {
      return { term: "司天", explanation: "<b>司天</b>：" + (data.liuqi.sitian || "") + "。<br>" + (CORE.explain("司天") || "") };
    }
    // 在泉 (y~198)
    if (my >= 196 && my <= 228) {
      return { term: "在泉", explanation: "<b>在泉</b>：" + (data.liuqi.zaiquan || "") + "。<br>" + (CORE.explain("在泉") || "") };
    }
    // 客气六步 (segY=258, segH=115)
    if (my >= 255 && my <= 375) {
      var steps = data.liuqi.zhuke || [];
      if (steps.length > 0) {
        var segX = 20, segTotalW = W - 40, segGap = 4;
        var segW = (segTotalW - (steps.length - 1) * segGap) / steps.length;
        var idx = Math.floor((mx - segX) / (segW + segGap));
        if (idx >= 0 && idx < steps.length) {
          var step = steps[idx];
          return { term: step.qi, explanation: "<b>" + step.step + "</b>：" + step.qi + "（" + step.start + "→" + step.end + "）" };
        }
      }
    }
    return null;
  }

  function constitutionHitTest(mx, my, data) {
    var cx = 200, cy = 216, maxR = 130;
    var startAngle = -90, axisCount = 9, angleStep = 360 / axisCount;
    var scores = data.scores || {};
    // 检测靠近哪个轴端点
    for (var i = 0; i < axisCount; i++) {
      var angle = degToRad(startAngle + i * angleStep);
      var ax = cx + maxR * Math.cos(angle);
      var ay = cy + maxR * Math.sin(angle);
      var dist = Math.sqrt((mx - ax) * (mx - ax) + (my - ay) * (my - ay));
      if (dist < 20) {
        var type = CONSTITUTION_ORDER[i];
        var val = scores[type] || 0;
        return { term: type, explanation: "<b>" + type + "</b>：评分 " + val + " 分。" + (CORE.explain(type) || "") };
      }
      // 也检测数据点位置
      var ratio = (scores[type] || 0) / 100;
      var dpx = cx + maxR * ratio * Math.cos(angle);
      var dpy = cy + maxR * ratio * Math.sin(angle);
      var dpDist = Math.sqrt((mx - dpx) * (mx - dpx) + (my - dpy) * (my - dpy));
      if (dpDist < 12 && ratio > 0) {
        return { term: type, explanation: "<b>" + type + "</b>：评分 " + (scores[type] || 0) + " 分。" + (CORE.explain(type) || "") };
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════
  //  模块注册
  // ═══════════════════════════════════════════════════════
  registerVizModule("health", {
    renderYunqi: function(canvasId, data) {
      yunqiRender(canvasId, data);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return yunqiHitTest(mx, my, data);
      });
    },
    renderConstitution: function(canvasId, data) {
      constitutionRender(canvasId, data);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return constitutionHitTest(mx, my, data);
      });
    }
  });

})();
