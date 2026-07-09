/**
 * liuyao-engine.js — 六爻纳甲本地引擎
 *
 * 实现京房八宫纳甲体系：起卦、64卦表、纳甲(天干地支)、六亲、六神、世应、用神、变卦。
 * 规则来源：《京房易传》八宫纳甲、《增删卜易》《卜筮正宗》六亲世应、日干安六神。
 *
 * 与 ichingshifa (bopo/najia 参考) 同口径：爻值 6=老阴(变) 7=少阳 8=少阴 9=老阳(变)，
 * 从初爻到上爻排列。本引擎为纯 JS 自研，不依赖 Python / 网络服务。
 *
 * 暴露 window.LiuyaoEngine.calculate(input) → 结构化结果，字段对齐 divination.js 渲染契约：
 *   lines[6]: { yin, changing, god, branch, relation }
 *   hexagramName, hexagramNumber, isOriginal, yongShen, shiYao, yingYao
 * 并额外输出纳甲/六亲/天干/五行等完整字段供 toReading 与报告导出使用。
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  // ─── 八卦：爻线从初爻(下)到上爻(顶)，true=阴 ───
  // 权威八卦(初/中/上)：乾三连[阳阳阳] 兑上缺[阳阳阴] 离中虚[阳阴阳] 震仰盂[阳阴阴]
  //                   巽下断[阴阳阳] 坎中满[阴阳阴] 艮覆碗[阴阴阳] 坤六断[阴阴阴]
  // 复用 engine-adapters.js 的 MEIHUA_NATURE 口径(true=阴)，独立定义避免加载顺序耦合。
  var TRIGRAM_LINES = {
    "乾": [false, false, false], // ☇ 阳阳阳
    "兑": [false, false, true],  // ☱ 阳阳阴(上缺)
    "离": [false, true, false],  // ☲ 阳阴阳(中虚)
    "震": [false, true, true],   // ☳ 阳阴阴(初阳,仰盂)
    "巽": [true, false, false],  // ☴ 阴阳阳(初阴,下断)
    "坎": [true, false, true],   // ☵ 阴阳阴(中满)
    "艮": [true, true, false],   // ☶ 阴阴阳(上阳,覆碗)
    "坤": [true, true, true]     // ☷ 阴阴阴
  };
  var TRIGRAM_ELEMENT = {
    "乾": "金", "兑": "金", "离": "火", "震": "木",
    "巽": "木", "坎": "水", "艮": "土", "坤": "土"
  };

  // ─── 八宫：每宫首卦为本宫卦，其余按一世→五世→游魂→归魂演变 ───
  // 八宫序（京房）：乾、坎、艮、震、巽、离、坤、兑
  // 每宫 8 卦顺序：本宫、一世、二世、三世、四世、五世、游魂、归魂
  // 演变规则：本宫→初爻逐爻往上变(一世..五世)；游魂=四爻复变回本宫；归魂=上卦保持游魂、下卦回到本宫。
  // 下为每宫 8 个 [上卦, 下卦]，由上述确定性算法生成并校对《京房易传》八宫表（乾宫：乾/姤/遁/否/观/剥/晋/大有 等）。
  var PALACE_HEXAGRAMS = {
    "乾宫": [["乾", "乾"], ["乾", "巽"], ["乾", "艮"], ["乾", "坤"], ["巽", "坤"], ["艮", "坤"], ["离", "坤"], ["离", "乾"]],
    "坎宫": [["坎", "坎"], ["坎", "兑"], ["坎", "震"], ["坎", "离"], ["兑", "离"], ["震", "离"], ["坤", "离"], ["坤", "坎"]],
    "艮宫": [["艮", "艮"], ["艮", "离"], ["艮", "乾"], ["艮", "兑"], ["离", "兑"], ["乾", "兑"], ["巽", "兑"], ["巽", "艮"]],
    "震宫": [["震", "震"], ["震", "坤"], ["震", "坎"], ["震", "巽"], ["坤", "巽"], ["坎", "巽"], ["兑", "巽"], ["兑", "震"]],
    "巽宫": [["巽", "巽"], ["巽", "乾"], ["巽", "离"], ["巽", "震"], ["乾", "震"], ["离", "震"], ["艮", "震"], ["艮", "巽"]],
    "离宫": [["离", "离"], ["离", "艮"], ["离", "巽"], ["离", "坎"], ["艮", "坎"], ["巽", "坎"], ["乾", "坎"], ["乾", "离"]],
    "坤宫": [["坤", "坤"], ["坤", "震"], ["坤", "兑"], ["坤", "乾"], ["震", "乾"], ["兑", "乾"], ["坎", "乾"], ["坎", "坤"]],
    "兑宫": [["兑", "兑"], ["兑", "坎"], ["兑", "坤"], ["兑", "艮"], ["坎", "艮"], ["坤", "艮"], ["震", "艮"], ["震", "兑"]]
  };

  // ─── 64 卦名表：键 = 上卦+下卦 ───
  // 依据《周易》通行本卦序与卦名。索引为 "上卦|下卦"。
  var HEXAGRAM_NAMES = {
    "乾|乾": "乾为天", "坤|坤": "坤为地", "震|震": "震为雷", "巽|巽": "巽为风",
    "坎|坎": "坎为水", "离|离": "离为火", "艮|艮": "艮为山", "兑|兑": "兑为泽",
    "乾|坤": "天地否", "坤|乾": "地天泰", "乾|震": "天雷无妄", "震|乾": "雷天大壮",
    "乾|巽": "天风姤", "巽|乾": "风天小畜", "乾|坎": "天水讼", "坎|乾": "水天需",
    "乾|离": "天火同人", "离|乾": "火天大有", "乾|艮": "天山遁", "艮|乾": "山天大畜",
    "乾|兑": "天泽履", "兑|乾": "泽天夬", "坤|震": "地雷复", "震|坤": "雷地豫",
    "坤|巽": "地风升", "巽|坤": "风地观", "坤|坎": "地水师", "坎|坤": "水地比",
    "坤|离": "地火明夷", "离|坤": "火地晋", "坤|艮": "地山谦", "艮|坤": "山地剥",
    "坤|兑": "地泽临", "兑|坤": "泽地萃", "震|巽": "雷风恒", "巽|震": "风雷益",
    "震|坎": "雷水解", "坎|震": "水雷屯", "震|离": "雷火丰", "离|震": "火雷噬嗑",
    "震|艮": "雷山小过", "艮|震": "山雷颐", "震|兑": "雷泽归妹", "兑|震": "泽雷随",
    "巽|坎": "风水涣", "坎|巽": "水风井", "巽|离": "风火家人", "离|巽": "火风鼎",
    "巽|艮": "风山渐", "艮|巽": "山风蛊", "巽|兑": "风泽中孚", "兑|巽": "泽风大过",
    "坎|离": "水火既济", "离|坎": "火水未济", "坎|艮": "水山蹇", "艮|坎": "山水蒙",
    "坎|兑": "水泽节", "兑|坎": "泽水困", "离|艮": "火山旅", "艮|离": "山火贲",
    "离|兑": "火泽睽", "兑|离": "泽火革", "艮|兑": "山泽损", "兑|艮": "泽山咸"
  };

  // ─── 八宫纳甲表：内卦(下卦)与外卦(上卦)各自纳的天干 + 起始地支 ───
  // 京房纳甲规则：内卦纳甲按卦序，外卦纳甲另配。地支按阳顺阴逆排布。
  // key = 卦名(八卦)，value = { stem: 天干, startBranch: 起始地支序(0-11),顺逆 }
  // 内卦(下卦)纳甲：乾内甲子、坎内戊寅、艮内丙辰、震内庚子、巽内辛丑、离内己卯、坤内乙未、兑内丁巳
  // 外卦(上卦)纳甲：乾外壬午、坎外戊申、艮外丙戌、震外庚午、巽外辛未、离外己酉、坤外癸丑、兑外丁亥
  // 地支排布：阳卦(乾/坎/艮/震 阳支 顺行 子寅辰午申戌)；阴卦(巽/离/坤/兑 阴支 逆行 丑亥酉未巳卯)
  // 注：乾震同阳支顺行，坤巽离兑用阴支逆行；下卦三爻地支、上卦三爻地支各成序列。
  var NAJIA_INNER = {
    "乾": { stem: "甲", start: "子", dir: "yang" },
    "坎": { stem: "戊", start: "寅", dir: "yang" },
    "艮": { stem: "丙", start: "辰", dir: "yang" },
    "震": { stem: "庚", start: "子", dir: "yang" },
    "巽": { stem: "辛", start: "丑", dir: "yin" },
    "离": { stem: "己", start: "卯", dir: "yin" },
    "坤": { stem: "乙", start: "未", dir: "yin" },
    "兑": { stem: "丁", start: "巳", dir: "yin" }
  };
  var NAJIA_OUTER = {
    "乾": { stem: "壬", start: "午", dir: "yang" },
    "坎": { stem: "戊", start: "申", dir: "yang" },
    "艮": { stem: "丙", start: "戌", dir: "yang" },
    "震": { stem: "庚", start: "午", dir: "yang" },
    "巽": { stem: "辛", start: "未", dir: "yin" },
    "离": { stem: "己", start: "酉", dir: "yin" },
    "坤": { stem: "癸", start: "丑", dir: "yin" },
    "兑": { stem: "丁", start: "亥", dir: "yin" }
  };

  // 阳支顺行序列（从子起）：子寅辰午申戌
  var YANG_BRANCHES = ["子", "寅", "辰", "午", "申", "戌"];
  // 阴支逆行序列（从丑起逆）：丑亥酉未巳卯
  var YIN_BRANCHES = ["丑", "亥", "酉", "未", "巳", "卯"];

  // 从起始地支按方向顺/逆取 count 支
  function takeBranchSeq(start, dir, count) {
    var seq = dir === "yang" ? YANG_BRANCHES : YIN_BRANCHES;
    var idx = seq.indexOf(start);
    if (idx < 0) idx = 0;
    var out = [];
    for (var i = 0; i < count; i++) out.push(seq[(idx + i) % seq.length]);
    return out;
  }

  // ─── 六神：按日干起，从初爻安放到上爻 ───
  // 甲乙日青龙起初爻，丙丁日朱雀起，戊日勾陈起，己日螣蛇起，庚辛日白虎起，壬癸日玄武起。
  // 六神顺序（从初爻到上爻）：青龙、朱雀、勾陈、螣蛇(滕蛇)、白虎、玄武
  var SIX_GODS = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
  var DAY_STEM_GOD_START = {
    "甲": 0, "乙": 0, "丙": 1, "丁": 1, "戊": 2,
    "己": 3, "庚": 4, "辛": 4, "壬": 5, "癸": 5
  };

  // ─── 六亲：按宫卦五行与本爻地支五行的生克关系定 ───
  // 五行：金、木、水、火、土
  // 六亲：生我者父母、同我者兄弟、我生子孙、我克者妻财、克我者官鬼
  var BRANCH_ELEMENT = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
    "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"
  };
  var GENERATES = { "金": "水", "水": "木", "木": "火", "火": "土", "土": "金" };
  var CONTROLS = { "金": "木", "木": "土", "土": "水", "水": "火", "火": "金" };

  function sixRelation(palaceElement, branchElement) {
    if (palaceElement === branchElement) return "兄弟";
    if (GENERATES[branchElement] === palaceElement) return "父母"; // 生我者
    if (GENERATES[palaceElement] === branchElement) return "子孙"; // 我生者
    if (CONTROLS[palaceElement] === branchElement) return "妻财"; // 我克者
    if (CONTROLS[branchElement] === palaceElement) return "官鬼"; // 克我者
    return "兄弟";
  }

  // ─── 世应：按八宫内卦序（本宫/一世..五世/游魂/归魂）定世爻位置 ───
  // 本宫卦世在六(上爻)，一世世在初，二世世在二，三世世在三，四世世在四，五世世在五，游魂世在四，归魂世在三。
  // 应爻 = 世爻 + 3 (隔两位)，模 6 映射到 1-6。
  var SHI_POSITION = [6, 1, 2, 3, 4, 5, 4, 3]; // index 0..7 对应本宫..归魂

  // ─── 用神选取：按问题事项类型映射六亲 ───
  // 表项：关键词 → 用神(六亲名或世爻/应爻)。顺序敏感：官鬼/父母/子孙/兄弟等专门事项优先于泛指词。
  var YONGSHEN_BY_TOPIC = [
    { kw: ["官", "功名", "事业", "工作", "求职", "升职", "晋升", "职位", "官非", "诉讼", "病", "疾", "丈夫", "男友"], yong: "官鬼" },
    { kw: ["父母", "长辈", "文书", "合同", "房屋", "房子", "车辆", "考试", "学业", "读书", "证书"], yong: "父母" },
    { kw: ["子女", "孩子", "下属", "宠物", "药", "医药", "医生", "病愈"], yong: "子孙" },
    { kw: ["兄弟", "朋友", "竞争", "同事", "同辈", "合伙"], yong: "兄弟" },
    { kw: ["财", "钱", "利", "收益", "生意", "买卖", "股票", "投资", "效益", "财运"], yong: "妻财" },
    { kw: ["世", "自己", "本人", "求测", "我"], yong: "世爻" },
    { kw: ["应", "他人", "对方", "他"], yong: "应爻" }
  ];

  // ═══════════════════════════════════════════════════════
  //  查表：从 6 爻阴阳 → 本卦(上/下卦、宫、卦名、世应)
  // ═══════════════════════════════════════════════════════

  // lines: 6 个 boolean (true=阴), 从初爻(下, index0)到上爻(顶, index5)
  function linesToTrigrams(lines) {
    var lowerLines = [lines[0], lines[1], lines[2]]; // 初二三
    var upperLines = [lines[3], lines[4], lines[5]]; // 四五上
    return { upper: trigramFromLines(upperLines), lower: trigramFromLines(lowerLines) };
  }

  function trigramFromLines(threeLines) {
    var key = threeLines.map(function (y) { return y ? "1" : "0"; }).join("");
    for (var name in TRIGRAM_LINES) {
      if (TRIGRAM_LINES[name].map(function (y) { return y ? "1" : "0"; }).join("") === key) return name;
    }
    return "乾";
  }

  // 查 64 卦表 + 八宫归属 + 宫内序号
  function lookupHexagram(upper, lower) {
    var name = HEXAGRAM_NAMES[upper + "|" + lower];
    if (!name) name = upper + lower; // 容错
    var palace = null;
    var palaceIndex = -1;
    var palaceName = null;
    Object.keys(PALACE_HEXAGRAMS).forEach(function (pn) {
      PALACE_HEXAGRAMS[pn].forEach(function (pair, idx) {
        if (pair[0] === upper && pair[1] === lower) {
          palaceName = pn;
          palace = pn.replace("宫", "");
          palaceIndex = idx;
        }
      });
    });
    if (!palaceName) {
      // 容错：未命中八宫表（不应发生），按宫卦五行取本卦上卦
      palace = upper;
      palaceIndex = 0;
      palaceName = upper + "宫";
    }
    return {
      name: name,
      upper: upper,
      lower: lower,
      upperElement: TRIGRAM_ELEMENT[upper],
      lowerElement: TRIGRAM_ELEMENT[lower],
      palace: palace, // 八行简称如 "乾"
      palaceName: palaceName,
      palaceIndex: palaceIndex, // 0..7
      palaceElement: TRIGRAM_ELEMENT[palace]
    };
  }

  // 给定上下卦，生成 6 爻的纳甲(天干+地支)+六亲
  function buildNajia(hex) {
    var upper = hex.upper;
    var lower = hex.lower;
    var innerRule = NAJIA_INNER[lower];
    var outerRule = NAJIA_OUTER[upper];
    // 下卦三爻地支（初二三）：按内卦起始 + 方向取 3 支
    var lowerBranches = takeBranchSeq(innerRule.start, innerRule.dir, 3);
    // 上卦三爻地支（四五上）：按外卦起始 + 方向取 3 支
    var upperBranches = takeBranchSeq(outerRule.start, outerRule.dir, 3);

    var lowerStem = innerRule.stem;
    var upperStem = outerRule.stem;

    var lines = [];
    var palaceEl = hex.palaceElement;
    for (var i = 0; i < 3; i++) {
      var br = lowerBranches[i];
      lines.push({
        stem: lowerStem,
        branch: br,
        branchElement: BRANCH_ELEMENT[br],
        relation: sixRelation(palaceEl, BRANCH_ELEMENT[br])
      });
    }
    for (var j = 0; j < 3; j++) {
      var br2 = upperBranches[j];
      lines.push({
        stem: upperStem,
        branch: br2,
        branchElement: BRANCH_ELEMENT[br2],
        relation: sixRelation(palaceEl, BRANCH_ELEMENT[br2])
      });
    }
    return lines;
  }

  // 安六神：dayStem(天干字符) + lines，给每爻加 god 字段
  function assignSixGods(lines, dayStem) {
    var start = DAY_STEM_GOD_START[dayStem] != null ? DAY_STEM_GOD_START[dayStem] : 0;
    for (var i = 0; i < lines.length; i++) {
      lines[i].god = SIX_GODS[(start + i) % 6];
    }
    return lines;
  }

  // 世应
  function shiYing(hex) {
    var shi = SHI_POSITION[hex.palaceIndex] || 6;
    var ying = ((shi - 1 + 3) % 6) + 1;
    return { shi: shi, ying: ying };
  }

  // 用神：根据问题事项推六亲；命中关键词即返回对应用神，否则按性别默认(男妻财/女官鬼)，无性别取世爻
  function resolveYongShen(question, gender) {
    if (question) {
      var q = String(question);
      for (var i = 0; i < YONGSHEN_BY_TOPIC.length; i++) {
        var group = YONGSHEN_BY_TOPIC[i];
        for (var j = 0; j < group.kw.length; j++) {
          if (q.indexOf(group.kw[j]) >= 0) return group.yong;
        }
      }
    }
    if (gender === "男") return "妻财";
    if (gender === "女") return "官鬼";
    return "世爻";
  }

  // ─── 起卦方式 ───
  // method: "coin"(铜钱法,默认) | "time"(时间起卦) | "manual"(手动爻值)
  // manual: input.yaoValues = "789789" 字符串，6=老阴变 7=少阳 8=少阴 9=老阳变
  function castLines(input) {
    var method = (input && input.method) || "coin";
    if (method === "manual" && input && input.yaoValues) {
      return parseYaoValues(String(input.yaoValues));
    }
    if (method === "time" && input && input.birth) {
      return castFromTime(input.birth);
    }
    // 铜钱法：每爻三枚铜钱，正(阳2)反(阴3)
    // 二正一反=7少阳(静), 一正二反=8少阴(静), 三正=9老阳(变), 三反=6老阴(变)
    var rng = makeRng(input);
    var lines = [];
    for (var i = 0; i < 6; i++) {
      var heads = 0;
      for (var c = 0; c < 3; c++) if (rng() < 0.5) heads++;
      // heads=铜钱正面数(阳面)
      var val;
      if (heads === 3) val = 9;       // 老阳 变
      else if (heads === 2) val = 7;  // 少阳 静
      else if (heads === 1) val = 8;  // 少阴 静
      else val = 6;                   // 老阴 变
      lines.push(yaoValueToLine(val));
    }
    return lines;
  }

  function parseYaoValues(str) {
    var s = str.replace(/\s/g, "");
    if (s.length !== 6 || !/^[6-9]{6}$/.test(s)) {
      throw new Error("yaoValues 必须是 6 位 6-9 字符串（初爻到上爻）");
    }
    var lines = [];
    for (var i = 0; i < 6; i++) lines.push(yaoValueToLine(Number(s.charAt(i))));
    return lines;
  }

  // 6=老阴(变,阴) 7=少阳(静,阳) 8=少阴(静,阴) 9=老阳(变,阳)
  function yaoValueToLine(v) {
    if (v === 6) return { yin: true, changing: true };
    if (v === 7) return { yin: false, changing: false };
    if (v === 8) return { yin: true, changing: false };
    if (v === 9) return { yin: false, changing: true };
    return { yin: false, changing: false };
  }

  function castFromTime(birth) {
    // 时间起卦：取年月日时数字
    var year = Number(birth.year) || 1990;
    var month = Number(birth.month) || 6;
    var day = Number(birth.day) || 15;
    var hour = Number(birth.hour) || 12;
    var hourNum = Math.floor((hour + 1) / 2) % 12 + 1; // 时辰序数 1-12
    // 上卦 = (年+月+日) % 8，下卦 = (年+月+日+时) % 8，动爻 = (年+月+日+时) % 6
    // 映射到八卦：1乾2兑3离4震5巽6坎7艮8坤
    var trigramOrder = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
    var upperIdx = ((year + month + day) % 8) || 8;
    var lowerIdx = ((year + month + day + hourNum) % 8) || 8;
    var movingLine = ((year + month + day + hourNum) % 6) || 6;
    var upper = trigramOrder[upperIdx - 1];
    var lower = trigramOrder[lowerIdx - 1];
    // 由上下卦生成 6 爻，并标记动爻
    var lowerLines = TRIGRAM_LINES[lower].slice();
    var upperLines = TRIGRAM_LINES[upper].slice();
    var allLines = lowerLines.concat(upperLines); // 初..上
    var lines = allLines.map(function (y, idx) {
      return { yin: y, changing: (idx + 1) === movingLine };
    });
    return lines;
  }

  // 确定性 RNG：seed 来自 birth 或 input.seed，保证同输入同输出（时间起卦除外，其本身确定性）
  function makeRng(input) {
    var seed;
    if (input && input.seed != null) {
      seed = Number(input.seed) || 1;
    } else if (input && input.birth) {
      var b = input.birth;
      seed = b.year * 10000 + b.month * 100 + b.day + b.hour + (b.gender === "女" ? 7 : 3);
    } else {
      seed = 1;
    }
    var s = Math.abs(seed) % 233280;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // ═══════════════════════════════════════════════════════
  //  主入口 calculate
  // ═══════════════════════════════════════════════════════

  function calculate(input) {
    input = input || {};
    var birth = input.birth || {};
    // 取日干：优先 lunar-javascript 精确，否则用本地近似(天干按公历年月日推)
    var dayStem = resolveDayStem(birth);
    var casted = castLines(input); // 6 爻 {yin, changing}
    var tris = linesToTrigrams(casted.map(function (l) { return l.yin; }));
    var hex = lookupHexagram(tris.upper, tris.lower);
    var najiaLines = buildNajia(hex); // {stem,branch,branchElement,relation}
    assignSixGods(najiaLines, dayStem);
    var shiYingRes = shiYing(hex);

    // 合并爻：yin/changing(来自起卦) + stem/branch/relation/god(来自纳甲)
    var lines = najiaLines.map(function (nj, i) {
      return {
        yin: casted[i].yin,
        changing: casted[i].changing,
        stem: nj.stem,
        branch: nj.branch,
        branchElement: nj.branchElement,
        relation: nj.relation,
        god: nj.god
      };
    });

    var yongShen = resolveYongShen(input.question, birth.gender);

    // 补齐 ichingshifa 能力：空亡、月建日建、伏神、旺衰、身爻
    var dayGz = resolveDayGanZhi(birth);
    var dayBranch = dayGz.dayBranch || dayGz.branch || "";
    var monthBranch = dayGz.monthBranch || "";
    // 空亡
    var xunkong = dayGz.dayGanZhi ? getDayXunkong(dayGz.dayGanZhi) : [];
    // 月建日建标注
    var monthJian = monthBranch;
    var dayJian = dayBranch;
    // 旺衰
    var linesWithWangShuai = lines.map(function (l) {
      l.wangShuai = wangShuai(l.branchElement, monthBranch);
      return l;
    });
    // 伏神
    var currentRelations = lines.map(function (l) { return l.relation; });
    var hiddenStars = getHiddenStars(hex, currentRelations);
    // 身爻
    var shenYao = getShenYao(shiYingRes.shi, lines);

    // 变卦：动爻阴阳互变
    var changedLines = lines.map(function (l) {
      return { yin: l.changing ? !l.yin : l.yin };
    });
    var changedTris = linesToTrigrams(changedLines);
    var changedHex = lookupHexagram(changedTris.upper, changedTris.lower);
    var changingYao = [];
    lines.forEach(function (l, i) { if (l.changing) changingYao.push(i + 1); });

    return {
      lines: lines,
      hexagramName: hex.name,
      hexagramNumber: hexagramIndex(hex.name),
      isOriginal: true,
      yongShen: yongShen,
      shiYao: shiYingRes.shi,
      yingYao: shiYingRes.ying,
      // 完整纳甲字段（渲染器不读，但 toReading / 报告导出使用）
      palace: hex.palaceName,
      palaceElement: hex.palaceElement,
      palaceIndex: hex.palaceIndex,
      upperTrigram: hex.upper,
      lowerTrigram: hex.lower,
      dayStem: dayStem,
      changingYao: changingYao,
      changingHexagramName: changingYao.length ? changedHex.name : hex.name,
      changingHexagramNumber: changingYao.length ? hexagramIndex(changedHex.name) : hexagramIndex(hex.name),
      // 补齐 ichingshifa 能力字段
      xunkong: xunkong,                    // 空亡地支
      monthJian: monthJian,               // 月建（当月地支）
      dayJian: dayJian,                    // 日建（当日地支）
      monthGanZhi: dayGz.monthGanZhi || "", // 月干支
      dayGanZhi: dayGz.dayGanZhi || "",     // 日干支
      shenYao: shenYao,                    // 身爻位置(1-6, 0=无)
      hiddenStars: hiddenStars,            // 伏神列表
      engineName: "LocalLiuyaoNajiaAdapter",
      mode: "local-exact",
      version: "1.0.0",
      sourceProject: "local:visual/js/engines/liuyao-engine.js; reference: bopo/najia, ichingshifa",
      license: "project-local",
      confidenceNote: "本地京房八宫纳甲自研规则：纳甲/六亲/六神/世应/用神/变卦；起卦支持铜钱法、时间起卦、手动爻值。不同流派在纳甲地支顺逆与六神起例上可能存在口径差异。"
    };
  }

  // 卦序号：从 HEXAGRAM_NAMES 顺序推
  var _hexOrder = null;
  function hexagramIndex(name) {
    if (!_hexOrder) {
      _hexOrder = [];
      Object.keys(HEXAGRAM_NAMES).forEach(function (k) { _hexOrder.push(HEXAGRAM_NAMES[k]); });
    }
    var idx = _hexOrder.indexOf(name) + 1;
    return idx || 0;
  }

  // ═══════════════════════════════════════════════════════
  //  补齐 ichingshifa 能力：空亡、月建日建、伏神、旺衰、身爻
  // ═══════════════════════════════════════════════════════

  var DIZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var TIANGAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

  // 六十甲子
  var JIAZI = [];
  for (var _jz = 0; _jz < 60; _jz++) {
    JIAZI.push(TIANGAN[_jz % 10] + DIZHI[_jz % 12]);
  }

  // 旬空表：每个旬首对应的两个空亡地支
  // 甲子旬空戌亥、甲戌旬空申酉、甲申旬空午未、甲午旬空辰巳、甲辰旬空寅卯、甲寅旬空子丑
  var XUNKONG = {
    "甲子": ["戌","亥"], "甲戌": ["申","酉"], "甲申": ["午","未"],
    "甲午": ["辰","巳"], "甲辰": ["寅","卯"], "甲寅": ["子","丑"]
  };

  // 计算空亡：给定日干支，查其所在旬的空亡地支
  function getDayXunkong(dayGanZhi) {
    if (!dayGanZhi || dayGanZhi.length < 2) return [];
    var idx = JIAZI.indexOf(dayGanZhi);
    if (idx < 0) return [];
    var xunStart = Math.floor(idx / 10) * 10; // 旬首在六十甲子中的索引
    var xunHead = JIAZI[xunStart]; // 旬首（甲子/甲戌/...）
    return XUNKONG[xunHead] || [];
  }

  // 月令旺衰：按月支判断五行旺衰（旺相休囚死）
  // 当令者旺、生令者相、生我者休、克我者囚、我克者死
  var MONTH_ELEMENT = {
    "寅":"木","卯":"木", "巳":"火","午":"火", "申":"金","酉":"金",
    "亥":"水","子":"水", "丑":"土","辰":"土","未":"土","戌":"土"
  };

  function wangShuai(element, monthBranch) {
    var monthEl = MONTH_ELEMENT[monthBranch];
    if (!monthEl || !element) return "平";
    if (element === monthEl) return "旺";           // 同我=旺
    if (GENERATES[monthEl] === element) return "相"; // 生我=相（月令生此五行）
    if (GENERATES[element] === monthEl) return "休"; // 我生=休
    if (CONTROLS[element] === monthEl) return "囚"; // 我克月令=囚
    if (CONTROLS[monthEl] === element) return "死"; // 月令克我=死
    return "平";
  }

  // 身爻：按世爻位置推算
  // 阳世阴身、阴世阳身规则：世爻地支阴阳决定身爻位置
  // 简化规则（ichingshifa 口径）：身爻 = 世爻所在卦的地支序对应位置
  // 更准确：身爻在世爻对面，按地支相冲定
  function getShenYao(shiPos, lines) {
    if (!shiPos || shiPos < 1 || shiPos > 6) return 0;
    var shiBranch = lines[shiPos - 1] ? lines[shiPos - 1].branch : "";
    if (!shiBranch) return 0;
    // 身爻 = 与世爻地支相冲的爻位
    var chongMap = {"子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅",
                    "卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳"};
    var chongBranch = chongMap[shiBranch];
    if (!chongBranch) return 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].branch === chongBranch) return i + 1;
    }
    return 0;
  }

  // 伏神：本宫纯卦有而当前卦缺的六亲
  // 逻辑（najia 口径）：取本宫卦的六亲列表，找当前卦缺少的六亲
  function getHiddenStars(hex, currentRelations) {
    var palacePure = PALACE_HEXAGRAMS[hex.palaceName][0]; // 本宫纯卦 [上卦, 下卦]
    var pureUpper = palacePure[0];
    var pureLower = palacePure[1];
    // 构建本宫纯卦的六亲
    var pureHex = { upper: pureUpper, lower: pureLower, palaceElement: hex.palaceElement };
    var pureNajia = buildNajia(pureHex);
    var pureRelations = pureNajia.map(function (nj) { return nj.relation; });
    // 找当前卦缺少的六亲
    var currentSet = {};
    currentRelations.forEach(function (r) { currentSet[r] = true; });
    var missing = [];
    for (var i = 0; i < pureRelations.length; i++) {
      if (!currentSet[pureRelations[i]]) {
        missing.push({
          relation: pureRelations[i],
          hiddenStem: pureNajia[i].stem,
          hiddenBranch: pureNajia[i].branch,
          hiddenBranchElement: pureNajia[i].branchElement,
          hiddenAtPureYao: i + 1
        });
      }
    }
    // 去重
    var seen = {};
    return missing.filter(function (m) {
      if (seen[m.relation]) return false;
      seen[m.relation] = true;
      return true;
    });
  }

  // 日干支完整获取（含日支，用于月建日建）
  function resolveDayGanZhi(birth) {
    if (birth && birth.useExactCalendar !== false && typeof window !== "undefined" &&
        window.Solar && (typeof window.Solar.fromYmdHms === "function" || typeof window.Solar.fromYmd === "function")) {
      try {
        var solar = window.Solar.fromYmdHms
          ? window.Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour || 12, birth.minute || 0, 0)
          : window.Solar.fromYmd(birth.year, birth.month, birth.day);
        var lunar = solar && typeof solar.getLunar === "function" ? solar.getLunar() : null;
        if (lunar) {
          var dayGz = "";
          if (typeof lunar.getDayInGanZhiExact === "function") dayGz = lunar.getDayInGanZhiExact();
          else if (typeof lunar.getDayInGanZhi === "function") dayGz = lunar.getDayInGanZhi();
          if (dayGz && dayGz.length === 2) return { stem: dayGz[0], branch: dayGz[1], ganZhi: dayGz };
          var monthGz = "";
          if (typeof lunar.getMonthInGanZhiExact === "function") monthGz = lunar.getMonthInGanZhiExact();
          else if (typeof lunar.getMonthInGanZhi === "function") monthGz = lunar.getMonthInGanZhi();
          if (monthGz && monthGz.length === 2) return { dayStem: dayGz[0], dayBranch: dayGz[1], dayGanZhi: dayGz, monthStem: monthGz[0], monthBranch: monthGz[1], monthGanZhi: monthGz };
        }
      } catch (e) {}
    }
    // 近似回退
    return { dayStem: resolveDayStem(birth), dayBranch: "", dayGanZhi: "", monthBranch: "", monthGanZhi: "" };
  }

  // 日干：优先 lunar-javascript；否则按公历近似(基准日推算)
  function resolveDayStem(birth) {
    if (birth && birth.useExactCalendar !== false && typeof window !== "undefined" &&
        window.Solar && (typeof window.Solar.fromYmdHms === "function" || typeof window.Solar.fromYmd === "function")) {
      try {
        var solar = window.Solar.fromYmdHms
          ? window.Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour || 12, birth.minute || 0, 0)
          : window.Solar.fromYmd(birth.year, birth.month, birth.day);
        var lunar = solar && typeof solar.getLunar === "function" ? solar.getLunar() : null;
        if (lunar) {
          // lunar-javascript: getDay() 返回农历日数字；getDayGan() 返回天干字符，getDayInGanZhi() 返回干支串
          var dayStem = "";
          if (typeof lunar.getDayGan === "function") dayStem = String(lunar.getDayGan() || "");
          if (!dayStem && typeof lunar.getDayInGanZhi === "function") dayStem = String(lunar.getDayInGanZhi() || "").charAt(0);
          if (!dayStem && typeof lunar.getDayGanZhi === "function") dayStem = String(lunar.getDayGanZhi() || "").charAt(0);
          dayStem = dayStem.replace(/\s/g, "");
          if (dayStem.length >= 1 && /甲|乙|丙|丁|戊|己|庚|辛|壬|癸/.test(dayStem.charAt(0))) return dayStem.charAt(0);
        }
      } catch (e) {
        // 降级到近似
      }
    }
    return approxDayStem(birth.year || 1990, birth.month || 6, birth.day || 15);
  }

  function approxDayStem(year, month, day) {
    var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    // 蔡勒公式算星期几不直接得干支；改用基准日 1900-01-31 为甲辰日推算
    // 1900-01-31 (公历) 日干支序为 41 (甲辰)，甲为 stem[0]
    var base = new Date(1900, 0, 31);
    var target = new Date(year, (month || 1) - 1, day || 1);
    if (isNaN(target.getTime())) return "甲";
    var diffDays = Math.round((target.getTime() - base.getTime()) / 86400000);
    var stemIdx = ((41 + diffDays - 1) % 10 + 10) % 10; // 41→甲(0)
    return STEMS[stemIdx];
  }

  window.LiuyaoEngine = {
    calculate: calculate,
    // 暴露内部函数便于测试
    _internal: {
      linesToTrigrams: linesToTrigrams,
      trigramFromLines: trigramFromLines,
      lookupHexagram: lookupHexagram,
      buildNajia: buildNajia,
      assignSixGods: assignSixGods,
      shiYing: shiYing,
      resolveYongShen: resolveYongShen,
      castLines: castLines,
      parseYaoValues: parseYaoValues,
      yaoValueToLine: yaoValueToLine,
      sixRelation: sixRelation,
      PALACE_HEXAGRAMS: PALACE_HEXAGRAMS,
      HEXAGRAM_NAMES: HEXAGRAM_NAMES
    }
  };
})();
