/**
 * divination.js — 六爻 (Liuyao) & 梅花易数 (Meihua Yishu) 可视化模块
 *
 * 依赖 core.js 中的 CORE 对象和 registerVizModule 函数。
 * 注册为 "divination" 模块，暴露 renderLiuyao / renderMeihua 两个入口。
 *
 * 六爻：在 450x500 Canvas 上绘出六爻卦画，附带六神、地支六亲、世应、动爻标记。
 * 梅花易数：在 500x450 Canvas 上绘出上下卦画、本变卦名、互卦、体用生克图示。
 */

(function () {
  "use strict";

  // ================================================================
  //  色彩 & 样式常量
  // ================================================================

  const COLORS = {
    bg: "#FFF8E1",
    border: "#D7CCC8",
    bar: "#3E2723",
    barChanged: "#1B5E20",
    changingCircle: "#D32F2F",
    labelShi: "#D32F2F",
    labelYing: "#1565C0",
    title: "#3E2723",
    changedTitle: "#6A1B9A",
    bodyText: "#5D4037",
    mutedText: "#8D6E63",
    meihuaBg: "#F5F5F0",
    meihuaBody: "#1565C0",
    meihuaUse: "#D32F2F",
    meihuaText: "#3E2723",
    meihuaMuted: "#6D4C41",
  };

  const FONT = {
    sans: "'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif",
    mono: "'Noto Sans SC','Microsoft YaHei',sans-serif",
  };

  // ================================================================
  //  爻线绘制工具
  // ================================================================

  /**
   * 绘制一条爻线。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx         - 中心 x
   * @param {number} y          - 顶部 y
   * @param {number} totalWidth - 阳爻总宽
   * @param {number} height     - 线高
   * @param {boolean} yin       - true=阴爻（两短杠），false=阳爻（一长杠）
   * @param {boolean} isChanged - 是否变卦爻（使用不同颜色）
   */
  function drawYaoLine(ctx, cx, y, totalWidth, height, yin, isChanged) {
    const color = isChanged ? COLORS.barChanged : COLORS.bar;
    ctx.save();

    if (yin) {
      // 阴爻：左右两段，中间留 gap（约为总宽的 18%）
      const gap = Math.max(6, totalWidth * 0.18);
      const segW = (totalWidth - gap) / 2;
      const leftX = cx - totalWidth / 2;

      ctx.fillStyle = color;
      ctx.fillRect(leftX, y, segW, height);
      ctx.fillRect(leftX + segW + gap, y, segW, height);
    } else {
      // 阳爻：一根实线
      ctx.fillStyle = color;
      ctx.fillRect(cx - totalWidth / 2, y, totalWidth, height);
    }

    ctx.restore();
  }

  /**
   * 绘制 3 条爻线（八卦用）。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx       - 中心 x
   * @param {number} startY   - 第 0 条顶部 y
   * @param {Array<{yin:boolean,changing?:boolean}>} lines - 三条爻（上->下）
   * @param {number} barW     - 爻宽
   * @param {number} barH     - 爻高
   * @param {number} gap      - 行间距
   * @param {boolean} markChanging - 是否标记动爻
   */
  function drawTrigramLines(
    ctx,
    cx,
    startY,
    lines,
    barW,
    barH,
    gap,
    markChanging
  ) {
    lines.forEach(function (line, i) {
      var y = startY + i * (barH + gap);
      drawYaoLine(ctx, cx, y, barW, barH, line.yin, false);

      if (line.changing && markChanging) {
        // 动爻标记：红色实心圆 + "动" 字
        var circleX = cx + barW / 2 + 14;
        var circleY = y + barH / 2;
        ctx.save();
        ctx.fillStyle = COLORS.changingCircle;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "9px " + FONT.sans;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("动", circleX, circleY);
        ctx.restore();
      }
    });
  }

  // ================================================================
  //  卦名 → 三爻映射
  // ================================================================

  /**
   * 八卦名称 → 从上到下的三爻数组。
   * 阳 = {yin:false}，阴 = {yin:true}
   *
   *  乾 ☰  兑 ☱  离 ☲  震 ☳  巽 ☴  坎 ☵  艮 ☶  坤 ☷
   *  ───  ─ ─  ───  ─ ─  ───  ─ ─  ───  ─ ─
   *  ───  ───  ─ ─  ─ ─  ───  ───  ─ ─  ─ ─
   *  ───  ───  ───  ───  ─ ─  ───  ─ ─  ─ ─
   */
  var TRIGRAM_LINES = {
    乾: [{ yin: false }, { yin: false }, { yin: false }],
    兑: [{ yin: true }, { yin: false }, { yin: false }],
    离: [{ yin: false }, { yin: true }, { yin: false }],
    震: [{ yin: true }, { yin: true }, { yin: false }],
    巽: [{ yin: false }, { yin: false }, { yin: true }],
    坎: [{ yin: true }, { yin: false }, { yin: true }],
    艮: [{ yin: false }, { yin: true }, { yin: true }],
    坤: [{ yin: true }, { yin: true }, { yin: true }],
  };

  function trigramToLines(name) {
    return (
      TRIGRAM_LINES[name] || [
        { yin: false },
        { yin: false },
        { yin: false },
      ]
    );
  }

  // ================================================================
  //  六神颜色（复用 CORE）
  // ================================================================

  function getGodColor(god) {
    var idx = CORE.sixGods.indexOf(god);
    return idx >= 0 ? CORE.sixGodsColor[idx] : "#666";
  }

  // ================================================================
  //  renderLiuyao — 六爻卦画
  // ================================================================

  /**
   * @param {string} canvasId
   * @param {object} data   - 见 README 数据定义
   */
  function liuyaoRender(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // ── 画布初始化 ──
    var W = 450,
      H = 500;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    ctx.save();
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    data = data || {};
    var lines = data.lines || [];
    var isOriginal = data.isOriginal !== false;

    // ── 布局参数 ──
    var topPad = 32; // 标题行高
    var rowH = 66; // 每行间距（含爻线自身）
    var barCX = 215; // 爻线区域中心 x
    var barW = 178; // 爻线宽度
    var barH = 18; // 爻线高度
    var sixGodX = 16; // 六神文字 x
    var branchRelX = 355; // 地支+六亲文字 x
    var shiYingX = 318; // 世/应标签 x
    var yaoStartY = topPad + 2; // 初爻顶部 y

    // ── 标题：本卦 / 变卦 ──
    ctx.save();
    ctx.font = "bold 16px " + FONT.sans;
    ctx.fillStyle = isOriginal ? COLORS.title : COLORS.changedTitle;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(isOriginal ? "本卦" : "变卦", 225, 6);
    ctx.restore();

    // ── 逐爻绘制 ──
    for (var i = 0; i < Math.min(lines.length, 6); i++) {
      var line = lines[i];
      var rowY = yaoStartY + i * rowH;
      var yin = !!line.yin;
      var changing = !!line.changing;
      var god = line.god || "";
      var branch = line.branch || "";
      var relation = line.relation || "";

      // 六神（左侧，带颜色）
      if (god) {
        ctx.save();
        ctx.font = "13px " + FONT.sans;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = getGodColor(god);
        ctx.fillText(god, sixGodX, rowY + barH / 2);
        ctx.restore();
      }

      // 爻线
      drawYaoLine(ctx, barCX, rowY, barW, barH, yin, false);

      // 动爻标记
      if (changing) {
        var cx2 = barCX + barW / 2 + 14;
        var cy2 = rowY + barH / 2;
        ctx.save();
        ctx.fillStyle = COLORS.changingCircle;
        ctx.beginPath();
        ctx.arc(cx2, cy2, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "9px " + FONT.sans;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("动", cx2, cy2);
        ctx.restore();
      }

      // 地支 + 六亲（右侧）
      ctx.save();
      ctx.font = "13px " + FONT.sans;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.bodyText;
      var rightLabel = branch;
      if (relation) rightLabel += " " + relation;
      ctx.fillText(rightLabel, branchRelX, rowY + barH / 2);
      ctx.restore();

      // 世 / 应 标记
      var yaoNum = i + 1; // 1-indexed
      if (data.shiYao === yaoNum) {
        drawShiYingLabel(ctx, "世", COLORS.labelShi, shiYingX, rowY + barH / 2);
      }
      if (data.yingYao === yaoNum) {
        drawShiYingLabel(
          ctx,
          "应",
          COLORS.labelYing,
          shiYingX,
          rowY + barH / 2
        );
      }
    }

    // ── 底部：卦名、用神、卦数 ──
    var bottomY = yaoStartY + 6 * rowH + 4;

    // 卦名
    if (data.hexagramName) {
      ctx.save();
      ctx.font = "bold 20px " + FONT.sans;
      ctx.fillStyle = COLORS.title;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(data.hexagramName, 225, bottomY);
      ctx.restore();
    }

    // 用神
    if (data.yongShen) {
      ctx.save();
      ctx.font = "13px " + FONT.sans;
      ctx.fillStyle = COLORS.bodyText;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("用神: " + data.yongShen, 225, bottomY + 26);
      ctx.restore();
    }

    // 卦数
    if (data.hexagramNumber) {
      ctx.save();
      ctx.font = "11px " + FONT.sans;
      ctx.fillStyle = COLORS.mutedText;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("第" + data.hexagramNumber + "卦", 225, bottomY + 46);
      ctx.restore();
    }
  }

  /**
   * 绘制世/应圆形标签。
   */
  function drawShiYingLabel(ctx, text, color, cx, cy) {
    ctx.save();
    ctx.font = "bold 13px " + FONT.sans;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 圆角矩形背景
    var rw = 20,
      rh = 20;
    CORE.drawRoundRect(
      ctx,
      cx - rw / 2,
      cy - rh / 2,
      rw,
      rh,
      4,
      text === "世" ? "#FFCDD2" : "#BBDEFB",
      color,
      1.5
    );
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  // ================================================================
  //  renderMeihua — 梅花易数
  // ================================================================

  /**
   * @param {string} canvasId
   * @param {object} data   - 见 README 数据定义
   */
  function meihuaRender(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // ── 画布初始化 ──
    var W = 500,
      H = 450;
    var ctx = CORE.setupHiDPI(canvas, W, H);
    ctx.save();
    ctx.fillStyle = COLORS.meihuaBg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    data = data || {};
    var upperTri = data.upperTrigram || {};
    var lowerTri = data.lowerTrigram || {};

    // ── 布局参数 ──
    var barCX = 100; // 卦画列中心 x
    var barW = 100; // 爻线宽度
    var barH = 12; // 爻线高度
    var lineGap = 10; // 行间距
    var triGap = 55; // 上下卦间隔

    var upperStartY = 42; // 上卦第一爻顶部 y
    var lowerStartY =
      upperStartY + 3 * (barH + lineGap) + triGap; // 下卦第一爻顶部 y

    var infoX = 210; // 右栏资讯起始 x

    // ── 上卦（外卦）──
    var upperLines = trigramToLines(upperTri.name);
    drawTrigramLines(
      ctx,
      barCX,
      upperStartY,
      upperLines,
      barW,
      barH,
      lineGap,
      false
    );

    // ── 下卦（内卦）──
    var lowerLines = trigramToLines(lowerTri.name);
    drawTrigramLines(
      ctx,
      barCX,
      lowerStartY,
      lowerLines,
      barW,
      barH,
      lineGap,
      false
    );

    // ── 动爻标记（红圈 "变"）──
    if (data.changingLine) {
      var ch = data.changingLine; // 1-indexed
      var targetY;
      if (ch <= 3) {
        // 在下卦：ch=1=最下爻(lines[2]), ch=2=中爻(lines[1]), ch=3=上爻(lines[0])
        var idx = 3 - ch;
        targetY = lowerStartY + idx * (barH + lineGap);
      } else {
        // 在上卦：ch=4=最下爻(lines[2]), ch=5=中爻(lines[1]), ch=6=上爻(lines[0])
        var idx2 = 6 - ch;
        targetY = upperStartY + idx2 * (barH + lineGap);
      }
      ctx.save();
      ctx.fillStyle = COLORS.changingCircle;
      ctx.beginPath();
      ctx.arc(barCX + barW / 2 + 14, targetY + barH / 2, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px " + FONT.sans;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("变", barCX + barW / 2 + 14, targetY + barH / 2);
      ctx.restore();
    }

    // ── 右栏：卦名 ──
    ctx.save();
    ctx.font = "bold 24px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaText;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(data.hexagramName || "", infoX, 48);
    ctx.restore();

    // ── 上下卦名称 + 符号 ──
    ctx.save();
    ctx.font = "17px " + FONT.sans;
    ctx.fillStyle = COLORS.bodyText;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    var uName = upperTri.name || "";
    var uSym = upperTri.symbol || "";
    var lName = lowerTri.name || "";
    var lSym = lowerTri.symbol || "";
    if (uName) ctx.fillText("上: " + uSym + " " + uName, infoX, 80);
    if (lName) ctx.fillText("下: " + lSym + " " + lName, infoX, 106);
    ctx.restore();

    // ── 变卦名 ──
    if (data.changingHexagramName) {
      ctx.save();
      ctx.font = "16px " + FONT.sans;
      ctx.fillStyle = COLORS.changedTitle;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("变卦: " + data.changingHexagramName, infoX, 140);
      ctx.restore();
    }

    // ── 动爻文字说明 ──
    if (data.changingLine) {
      ctx.save();
      ctx.font = "13px " + FONT.sans;
      ctx.fillStyle = COLORS.meihuaMuted;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("动爻: " + data.changingLine + "爻", infoX, 170);
      ctx.restore();
    }

    // ── 互卦（右上角小 inset）──
    var mutualX = 360;
    var mutualY = 38;
    if (data.mutualUpper || data.mutualLower) {
      var mu = data.mutualUpper || {};
      var ml = data.mutualLower || {};

      // 内部布局：标题 + 上互(符号30 + 名11) + 下互(符号30 + 名11)，
      // 逐项下排并预留间距，框高按内容自适应，避免文字溢出或互相重叠。
      var muCx = mutualX + 54;
      var curY = mutualY + 2;        // 标题 y（top baseline）
      var symSize = 30, nameSize = 11, rowGap = 4;

      // 标题「互卦」
      curY += 14;                   // 标题占位 ~12px + 2 间距

      // 上互符号
      var upperSymY = curY;
      curY += symSize + rowGap;

      // 上互名
      var upperNameY = curY;
      curY += nameSize + rowGap + 2;

      // 下互符号
      var lowerSymY = curY;
      curY += symSize + rowGap;

      // 下互名
      var lowerNameY = curY;
      curY += nameSize + 4;

      var mutualBoxH = curY - mutualY + 4;   // 框高随内容自适应
      var mutualBoxW = 120;

      // 外框
      CORE.drawRoundRect(
        ctx,
        mutualX - 6,
        mutualY - 4,
        mutualBoxW,
        mutualBoxH,
        6,
        "#EFEBE9",
        "#BCAAA4",
        1
      );

      // 标题
      ctx.save();
      ctx.font = "12px " + FONT.sans;
      ctx.fillStyle = COLORS.mutedText;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("互卦", muCx, mutualY + 2);
      ctx.restore();

      // 上互符号
      if (mu.symbol) {
        ctx.save();
        ctx.font = symSize + "px " + FONT.sans;
        ctx.fillStyle = COLORS.meihuaText;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(mu.symbol, muCx, upperSymY);
        ctx.restore();
      }
      if (mu.name) {
        ctx.save();
        ctx.font = nameSize + "px " + FONT.sans;
        ctx.fillStyle = COLORS.mutedText;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(mu.name, muCx, upperNameY);
        ctx.restore();
      }

      // 下互符号
      if (ml.symbol) {
        ctx.save();
        ctx.font = symSize + "px " + FONT.sans;
        ctx.fillStyle = COLORS.meihuaText;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(ml.symbol, muCx, lowerSymY);
        ctx.restore();
      }
      if (ml.name) {
        ctx.save();
        ctx.font = nameSize + "px " + FONT.sans;
        ctx.fillStyle = COLORS.mutedText;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(ml.name, muCx, lowerNameY);
        ctx.restore();
      }
    }

    // ── 体用生克 ──
    var tiYongY = 240;

    // 标题
    ctx.save();
    ctx.font = "bold 16px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaText;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("体用生克", infoX, tiYongY);
    ctx.restore();

    var bodyName = data.bodyTrigram || "";
    var useName = data.useTrigram || "";
    var relation = data.bodyUseRelation || "";

    var boxY = tiYongY + 28;
    var boxW = 72;
    var boxH = 52;

    // — 体卦（蓝色）—
    CORE.drawRoundRect(ctx, infoX, boxY, boxW, boxH, 8, "#E3F2FD", "#1565C0", 2);
    ctx.save();
    ctx.font = "24px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaBody;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bodyName, infoX + boxW / 2, boxY + boxH / 2 - 2);
    ctx.restore();
    ctx.save();
    ctx.font = "10px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaBody;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("体卦", infoX + boxW / 2, boxY - 3);
    ctx.restore();

    // — 关系箭头 + 标签 —
    var arrX1 = infoX + boxW + 8;
    var arrX2 = infoX + boxW + 58;
    var arrMidY = boxY + boxH / 2;
    CORE.drawArrow(ctx, arrX1, arrMidY, arrX2, arrMidY, "#795548", 2);

    var relLabel = relation === "生" ? "生" : relation === "克" ? "克" : relation || "";
    if (relLabel) {
      ctx.save();
      ctx.font = "bold 15px " + FONT.sans;
      ctx.fillStyle = COLORS.changingCircle;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(relLabel, (arrX1 + arrX2) / 2, arrMidY - 4);
      ctx.restore();
    }

    // — 用卦（红色）—
    var useBoxX = infoX + boxW + 28;
    CORE.drawRoundRect(
      ctx,
      useBoxX,
      boxY,
      boxW,
      boxH,
      8,
      "#FFEBEE",
      "#D32F2F",
      2
    );
    ctx.save();
    ctx.font = "24px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaUse;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(useName, useBoxX + boxW / 2, boxY + boxH / 2 - 2);
    ctx.restore();
    ctx.save();
    ctx.font = "10px " + FONT.sans;
    ctx.fillStyle = COLORS.meihuaUse;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("用卦", useBoxX + boxW / 2, boxY - 3);
    ctx.restore();

    // — 生克解释文字 —
    var relHint = "";
    if (relation === "生") relHint = "体生用 → 泄气，事倍功半";
    else if (relation === "克") relHint = "体克用 → 费力，己方占优";
    else if (relation === "比和") relHint = "体用比和 → 顺遂，诸事和谐";
    if (relHint) {
      ctx.save();
      ctx.font = "12px " + FONT.sans;
      ctx.fillStyle = COLORS.meihuaMuted;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("释义: " + relHint, infoX, boxY + boxH + 10);
      ctx.restore();
    }

    // ── 外框 ──
    ctx.save();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.restore();
  }

  // ================================================================
  //  鼠标悬停解释
  // ================================================================

  function liuyaoHitTest(mx, my, data) {
    var lines = data.lines || [];
    var rowH = 66, yaoStartY = 32;
    for (var i = 0; i < Math.min(lines.length, 6); i++) {
      var rowY = yaoStartY + i * rowH;
      var line = lines[i];
      if (my >= rowY - 4 && my <= rowY + 22) {
        // 六神区域（左侧）
        if (mx >= 10 && mx <= 60 && line.god) {
          return { term: line.god };
        }
        // 六亲区域（右侧）
        if (mx >= 340 && mx <= 390 && line.relation) {
          return { term: line.relation };
        }
        // 地支区域
        if (mx >= 340 && mx <= 420 && line.branch) {
          return { term: line.branch };
        }
        // 世应区域
        if (mx >= 300 && mx <= 340) {
          if (data.shiYao === i + 1) return { term: "世爻" };
          if (data.yingYao === i + 1) return { term: "应爻" };
        }
        // 动爻标记
        if (line.changing && mx >= 210 + 89 + 8 && mx <= 210 + 89 + 30) {
          return { term: "动爻" };
        }
      }
    }
    // 底部卦名/用神
    var bottomY = yaoStartY + 6 * rowH + 4;
    if (my >= bottomY && my <= bottomY + 60) {
      if (data.yongShen) return { term: "用神", explanation: "<b>用神</b>：" + data.yongShen + "。" + (CORE.explain("用神") || "") };
    }
    return null;
  }

  function meihuaHitTest(mx, my, data) {
    // 上卦区域
    if (mx >= 50 && mx <= 150 && my >= 42 && my <= 90 && data.upperTrigram) {
      return { term: data.upperTrigram.name };
    }
    // 下卦区域
    if (mx >= 50 && mx <= 150 && my >= 140 && my <= 188 && data.lowerTrigram) {
      return { term: data.lowerTrigram.name };
    }
    // 体用生克区域
    if (my >= 240 && my <= 310 && mx >= 200) {
      if (data.bodyTrigram) return { term: "体卦", explanation: CORE.explain("体卦") + "<br>体卦=" + data.bodyTrigram };
      if (data.useTrigram) return { term: "用卦", explanation: CORE.explain("用卦") + "<br>用卦=" + data.useTrigram };
      if (data.bodyUseRelation) return { term: "体用生克", explanation: "体用关系：" + data.bodyUseRelation + "。" + CORE.explain("体用生克") };
    }
    // 变卦/互卦
    if (my >= 38 && my <= 140 && mx >= 350 && mx <= 470) {
      if (data.mutualUpper) return { term: "互卦", explanation: CORE.explain("互卦") };
      if (data.changingHexagramName) return { term: "变卦", explanation: CORE.explain("变卦") };
    }
    return null;
  }

  // ================================================================
  //  模块注册
  // ================================================================

  registerVizModule("divination", {
    renderLiuyao: function(canvasId, data) {
      liuyaoRender(canvasId, data);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return liuyaoHitTest(mx, my, data);
      });
    },
    renderMeihua: function(canvasId, data) {
      meihuaRender(canvasId, data);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return meihuaHitTest(mx, my, data);
      });
    },
  });
})();
