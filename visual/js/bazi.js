/**
 * bazi.js — 八字 (Four Pillars of Destiny) 可视化模块
 * 绘制四柱八字图表和五行平衡五芒星图
 * 依赖 core.js 的 CORE 全局对象
 *
 * 注册:
 *   registerVizModule("bazi", { render: baziRender, renderWuxing: baziWuxingChart })
 *
 * 使用:
 *   baziRender("canvasId", pillars)       — 绘制四柱八字
 *   baziWuxingChart("canvasId", stats)    — 绘制五行平衡五芒星
 */
(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════
  //  四柱八字渲染
  // ═══════════════════════════════════════════════════════

  /**
   * 绘制四柱八字图表
   * @param {string} canvasId - Canvas 元素 ID
   * @param {Object} pillars  - 四柱数据
   *
   * pillars 结构:
   * {
   *   year:   { stem: "甲", branch: "子", hidden: ["癸"] },
   *   month:  { stem: "丙", branch: "寅", hidden: ["甲","丙","戊"] },
   *   day:    { stem: "戊", branch: "午", hidden: ["丁","己"] },
   *   hour:   { stem: "庚", branch: "申", hidden: ["庚","壬","戊"] },
   *   dayMaster: "戊",
   *   gender: "男"
   * }
   */
  function baziRender(canvasId, pillars) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var W = 600, H = 400;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    CORE.clearCanvas(canvas);

    // ── 背景 ──
    ctx.save();
    var bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#050806");
    bgGrad.addColorStop(0.55, "#0B1510");
    bgGrad.addColorStop(1, "#160908");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(219,176,83,0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    ctx.restore();

    // ── 布局参数 ──
    var cellW = 108;
    var cellGap = 14;
    var stemH = 56;
    var branchH = 56;
    var hiddenH = 34;
    var colCount = 4;
    var totalW = colCount * cellW + (colCount - 1) * cellGap;
    var startX = (W - totalW) / 2;
    var startY = 38;

    var pillarList = [
      { label: "年", key: "year",   data: pillars.year },
      { label: "月", key: "month",  data: pillars.month },
      { label: "日", key: "day",    data: pillars.day,   isDay: true },
      { label: "时", key: "hour",   data: pillars.hour }
    ];

    // ── 标题 ──
    CORE.drawCenterText(ctx, "八字四柱", W / 2, 14, {
      size: 18, bold: true, color: "#EAD7A4"
    });

    // ── 逐柱绘制 ──
    pillarList.forEach(function (col, i) {
      var x = startX + i * (cellW + cellGap);
      var d = col.data;
      if (!d) return;

      var isDay = col.isDay;
      var stemWx = CORE.stemWuxing(d.stem);
      var stemColor = CORE.getWuxingColor(stemWx);
      var stemLight = CORE.getWuxingColor(stemWx, "light");

      var branchWx = CORE.branchWuxing(d.branch);
      var branchColor = CORE.getWuxingColor(branchWx);
      var branchLight = CORE.getWuxingColor(branchWx, "light");

      var colH = stemH + branchH + 4;
      if (d.hidden && d.hidden.length) colH += hiddenH + 4;

      // ── 日柱高亮背景 ──
      if (isDay) {
        var grad = ctx.createLinearGradient(x - 6, startY - 6, x + cellW + 6, startY + colH + 6);
        grad.addColorStop(0, "rgba(255,236,179,0.25)");
        grad.addColorStop(0.5, "rgba(255,224,130,0.40)");
        grad.addColorStop(1, "rgba(255,236,179,0.25)");
        CORE.drawRoundRect(ctx, x - 6, startY - 6, cellW + 12, colH + 12, 10, grad, "#D4A017", 1.5);
      }

      // ── 柱标签 ──
      CORE.drawCenterText(ctx, col.label + "柱", x + cellW / 2, startY - 18, {
        size: 12, color: "#9CA39C"
      });

      // ── 天干 ──
      CORE.drawRoundRect(ctx, x, startY, cellW, stemH, 6, stemLight, stemColor, 1.5);
      CORE.drawCenterText(ctx, d.stem, x + cellW / 2, startY + stemH / 2, {
        size: 30, bold: true, color: stemColor
      });

      // ── 地支 ──
      var branchY = startY + stemH + 4;
      CORE.drawRoundRect(ctx, x, branchY, cellW, branchH, 6, branchLight, branchColor, 1.5);
      CORE.drawCenterText(ctx, d.branch, x + cellW / 2, branchY + branchH / 2, {
        size: 30, bold: true, color: branchColor
      });

      // ── 地支五行微标 ──
      var wxLabel = stemWx + " / " + branchWx;
      CORE.drawCenterText(ctx, wxLabel, x + cellW / 2, startY + stemH + branchH + 16, {
        size: 9, color: "#8E958F"
      });

      // ── 藏干 ──
      if (d.hidden && d.hidden.length) {
        var hiddenY = branchY + branchH + 18;
        var hiddenHActual = Math.max(hiddenH, 18 + d.hidden.length * 2);
        CORE.drawRoundRect(ctx, x, hiddenY, cellW, hiddenHActual, 4, "rgba(5,8,6,0.72)", "rgba(219,176,83,0.22)", 1);
        var hiddenText = d.hidden.join(" ");
        CORE.drawCenterText(ctx, hiddenText, x + cellW / 2, hiddenY + hiddenHActual / 2, {
          size: 12, color: "#D8D0AD"
        });
      }
    });

    // ── 五行统计 ──
    function countWuxing(pillarArr) {
      var counts = { "\u6728": 0, "\u706B": 0, "\u571F": 0, "\u91D1": 0, "\u6C34": 0 };
      pillarArr.forEach(function (p) {
        if (!p) return;
        var ws = CORE.stemWuxing(p.stem);
        if (ws) counts[ws] = (counts[ws] || 0) + 1;
        var wb = CORE.branchWuxing(p.branch);
        if (wb) counts[wb] = (counts[wb] || 0) + 1;
        if (p.hidden) {
          p.hidden.forEach(function (h) {
            var wh = CORE.stemWuxing(h);
            if (wh) counts[wh] = (counts[wh] || 0) + 1;
          });
        }
      });
      return counts;
    }

    var stats = countWuxing([pillars.year, pillars.month, pillars.day, pillars.hour]);
    var wuxingOrder = ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"];
    var maxCount = 1;
    wuxingOrder.forEach(function (wx) {
      if ((stats[wx] || 0) > maxCount) maxCount = stats[wx] || 0;
    });

    // 五行分布条位置
    var topPillarBottom = startY + stemH + branchH + 4;
    if (pillars.day && pillars.day.hidden && pillars.day.hidden.length) {
      topPillarBottom += 34 + 18;
    }
    var barY = topPillarBottom + 30;
    var barH = 14;
    var barGap = 6;
    var barSection = totalW / 5;

    // 小标题
    CORE.drawCenterText(ctx, "五行分布", W / 2, barY - 16, {
      size: 12, color: "#EAD7A4"
    });

    wuxingOrder.forEach(function (wx, i) {
      var count = stats[wx] || 0;
      var barMaxW = barSection - barGap;
      var barW = Math.max(4, (count / maxCount) * barMaxW);
      var bx = startX + i * barSection;
      var color = CORE.getWuxingColor(wx);

      // 背景
      CORE.drawRoundRect(ctx, bx, barY, barMaxW, barH, 4, "rgba(255,255,255,0.08)", "none");
      // 填充
      if (barW > 2) {
        CORE.drawRoundRect(ctx, bx, barY, barW, barH, 4, color, "none");
      }
      // 标签
      CORE.drawCenterText(ctx, wx + " " + count, bx + barMaxW / 2, barY + barH / 2, {
        size: 11, color: "#F4EAD0", bold: true
      });
    });

    // ── 日主信息 ──
    if (pillars.dayMaster) {
      var dmY = barY + barH + 22;
      var dmWx = CORE.stemWuxing(pillars.dayMaster);
      var dmColor = CORE.getWuxingColor(dmWx);
      var genderText = pillars.gender || "";
      CORE.drawCenterText(ctx, "日主：" + pillars.dayMaster + "  ／  " + dmWx + "命  ／  " + genderText + "命", W / 2, dmY, {
        size: 13, color: dmColor, bold: true
      });
    }
  }


  // ═══════════════════════════════════════════════════════
  //  五行平衡五芒星图
  // ═══════════════════════════════════════════════════════

  /**
   * 绘制五行平衡五芒星图
   * @param {string} canvasId - Canvas 元素 ID
   * @param {Object} stats    - 五行计数, 例: {木:2, 火:3, 土:1, 金:0, 水:2}
   */
  function baziWuxingChart(canvasId, stats) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var W = 520, H = 440;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    CORE.clearCanvas(canvas);

    // ── 背景 ──
    ctx.save();
    var bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#050806");
    bgGrad.addColorStop(0.55, "#0B1510");
    bgGrad.addColorStop(1, "#160908");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(219,176,83,0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    ctx.restore();

    // ── 布局 ──
    var cx = W / 2;
    var cy = H / 2 - 10;
    var outerR = 150;

    // 五行顺序（相生循环: 木→火→土→金→水→木）
    var wuxingOrder = ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"];

    // ── 计算外五边形顶点（正上方起始，顺时针） ──
    var outerPts = [];
    for (var i = 0; i < 5; i++) {
      var angle = (i * 72 - 90) * Math.PI / 180;
      outerPts.push({
        x: cx + outerR * Math.cos(angle),
        y: cy + outerR * Math.sin(angle),
        wx: wuxingOrder[i],
        idx: i
      });
    }

    // ── 辅助函数：绘制带箭头的连线 ──
    function drawDirectedLine(x1, y1, x2, y2, color, lw, dash, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha || 0.6;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw || 2;
      if (dash) {
        ctx.setLineDash(dash);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 箭头（在距离终点 1/4 位置处）
      var ratio = 0.72;
      var ax = x1 + (x2 - x1) * ratio;
      var ay = y1 + (y2 - y1) * ratio;
      var arrowAngle = Math.atan2(y2 - y1, x2 - x1);
      var headLen = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(arrowAngle - 0.45), ay - headLen * Math.sin(arrowAngle - 0.45));
      ctx.lineTo(ax - headLen * Math.cos(arrowAngle + 0.45), ay - headLen * Math.sin(arrowAngle + 0.45));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── 绘制外五边形（辅助线） ──
    ctx.save();
    ctx.strokeStyle = "rgba(219,176,83,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    outerPts.forEach(function (p, idx) {
      idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // ── 绘制相生关系（相邻顶点，外五边形边） ──
    // 生: 木→火, 火→土, 土→金, 金→水, 水→木
    for (var si = 0; si < 5; si++) {
      var from = outerPts[si];
      var to = outerPts[(si + 1) % 5];
      var targetWx = to.wx;
      var sColor = CORE.getWuxingColor(targetWx);
      drawDirectedLine(from.x, from.y, to.x, to.y, sColor, 2, [5, 4], 0.40);

      // "生" 标签在边中点
      var smx = (from.x + to.x) / 2;
      var smy = (from.y + to.y) / 2;
      CORE.drawCenterText(ctx, "\u751F", smx, smy - 14, {
        size: 10, color: "#9CA39C"
      });
    }

    // ── 绘制相克关系（隔一顶点，五角星连线） ──
    // 克: 木→土, 火→金, 土→水, 金→木, 水→火
    for (var ki = 0; ki < 5; ki++) {
      var kFrom = outerPts[ki];
      var kTo = outerPts[(ki + 2) % 5];
      drawDirectedLine(kFrom.x, kFrom.y, kTo.x, kTo.y, "#C62828", 1.5, [], 0.30);

      // "克" 标签在连线中点
      var kmx = (kFrom.x + kTo.x) / 2;
      var kmy = (kFrom.y + kTo.y) / 2;
      CORE.drawCenterText(ctx, "\u514B", kmx, kmy - 12, {
        size: 10, color: "#B71C1C"
      });
    }

    // ── 绘制内五边形（辅助） ──
    var innerR = 55;
    ctx.save();
    ctx.strokeStyle = "rgba(216,208,173,0.22)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (var ii = 0; ii < 5; ii++) {
      var ia = (ii * 72 - 90 + 36) * Math.PI / 180;
      var ix = cx + innerR * Math.cos(ia);
      var iy = cy + innerR * Math.sin(ia);
      ii === 0 ? ctx.moveTo(ix, iy) : ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // ── 连接内外顶点（辐条） ──
    ctx.save();
    ctx.strokeStyle = "rgba(219,176,83,0.22)";
    ctx.lineWidth = 0.5;
    for (var ri = 0; ri < 5; ri++) {
      var ra = (ri * 72 - 90 + 36) * Math.PI / 180;
      var rx = cx + innerR * Math.cos(ra);
      var ry = cy + innerR * Math.sin(ra);
      ctx.beginPath();
      ctx.moveTo(outerPts[ri].x, outerPts[ri].y);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }
    ctx.restore();

    // ── 绘制顶点 ──
    var maxVal = 1;
    wuxingOrder.forEach(function (wx) {
      var v = stats[wx] || 0;
      if (v > maxVal) maxVal = v;
    });

    outerPts.forEach(function (pt) {
      var wx = pt.wx;
      var count = stats[wx] || 0;
      var color = CORE.getWuxingColor(wx);
      var lightColor = CORE.getWuxingColor(wx, "light");
      var darkColor = CORE.getWuxingColor(wx, "dark");

      // 外发光
      var glow = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, 30);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 外圆
      var cr = 24;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, cr, 0, Math.PI * 2);
      ctx.fillStyle = lightColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // 计数
      CORE.drawCenterText(ctx, String(count), pt.x, pt.y - 1, {
        size: 20, bold: true, color: darkColor
      });

      // 五行标签 (在圆外下方)
      var labelR = cr + 18;
      var lx = pt.x;
      var ly = pt.y + labelR;
      CORE.drawCenterText(ctx, wx, lx, ly, {
        size: 17, bold: true, color: color
      });
    });

    // ── 中心文字 ──
    CORE.drawCenterText(ctx, "五行\n平衡", cx, cy, {
      size: 14, bold: true, color: "#EAD7A4", align: "center", baseline: "middle"
    });

    // ── 图例 ──
    var legendY = cy + outerR + 48;
    // 图例 - 相生
    ctx.save();
    ctx.strokeStyle = "rgba(216,208,173,0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - 150, legendY);
    ctx.lineTo(cx - 90, legendY);
    ctx.stroke();
    ctx.restore();
    CORE.drawCenterText(ctx, "相生", cx - 70, legendY, { size: 11, color: "#D8D0AD" });

    // 图例 - 相克
    ctx.save();
    ctx.strokeStyle = "#C62828";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx + 10, legendY);
    ctx.lineTo(cx + 70, legendY);
    ctx.stroke();
    ctx.restore();
    CORE.drawCenterText(ctx, "相克", cx + 90, legendY, { size: 11, color: "#B71C1C" });
  }


  // ═══════════════════════════════════════════════════════
  //  鼠标悬停解释
  // ═══════════════════════════════════════════════════════

  /** 四柱八字 hit-test */
  function baziHitTest(mx, my, pillars) {
    var cellW = 108, cellGap = 14, stemH = 56, branchH = 56;
    var totalW = 4 * cellW + 3 * cellGap;
    var startX = (600 - totalW) / 2;
    var startY = 38;
    var pillarList = [
      { key: "year",   data: pillars.year },
      { key: "month",  data: pillars.month },
      { key: "day",    data: pillars.day   },
      { key: "hour",   data: pillars.hour  }
    ];
    for (var i = 0; i < 4; i++) {
      var d = pillarList[i].data;
      if (!d) continue;
      var x = startX + i * (cellW + cellGap);
      // 天干
      if (mx >= x && mx <= x + cellW && my >= startY && my <= startY + stemH) {
        return { term: d.stem };
      }
      // 地支
      if (mx >= x && mx <= x + cellW && my >= startY + stemH + 4 && my <= startY + stemH + 4 + branchH) {
        return { term: d.branch };
      }
    }
    return null;
  }

  /** 五行星图 hit-test */
  function wuxingHitTest(mx, my, stats) {
    var cx = 260, cy = 210, outerR = 150;
    var wuxingOrder = ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"];
    for (var i = 0; i < 5; i++) {
      var angle = (i * 72 - 90) * Math.PI / 180;
      var vx = cx + outerR * Math.cos(angle);
      var vy = cy + outerR * Math.sin(angle);
      var dist = Math.sqrt((mx - vx) * (mx - vx) + (my - vy) * (my - vy));
      if (dist < 30) {
        return { term: wuxingOrder[i] };
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════
  //  模块注册（含 tooltip 绑定）
  // ═══════════════════════════════════════════════════════
  registerVizModule("bazi", {
    render: function(canvasId, pillars) {
      baziRender(canvasId, pillars);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return baziHitTest(mx, my, pillars);
      });
    },
    renderWuxing: function(canvasId, stats) {
      baziWuxingChart(canvasId, stats);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return wuxingHitTest(mx, my, stats);
      });
    }
  });

})();
