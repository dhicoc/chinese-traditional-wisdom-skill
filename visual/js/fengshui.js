/**
 * 风水（Fengshui）可视化模块
 *
 * 提供罗盘（二十四山）、飞星（九宫飞星）、八宅（八宅命盘）三种可视化渲染
 * 依赖 visual/js/core.js 提供的 CORE 工具对象
 *
 * @module fengshui
 */

// ─── 常量 ─────────────────────────────────────────────────

const DEG = Math.PI / 180;

/** 二十四山阴阳分类（阳山暖色，阴山冷色） */
const YANG_MOUNTAINS = new Set([
  "壬","甲","丙","庚","乾","艮",
  "子","寅","辰","午","申","戌"
]);

/** 八宅山向 → 星曜映射表 */
const EIGHT_MANSIONS_DATA = {
  坎: { 北:"伏位", 东北:"五鬼", 东:"天医", 东南:"生气", 南:"延年", 西南:"绝命", 西:"祸害", 西北:"六煞" },
  坤: { 北:"绝命", 东北:"生气", 东:"祸害", 东南:"五鬼", 南:"六煞", 西南:"伏位", 西:"天医", 西北:"延年" },
  震: { 北:"天医", 东北:"六煞", 东:"伏位", 东南:"延年", 南:"生气", 西南:"祸害", 西:"绝命", 西北:"五鬼" },
  巽: { 北:"生气", 东北:"祸害", 东:"延年", 东南:"伏位", 南:"天医", 西南:"六煞", 西:"五鬼", 西北:"绝命" },
  乾: { 北:"六煞", 东北:"五鬼", 东:"绝命", 东南:"祸害", 南:"五鬼", 西南:"延年", 西:"天医", 西北:"伏位" },
  兑: { 北:"祸害", 东北:"延年", 东:"五鬼", 东南:"绝命", 南:"六煞", 西南:"天医", 西:"伏位", 西北:"生气" },
  艮: { 北:"五鬼", 东北:"伏位", 东:"六煞", 东南:"祸害", 南:"绝命", 西南:"生气", 西:"延年", 西北:"天医" },
  离: { 北:"延年", 东北:"绝命", 东:"生气", 东南:"天医", 南:"伏位", 西南:"五鬼", 西:"祸害", 西北:"六煞" }
};

/** 星曜吉凶文字颜色（深底用白色） */
const STAR_LUCK_COLORS = {
  "大凶": "#D32F2F",
  "凶":   "#F48FB1",
  "吉":   "#A5D6A7",
  "大吉": "#388E3C",
  "中性": "#FFD54F",
  "次凶": "#FFAB91"
};

/** 八宅吉凶颜色（面板用） */
const MANSION_COLORS = {
  "大吉": "#388E3C",
  "吉":   "#A5D6A7",
  "中性": "#9E9E9E",
  "次凶": "#FF9800",
  "凶":   "#D32F2F",
  "大凶": "#B71C1C"
};

/** 九宫格布局（洛书方位 → 3×3 网格） */
const FLYING_STAR_GRID = [
  ["巽", "离", "坤"],
  ["震", "中", "兑"],
  ["艮", "坎", "乾"]
];

/** 方向名 → 角度（度，从北顺时针） */
const DIR_NAME_TO_DEG = Object.fromEntries(
  Object.values(CORE.trigramDirection).map(v => [v.label, v.deg])
);

/** 方向排序（从北开始顺时针） */
const DIR_NAMES = ["北","东北","东","东南","南","西南","西","西北"];

/** 默认字体 */
const FONT_FAMILY = '"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif';


// ─── 通用绘制工具 ────────────────────────────────────────

/**
 * 沿径向绘制文字（字头朝外）
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} angle  - 弧度（canvas 坐标系）
 * @param {number} radius - 距圆心的像素距离
 * @param {number} cx,cy  - 圆心坐标
 * @param {object} [opts]
 * @param {string}  [opts.color="#333"]
 * @param {number}  [opts.size=11]
 * @param {boolean} [opts.bold=false]
 * @param {string}  [opts.family]
 */
function drawRadialLabel(ctx, text, angle, radius, cx, cy, opts) {
  opts = opts || {};
  const color = opts.color || "#333";
  const size = opts.size || 11;
  const bold = opts.bold || false;
  const family = opts.family || FONT_FAMILY;
  const x = cx + radius * Math.cos(angle);
  const y = cy + radius * Math.sin(angle);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.font = (bold ? "bold " : "") + size + "px " + family;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * 绘制环形扇区（弧形切片）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx,cy     - 圆心
 * @param {number} innerR,outerR - 内外半径
 * @param {number} startAngle,endAngle - 起止弧度（canvas 坐标系）
 * @param {string} [fill]
 * @param {string} [stroke]
 */
function drawRingSector(ctx, cx, cy, innerR, outerR, startAngle, endAngle, fill, stroke) {
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, startAngle, endAngle);
  ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
}

/**
 * 绘制环形边框
 */
function strokeRing(ctx, cx, cy, r, color, lw) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = color || "#888";
  ctx.lineWidth = lw || 1.5;
  ctx.stroke();
}

/**
 * 取吉凶对应的前景色（深色背景返回白色）
 */
function luckTextColor(luck, darkThresholds) {
  darkThresholds = darkThresholds || ["大凶", "大吉"];
  return darkThresholds.includes(luck) ? "#FFF" : "#333";
}

/**
 * 将十六进制颜色与白色混合得到浅色版本
 */
function lighten(hex, alpha) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  const mix = function (c) { return Math.round(c + (255 - c) * alpha); };
  return "rgb(" + mix(r) + "," + mix(g) + "," + mix(b) + ")";
}


// ─── 罗盘渲染（二十四山） ──────────────────────────────

/**
 * 渲染二十四山罗盘
 * @param {string} canvasId - Canvas DOM 元素 id
 */
function compassRender(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var W = 500, H = 500;
  var ctx = CORE.setupHiDPI(canvas, W, H);
  CORE.clearCanvas(canvas);

  var cx = W / 2, cy = H / 2;

  // 环半径（从外到内）
  var R1 = 235;       // 外环外缘
  var R1i = 195;      // 外环内缘
  var R2 = 190;       // 中环外缘
  var R2i = 142;      // 中环内缘
  var R3 = 138;       // 内环外缘
  var R3i = 88;       // 内环内缘
  var RC = 38;        // 中心圆半径

  // ── 外环：二十四山 ──
  for (var i = 0; i < 24; i++) {
    var mtn = CORE.twentyFourMountains[i];
    var isYang = YANG_MOUNTAINS.has(mtn);
    // 从北（-90°）顺时针，每山 15°；"子"居中于 0°
    var centerDeg = (i - 1) * 15;
    var startAngle = (centerDeg - 7.5 - 90) * DEG;
    var endAngle   = (centerDeg + 7.5 - 90) * DEG;

    drawRingSector(ctx, cx, cy, R1i, R1, startAngle, endAngle,
      isYang ? "#FFE0B2" : "#B3E5FC", "#bbb");

    var midAngle = (startAngle + endAngle) / 2;
    var textR = (R1 + R1i) / 2;
    drawRadialLabel(ctx, mtn, midAngle, textR, cx, cy, {
      color: isYang ? "#BF360C" : "#01579B",
      size:  12
    });
  }

  // 外环边框
  strokeRing(ctx, cx, cy, R1, "#888", 1.5);
  strokeRing(ctx, cx, cy, R1i, "#888", 1.5);

  // ── 中环：八卦 ──
  var triEntries = Object.keys(CORE.trigramDirection)
    .map(function (k) { return { tri: k, info: CORE.trigramDirection[k] }; })
    .sort(function (a, b) { return a.info.deg - b.info.deg; });

  triEntries.forEach(function (entry) {
    var tri = entry.tri;
    var deg = entry.info.deg;
    var startAngle = (deg - 22.5 - 90) * DEG;
    var endAngle   = (deg + 22.5 - 90) * DEG;

    drawRingSector(ctx, cx, cy, R2i, R2, startAngle, endAngle, "#F5F5F5", "#bbb");

    var midAngle = (startAngle + endAngle) / 2;
    var textR = (R2 + R2i) / 2;
    var symIdx = CORE.trigrams.indexOf(tri);
    var symbol = CORE.trigramsSymbol[symIdx];

    // 符号靠外，卦名靠内
    drawRadialLabel(ctx, symbol, midAngle, textR + 6, cx, cy, { color: "#222", size: 17 });
    drawRadialLabel(ctx, tri,    midAngle, textR - 12, cx, cy, { color: "#666", size: 11 });
  });

  // 中环边框
  strokeRing(ctx, cx, cy, R2, "#888", 1.5);
  strokeRing(ctx, cx, cy, R2i, "#888", 1.5);

  // ── 内环：八方向 ──
  triEntries.forEach(function (entry) {
    var deg = entry.info.deg;
    var label = entry.info.label;
    var startAngle = (deg - 22.5 - 90) * DEG;
    var endAngle   = (deg + 22.5 - 90) * DEG;

    drawRingSector(ctx, cx, cy, R3i, R3, startAngle, endAngle, "#FAFAFA", "#bbb");

    var midAngle = (startAngle + endAngle) / 2;
    var textR = (R3 + R3i) / 2;
    drawRadialLabel(ctx, label, midAngle, textR, cx, cy, { color: "#333", size: 13, bold: true });
  });

  // 内环边框
  strokeRing(ctx, cx, cy, R3, "#888", 1.5);
  strokeRing(ctx, cx, cy, R3i, "#888", 1.5);

  // ── 中心：罗盘十字 ──
  ctx.beginPath();
  ctx.arc(cx, cy, RC, 0, Math.PI * 2);
  ctx.fillStyle = "#FFF";
  ctx.fill();
  strokeRing(ctx, cx, cy, RC, "#888", 1.5);

  var crossDirs = [
    { label: "北", angle: -90, color: "#D32F2F" },
    { label: "南", angle:  90, color: "#333" },
    { label: "东", angle:   0, color: "#333" },
    { label: "西", angle: 180, color: "#333" }
  ];

  var lineLen = RC * 0.72;
  crossDirs.forEach(function (d) {
    var rad = d.angle * DEG;
    var x2 = cx + lineLen * Math.cos(rad);
    var y2 = cy + lineLen * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = d.color;
    ctx.lineWidth = d.angle === -90 ? 2.5 : 1.5;
    ctx.stroke();

    var lr = RC * 0.9;
    CORE.drawCenterText(ctx, d.label,
      cx + lr * Math.cos(rad),
      cy + lr * Math.sin(rad),
      { size: 11, color: d.color, bold: d.angle === -90 }
    );
  });

  // 中心小圆点
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#333";
  ctx.fill();
}


// ─── 飞星渲染（九宫飞星） ──────────────────────────────

/**
 * 渲染九宫飞星图
 * @param {string} canvasId
 * @param {{ year: number }} data
 */
function flyingStarsRender(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var W = 350, H = 350;
  var ctx = CORE.setupHiDPI(canvas, W, H);
  CORE.clearCanvas(canvas);

  var year = (data && data.year) || new Date().getFullYear();
  var flyingStars = CORE.getFlyingStars(year);

  // ── 标题 ──
  CORE.drawCenterText(ctx, "\u516C\u5143 " + year + " \u5E74 \u4E5D\u5BAB\u98DE\u661F\u56FE", W / 2, 18, {
    size: 14, color: "#333", bold: true
  });

  // ── 九宫格 ──
  var gridAreaTop = 34;
  var gridAreaBot = 36;
  var gridAreaH = H - gridAreaTop - gridAreaBot;

  var cellW = Math.floor(gridAreaH / 3);
  var cellH = cellW;
  var gap = 2;
  var totalW = cellW * 3 + gap * 2;
  var totalH = cellH * 3 + gap * 2;
  var gridX = Math.floor((W - totalW) / 2);
  var gridY = gridAreaTop + Math.floor((gridAreaH - totalH) / 2);

  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < 3; col++) {
      var palace = FLYING_STAR_GRID[row][col];
      var starNum = flyingStars[palace];
      var starInfo = CORE.nineStars[starNum - 1];
      var luck = starInfo.luck;
      var starName = starInfo.name;

      var x = gridX + col * (cellW + gap);
      var y = gridY + row * (cellH + gap);
      var isCenter = (row === 1 && col === 1);

      // 单元格背景（中心格加浅色叠加层）
      var bgHex = STAR_LUCK_COLORS[luck] || "#FFFFFF";
      var bgColor = isCenter ? lighten(bgHex, 0.35) : bgHex;
      CORE.drawRoundRect(ctx, x, y, cellW, cellH, 4, bgColor, "#999", isCenter ? 2 : 0.8);

      // 宫位名
      CORE.drawCenterText(ctx, palace, x + cellW / 2, y + cellH * 0.32, {
        size: isCenter ? 18 : 15, color: "#333", bold: isCenter
      });

      // 星名编号（如 "一白"）
      var starLabel = starNum + starName;
      var tColor = luckTextColor(luck);
      CORE.drawCenterText(ctx, starLabel, x + cellW / 2, y + cellH * 0.66, {
        size: isCenter ? 15 : 12, color: tColor, bold: true
      });

      // 中心格高亮外框
      if (isCenter) {
        ctx.save();
        ctx.strokeStyle = "#E65100";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);
        ctx.restore();
      }
    }
  }

  // ── 五黄煞 / 二黑煞 警告 ──
  var wuHuang = "", erHei = "";
  Object.keys(flyingStars).forEach(function (p) {
    if (flyingStars[p] === 5) wuHuang = p;
    if (flyingStars[p] === 2) erHei = p;
  });

  var warnBaseY = H - 16;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "11px " + FONT_FAMILY;

  ctx.fillStyle = "#D32F2F";
  ctx.fillText(
    "\u4E94\u9EC4\u6740\u5165" + wuHuang + "\u5BAB\uFF08\u5927\u51F6\uFF09\u2500 \u5B9C\u9759\u4E0D\u5B9C\u52A8",
    W / 2, warnBaseY - 11
  );

  ctx.fillStyle = "#F48FB1";
  ctx.fillText(
    "\u4E8C\u9ED1\u6740\u5165" + erHei + "\u5BAB\uFF08\u75C5\u7B26\u661F\uFF09\u2500 \u6CE8\u610F\u5065\u5EB7",
    W / 2, warnBaseY + 7
  );
}


// ─── 八宅渲染（八宅命盘） ──────────────────────────────

/**
 * 渲染八宅命盘图
 * @param {string} canvasId
 * @param {{ year: number, gender: "男"|"女" }} data
 */
function eightMansionsRender(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var W = 500, H = 500;
  var ctx = CORE.setupHiDPI(canvas, W, H);
  CORE.clearCanvas(canvas);

  var year = data.year;
  var gender = data.gender;
  var mingGua = CORE.calcMingGua(year, gender);
  var masterTri = mingGua.trigram;
  var masterGroup = mingGua.group;

  var cx = W / 2, cy = H / 2;

  // ── 标题 ──
  CORE.drawCenterText(ctx,
    "\u516B\u5B85\u547D\u76D8 \u2014 " + year + "\u5E74 " + gender + "\u547D",
    W / 2, 18,
    { size: 15, color: "#333", bold: true }
  );

  // 辅助：方向名 → 角度
  var dirToDeg = {};
  Object.keys(CORE.trigramDirection).forEach(function (k) {
    dirToDeg[CORE.trigramDirection[k].label] = CORE.trigramDirection[k].deg;
  });

  // ── 绘制八方向扇区（背景色按吉凶） ──
  var ringIn = 75;
  var ringOut = 225;

  DIR_NAMES.forEach(function (dirName) {
    var deg = dirToDeg[dirName];
    var startAngle = (deg - 22.5 - 90) * DEG;
    var endAngle   = (deg + 22.5 - 90) * DEG;

    var star = EIGHT_MANSIONS_DATA[masterTri][dirName];
    var starInfo = CORE.eightMansionStars[star];
    var luck = starInfo.luck;

    var color = MANSION_COLORS[luck] || "#9E9E9E";
    var fillColor = color + "22"; // 低透明度背景
    drawRingSector(ctx, cx, cy, ringIn, ringOut, startAngle, endAngle, fillColor, "#ddd");

    var midAngle = (startAngle + endAngle) / 2;

    // 方向名（靠内）
    var r1 = ringIn + 20;
    drawRadialLabel(ctx, dirName, midAngle, r1, cx, cy, {
      color: "#444", size: 13, bold: true
    });

    // 星曜名（中间，大字）
    var r2 = ringIn + 56;
    drawRadialLabel(ctx, star, midAngle, r2, cx, cy, {
      color: color, size: 16, bold: true
    });

    // 吉凶等级（靠外）
    var r3 = ringIn + 90;
    var luckLabel = "【" + luck + "】";
    drawRadialLabel(ctx, luckLabel, midAngle, r3, cx, cy, {
      color: color, size: 11
    });

    // 星曜含义（最外，小字）
    var r4 = ringIn + 120;
    drawRadialLabel(ctx, starInfo.meaning, midAngle, r4, cx, cy, {
      color: "#777", size: 10
    });
  });

  // 扇区环边框
  strokeRing(ctx, cx, cy, ringOut, "#aaa", 1);
  strokeRing(ctx, cx, cy, ringIn, "#aaa", 1);

  // 分隔线（每 45°）
  DIR_NAMES.forEach(function (dirName) {
    var deg = dirToDeg[dirName];
    var rad = (deg - 90) * DEG;
    ctx.beginPath();
    ctx.moveTo(cx + ringIn * Math.cos(rad), cy + ringIn * Math.sin(rad));
    ctx.lineTo(cx + ringOut * Math.cos(rad), cy + ringOut * Math.sin(rad));
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  // ── 中心：命卦 ──
  var centerR = 52;
  // 底色圆
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  var masterColor = MANSION_COLORS["大吉"] || "#388E3C";
  ctx.fillStyle = "#FFF";
  ctx.fill();
  ctx.strokeStyle = masterColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 命卦卦名（大字）
  var symIdx = CORE.trigrams.indexOf(masterTri);
  var triSymbol = CORE.trigramsSymbol[symIdx];
  CORE.drawCenterText(ctx, triSymbol, cx, cy - 6, {
    size: 28, color: masterColor, bold: true
  });

  // 命卦卦名文字
  CORE.drawCenterText(ctx, masterTri, cx, cy + 16, {
    size: 13, color: "#555"
  });

  // 东四命 / 西四命
  CORE.drawCenterText(ctx, masterGroup, cx, cy + 34, {
    size: 11, color: "#888"
  });
}


// ─── 鼠标悬停解释 ──────────────────────────────────────

/** 罗盘 hit-test: 检测鼠标是否在某一山/卦/方向上 */
function compassHitTest(mx, my) {
  var cx = 250, cy = 250;
  var dx = mx - cx, dy = my - cy;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 20 || dist > 240) return null;
  // canvas 坐标→数学角度（北=0°顺时针）
  var canvasAngle = Math.atan2(dy, dx);
  var degFromNorth = ((canvasAngle * 180 / Math.PI) + 90 + 360) % 360;

  // 外环：二十四山 (R1=235, R1i=195)
  if (dist >= 195 && dist <= 235) {
    var idx = Math.round((degFromNorth + 7.5) / 15) % 24;
    var mtn = CORE.twentyFourMountains[idx];
    return { term: mtn };
  }
  // 中环：八卦 (R2=190, R2i=142)
  if (dist >= 142 && dist < 195) {
    var triEntries = Object.keys(CORE.trigramDirection)
      .map(function(k) { return { tri: k, info: CORE.trigramDirection[k] }; })
      .sort(function(a, b) { return a.info.deg - b.info.deg; });
    for (var ti = 0; ti < triEntries.length; ti++) {
      var e = triEntries[ti];
      var startD = (e.info.deg - 22.5 + 360) % 360;
      var endD = (e.info.deg + 22.5 + 360) % 360;
      var d = degFromNorth;
      // 处理跨越0度
      if (startD > endD) {
        if (d >= startD || d <= endD) return { term: e.tri };
      } else {
        if (d >= startD && d <= endD) return { term: e.tri };
      }
    }
  }
  // 内环：八方向 (R3=138, R3i=88)
  if (dist >= 88 && dist < 142) {
    var dirEntries = Object.keys(CORE.trigramDirection)
      .map(function(k) { return { label: CORE.trigramDirection[k].label, deg: CORE.trigramDirection[k].deg }; })
      .sort(function(a, b) { return a.deg - b.deg; });
    for (var di = 0; di < dirEntries.length; di++) {
      var de = dirEntries[di];
      var sD = (de.deg - 22.5 + 360) % 360;
      var eD = (de.deg + 22.5 + 360) % 360;
      var d2 = degFromNorth;
      if (sD > eD) {
        if (d2 >= sD || d2 <= eD) return { term: de.label };
      } else {
        if (d2 >= sD && d2 <= eD) return { term: de.label };
      }
    }
  }
  return null;
}

/** 飞星 hit-test */
function flyingStarsHitTest(mx, my, data) {
  var W = 350, H = 350;
  var gridAreaTop = 34, gridAreaBot = 36, gap = 2;
  var gridAreaH = H - gridAreaTop - gridAreaBot;
  var cellSize = Math.floor(gridAreaH / 3);
  var totalW = cellSize * 3 + gap * 2;
  var totalH = cellSize * 3 + gap * 2;
  var gridX = Math.floor((W - totalW) / 2);
  var gridY = gridAreaTop + Math.floor((gridAreaH - totalH) / 2);
  var col = Math.floor((mx - gridX) / (cellSize + gap));
  var row = Math.floor((my - gridY) / (cellSize + gap));
  if (col < 0 || col > 2 || row < 0 || row > 2) return null;
  var palace = FLYING_STAR_GRID[row][col];
  var year = (data && data.year) || new Date().getFullYear();
  var flyingStars = CORE.getFlyingStars(year);
  var starNum = flyingStars[palace];
  var starInfo = CORE.nineStars[starNum - 1];
  return { term: starInfo.name, explanation: "<b>" + starInfo.name + "</b>（" + starInfo.luck + "），入" + palace + "宫。" + (CORE.explain(starInfo.name) || "") };
}

/** 八宅 hit-test */
function eightMansionsHitTest(mx, my, data) {
  var cx = 250, cy = 250;
  var dx = mx - cx, dy = my - cy;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var canvasAngle = Math.atan2(dy, dx);
  var degFromNorth = ((canvasAngle * 180 / Math.PI) + 90 + 360) % 360;
  // 中心命卦区
  if (dist < 52) {
    return { term: CORE.calcMingGua(data.year, data.gender).trigram, explanation: "<b>命卦</b>：" + CORE.calcMingGua(data.year, data.gender).trigram + "卦 · " + CORE.calcMingGua(data.year, data.gender).group };
  }
  // 八方向环 (ringIn=75, ringOut=225)
  if (dist >= 75 && dist <= 225) {
    var dirToDeg = {};
    Object.keys(CORE.trigramDirection).forEach(function(k) {
      dirToDeg[CORE.trigramDirection[k].label] = CORE.trigramDirection[k].deg;
    });
    for (var i = 0; i < DIR_NAMES.length; i++) {
      var dirName = DIR_NAMES[i];
      var deg = dirToDeg[dirName];
      var sD = (deg - 22.5 + 360) % 360;
      var eD = (deg + 22.5 + 360) % 360;
      var d = degFromNorth;
      var match = false;
      if (sD > eD) { match = (d >= sD || d <= eD); }
      else { match = (d >= sD && d <= eD); }
      if (match) {
        var mingGua = CORE.calcMingGua(data.year, data.gender);
        var star = EIGHT_MANSIONS_DATA[mingGua.trigram][dirName];
        return { term: star, explanation: "<b>" + star + "</b>在" + dirName + "方<br>" + (CORE.eightMansionStars[star] ? CORE.eightMansionStars[star].meaning : "") + "<br>" + (CORE.explain(star) || "") };
      }
    }
  }
  return null;
}

// ─── 模块注册 ────────────────────────────────────────────

registerVizModule("fengshui", {
  // 暴露八宅游年映射表，供 React SVG 组件复用同一份规则数据
  eightMansionsData: EIGHT_MANSIONS_DATA,
  renderCompass: function(canvasId) {
    compassRender(canvasId);
    if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
      return compassHitTest(mx, my);
    });
  },
  renderFlyingStars: function(canvasId, data) {
    flyingStarsRender(canvasId, data);
    if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
      return flyingStarsHitTest(mx, my, data);
    });
  },
  renderEightMansions: function(canvasId, data) {
    eightMansionsRender(canvasId, data);
    if (window.CORE) CORE.bindCanvasTooltip(canvasId, function(mx, my) {
      return eightMansionsHitTest(mx, my, data);
    });
  }
});
