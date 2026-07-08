/**
 * 紫微斗数命盘可视化模块 (Ziwei Doushu Chart)
 *
 * 在 Canvas 上绘制传统紫微斗数十二宫命盘，支持 HiDPI。
 *
 * 依赖:
 *   - core.js (CORE 工具对象)
 *
 * 注册:
 *   registerVizModule("ziwei", { render: ziweiRender })
 *
 * 调用:
 *   ziweiRender("canvasId", data)
 *
 * 网格布局 (4 列 x 4 行，经典紫微环形十二宫):
 *    row 0:    巳    午    未    申
 *    row 1:    辰   [CENTER 2x2]  酉
 *    row 2:    卯   [CENTER 2x2]  戌
 *    row 3:    寅    丑    子    亥
 *
 * 十二地支顺时针外环 (从 巳 起绕一圈):
 *   巳→午→未→申→酉→戌→亥→子→丑→寅→卯→辰→巳
 *   中心 2x2 为命卦/四化信息区，十二宫各占一地支、均有独立格。
 */

(function () {
  "use strict";

  // ════════════════════════════════════════════════════════════
  //  Constants
  // ════════════════════════════════════════════════════════════

  var CANVAS_W = 650;
  var CANVAS_H = 650;
  var COLS = 4;
  var ROWS = 4;
  var CELL_W = CANVAS_W / COLS; // 162.5
  var CELL_H = CANVAS_H / ROWS; // 162.5

  // 地支 -> grid {col, row}  (外环 12 宫; 中心 2x2 为信息区)
  var BRANCH_TO_GRID = {
    "巳": { col: 0, row: 0 }, // 巳
    "午": { col: 1, row: 0 }, // 午
    "未": { col: 2, row: 0 }, // 未
    "申": { col: 3, row: 0 }, // 申
    "辰": { col: 0, row: 1 }, // 辰
    "酉": { col: 3, row: 1 }, // 酉
    "卯": { col: 0, row: 2 }, // 卯
    "戌": { col: 3, row: 2 }, // 戌
    "寅": { col: 0, row: 3 }, // 寅
    "丑": { col: 1, row: 3 }, // 丑
    "子": { col: 2, row: 3 }, // 子
    "亥": { col: 3, row: 3 }, // 亥
  };

  // 每行对应地支 (用于渲染循环; null 为中心 2x2 信息区)
  var ROW_BRANCHES = [
    ["巳", "午", "未", "申"], // 巳 午 未 申
    ["辰", null, null, "酉"],          // 辰  -  -  酉
    ["卯", null, null, "戌"],          // 卯  -  -  戌
    ["寅", "丑", "子", "亥"], // 寅 丑 子 亥
  ];

  // ── 视觉配色 ──
  var COLORS = {
    bgLight: "#FBF8F3",
    bgDark: "#F2EDE3",
    bgCenter: "#FFFDF7",
    border: "#8B7355",
    borderThick: "#5D4037",
    titleFg: "#3E2723",
    branchFg: "#8D6E63",
    starFg: "#3E2723",
    miaoxianFg: "#795548",
    centerDivider: "#D7CCC8",

    // 四化标签色
    sihua: {
      "\u7984": "#C62828", // 禄 红
      "\u6743": "#E65100", // 权 橙
      "\u79d1": "#1565C0", // 科 蓝
      "\u5fcc": "#4E342E", // 忌 棕
    },
  };

  // 四化字符集合
  var SIHUA_TYPES = { "\u7984": 1, "\u6743": 1, "\u79d1": 1, "\u5fcc": 1 };

  // ════════════════════════════════════════════════════════════
  //  Helpers
  // ════════════════════════════════════════════════════════════

  /**
   * 确定性星曜色值 (HSL) — 同一星名始终同色
   */
  function starColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
    }
    var h = ((hash % 360) + 360) % 360;
    return "hsl(" + h + ", 62%, 48%)";
  }

  /**
   * 获取中文字符串的近似像素宽度 (px)
   * Canvas measureText 需先设 font, 这里取简估算: 每个汉字 ≈ 字大小
   */
  function chineseTextWidth(text, fontSize) {
    var width = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      // CJK 统一表意文字范围
      if (code >= 0x4e00 && code <= 0x9fff) {
        width += fontSize * 0.98;
      } else if (code >= 0x3000 && code <= 0x303f) {
        width += fontSize * 0.98; // CJK 符号
      } else {
        width += fontSize * 0.6; // ASCII/数字
      }
    }
    return width;
  }

  /**
   * 在 cell 内绘制圆角矩形背景 (代替 drawRoundRect 以保持统一切角)
   */
  function fillCellBg(ctx, x, y, w, h, fill, stroke) {
    var r = 0;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════
  //  Drawing functions
  // ════════════════════════════════════════════════════════════

  /**
   * 绘制单个宫位 cell
   * @return {object} {x, y, w, h} cell 矩形
   */
  function drawPalaceCell(ctx, col, row, palace, branch, isAlt) {
    var x = col * CELL_W;
    var y = row * CELL_H;
    var bg = isAlt ? COLORS.bgDark : COLORS.bgLight;

    fillCellBg(ctx, x, y, CELL_W, CELL_H, bg, COLORS.border);

    // 宫位名称 (左上)
    CORE.drawCenterText(ctx, palace, x + 8, y + 12, {
      size: 13,
      color: COLORS.titleFg,
      bold: true,
      align: "left",
      baseline: "top",
    });

    // 地支名称 (右上)
    CORE.drawCenterText(ctx, branch, x + CELL_W - 8, y + 12, {
      size: 11,
      color: COLORS.branchFg,
      align: "right",
      baseline: "top",
    });

    return { x: x, y: y, w: CELL_W, h: CELL_H };
  }

  /**
   * 在 cell 内绘制星曜列表 + 四化 + 庙旺利得
   */
  function drawStarsInCell(ctx, cell, stars, sihuaMap, miaoxian) {
    var x = cell.x;
    var y = cell.y;
    var w = cell.w;
    var h = cell.h;

    // 星曜起始 Y (宫名下方留白)
    var starY = y + 32;
    var lineH = 22;
    var maxStars = Math.min(stars.length, 5);
    var fontSize = 12;

    for (var i = 0; i < maxStars; i++) {
      var star = stars[i];
      var sy = starY + i * lineH;
      if (sy + lineH > y + h - 4) break;

      // 彩色圆点
      var dotColor = starColor(star);
      ctx.beginPath();
      ctx.arc(x + 12, sy + 8, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // 星名
      CORE.drawCenterText(ctx, star, x + 22, sy + 8, {
        size: fontSize,
        color: COLORS.starFg,
        align: "left",
        baseline: "middle",
      });

      // 四化标注
      var sihuaType = sihuaMap[star];
      if (sihuaType && SIHUA_TYPES[sihuaType]) {
        var txtW = chineseTextWidth(star, fontSize);
        var badgeX = x + 24 + txtW + 6;

        // 红色圆底
        ctx.save();
        ctx.beginPath();
        ctx.arc(badgeX + 7, sy + 8, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#C62828";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();

        // 四化字 (白)
        CORE.drawCenterText(ctx, sihuaType, badgeX + 7, sy + 8, {
          size: 9,
          color: "#FFFFFF",
          bold: true,
        });
      }
    }

    // 庙旺利得 (右下角)
    if (miaoxian) {
      CORE.drawCenterText(ctx, "\uff08" + miaoxian + "\uff09", x + w - 8, y + h - 8, {
        size: 10,
        color: COLORS.miaoxianFg,
        align: "right",
        baseline: "bottom",
      });
    }
  }

  /**
   * 绘制中心区域 (命卦 + 四化 + 戌亥缩略)
   */
  /**
   * 绘制中心 2x2 信息区域：命卦 / 四化 / 生辰 / 主星概览。
   * 戌、亥已并入外环 12 宫，中心区不再承载宫位缩略。
   */
  function drawCenterArea(ctx, data) {
    var x = CELL_W;
    var y = CELL_H;
    var w = CELL_W * 2;
    var h = CELL_H * 2;

    // ── 背景 ──
    fillCellBg(ctx, x, y, w, h, COLORS.bgCenter, COLORS.border);

    // ── 装饰性内边框 ──
    ctx.save();
    ctx.strokeStyle = "#E0D5C1";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();

    // 四象限中心点
    var tlCX = x + w * 0.25;   // 左上
    var trCX = x + w * 0.75;   // 右上
    var blCX = x + w * 0.25;   // 左下
    var brCX = x + w * 0.75;   // 右下
    var tlCY = y + h * 0.25;
    var trCY = y + h * 0.25;
    var blCY = y + h * 0.75;
    var brCY = y + h * 0.75;

    // ======== 左上: 命卦 ========
    CORE.drawCenterText(ctx, "命 卦", tlCX, tlCY - 30, {
      size: 12, color: "#795548", bold: true,
    });
    var mingGua = data.mingGua || {};
    CORE.drawCenterText(ctx, (mingGua.trigram || "?") + "卦", tlCX, tlCY - 2, {
      size: 26, color: "#BF360C", bold: true,
    });
    if (mingGua.group) {
      CORE.drawCenterText(ctx, mingGua.group, tlCX, tlCY + 24, {
        size: 13, color: "#6D4C41",
      });
    }

    // ======== 右上: 四化 ========
    CORE.drawCenterText(ctx, "四 化", trCX, trCY - 36, {
      size: 12, color: "#795548", bold: true,
    });
    var sihua = data.sihua || {};
    var sihuaKeys = Object.keys(sihua);
    for (var j = 0; j < sihuaKeys.length; j++) {
      var star = sihuaKeys[j];
      var type = sihua[star];
      var sy = trCY - 16 + j * 22;
      // 色点
      ctx.beginPath();
      ctx.arc(trCX - 34, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = starColor(star);
      ctx.fill();
      // "星名 化X"
      CORE.drawCenterText(ctx, star + " 化" + type, trCX - 24, sy, {
        size: 12, color: COLORS.starFg, align: "left", baseline: "middle",
      });
      // 色块标签
      var tagColor = COLORS.sihua[type] || "#888";
      ctx.save();
      CORE.drawRoundRect(ctx, trCX + 24, sy - 7, 18, 16, 3, tagColor);
      ctx.restore();
      CORE.drawCenterText(ctx, type, trCX + 33, sy, {
        size: 10, color: "#FFF", bold: true,
      });
    }

    // ======== 左下: 生辰 ========
    var bi = data.birthInfo || {};
    CORE.drawCenterText(ctx, "生 辰", blCX, blCY - 30, {
      size: 12, color: "#795548", bold: true,
    });
    if (bi.year) {
      CORE.drawCenterText(ctx, bi.year + "年" + bi.month + "月" + bi.day + "日", blCX, blCY - 4, {
        size: 12, color: "#8D6E63",
      });
    }
    if (bi.hour) {
      CORE.drawCenterText(ctx, bi.hour + "时  " + (bi.gender === "男" ? "男命" : "女命"), blCX, blCY + 18, {
        size: 11, color: "#8D6E63",
      });
    }

    // ======== 右下: 主星概览 ========
    CORE.drawCenterText(ctx, "主 星", brCX, brCY - 30, {
      size: 12, color: "#795548", bold: true,
    });
    var mainStars = data.mainStars || [];
    var shown = mainStars.slice(0, 6);
    for (var ms = 0; ms < shown.length; ms++) {
      CORE.drawCenterText(ctx, shown[ms], brCX, brCY - 12 + ms * 16, {
        size: 11, color: COLORS.starFg,
      });
    }
    if (shown.length === 0) {
      CORE.drawCenterText(ctx, "—", brCX, brCY, { size: 11, color: "#8D6E63" });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Main Render Entry
  // ════════════════════════════════════════════════════════════

  /**
   * ziweiRender(canvasId, data)
   *
   * @param {string} canvasId - <canvas> 元素的 DOM id
   * @param {object} data     - 命盘数据
   *
   * data 结构:
   * {
   *   birthInfo: { year, month, day, hour, gender },
   *   mingGua:   { trigram, group },
   *   palaces: {
   *     "命宫": { stars: [], position: "寅", miaoxian: "庙" },
   *     "兄弟": { stars: [], position: "卯", miaoxian: "旺" },
   *     ...
   *   },
   *   sihua: { "廉贞": "禄", "破军": "权", ... },
   *   mainStars: ["紫微","天机",...]
   * }
   */
  function ziweiRender(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var ctx = CORE.setupHiDPI(canvas, CANVAS_W, CANVAS_H);
    CORE.clearCanvas(canvas);

    // ── 全场背景 ──
    fillCellBg(ctx, 0, 0, CANVAS_W, CANVAS_H, "#F5F0E8", COLORS.borderThick);

    // ── 构建 地支→宫位 索引 ──
    var palaces = data.palaces || {};
    var branchToPalace = {};
    var pNames = Object.keys(palaces);
    for (var i = 0; i < pNames.length; i++) {
      var pName = pNames[i];
      var pData = palaces[pName];
      var branch = pData.position || "";
      branchToPalace[branch] = {
        name: pName,
        stars: pData.stars || [],
        miaoxian: pData.miaoxian || "",
        branch: branch,
      };
    }

    var sihua = data.sihua || {};

    // ── 绘制外环 12 宫 (中心 2x2 为信息区，单独由 drawCenterArea 绘制) ──
    var alt = false;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        // 跳过中心 2x2 信息区 (row∈{1,2}, col∈{1,2})
        if ((r === 1 || r === 2) && (c === 1 || c === 2)) continue;

        var branch = ROW_BRANCHES[r][c];
        if (!branch) continue;

        var info = branchToPalace[branch];
        if (!info) {
          info = { name: "", stars: [], miaoxian: "", branch: branch };
        }

        var cell = drawPalaceCell(ctx, c, r, info.name, branch, alt);
        drawStarsInCell(ctx, cell, info.stars, sihua, info.miaoxian);

        alt = !alt;
      }
    }

    // ── 中心区域 ──
    drawCenterArea(ctx, data);

    // ── 外框 (粗) ──
    ctx.save();
    ctx.strokeStyle = COLORS.borderThick;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    // ── 网格线 (细) ──
    ctx.save();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;

    // 竖线
    for (var c = 1; c < COLS; c++) {
      var lx = c * CELL_W;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, CANVAS_H);
      ctx.stroke();
    }
    // 横线
    for (var r = 1; r < ROWS; r++) {
      var ly = r * CELL_H;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(CANVAS_W, ly);
      ctx.stroke();
    }

    // 中心 2x2 信息区内部十字分隔线，将 2x2 分为四块
    var centerColX = CELL_W * 2;
    var centerRowY = CELL_H * 2;
    ctx.beginPath();
    ctx.moveTo(centerColX, CELL_H);
    ctx.lineTo(centerColX, CELL_H * 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CELL_W, centerRowY);
    ctx.lineTo(CELL_W * 3, centerRowY);
    ctx.stroke();

    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════
  //  鼠标悬停解释
  // ════════════════════════════════════════════════════════════

  function ziweiHitTest(mx, my, data) {
    var col = Math.floor(mx / CELL_W);
    var row = Math.floor(my / CELL_H);
    // 跳过中心 2x2 信息区
    if ((row === 1 || row === 2) && (col === 1 || col === 2)) return null;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    var branch = ROW_BRANCHES[row][col];
    if (!branch) return null;
    // 查找宫位
    var palaces = data.palaces || {};
    var foundName = "", foundStars = [];
    for (var k in palaces) {
      if (palaces[k].position === branch) {
        foundName = k;
        foundStars = palaces[k].stars || [];
        break;
      }
    }
    if (foundStars.length > 0) {
      // 检查是否在星名上(starY = cell_y + 32, lineH=22)
      var cellY = row * CELL_H;
      for (var si = 0; si < foundStars.length; si++) {
        var sy = cellY + 32 + si * 22;
        if (my >= sy - 8 && my <= sy + 14 && mx >= col * CELL_W + 10 && mx <= col * CELL_W + 120) {
          return { term: foundStars[si] };
        }
      }
    }
    // 默认返回宫位名
    if (foundName) {
      var starStr = foundStars.length > 0 ? foundStars.join("、") : "无主星";
      return { term: foundName, explanation: "<b>" + foundName + "</b>" + (branch ? "（" + branch + "宫）" : "") + "<br>主星：" + starStr };
    }
    return { term: branch };
  }

  // ════════════════════════════════════════════════════════════
  //  Register
  // ════════════════════════════════════════════════════════════
  registerVizModule("ziwei", {
    render: function(canvasId, data) {
      ziweiRender(canvasId, data);
      if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
        return ziweiHitTest(mx, my, data);
      });
    }
  });
})();
