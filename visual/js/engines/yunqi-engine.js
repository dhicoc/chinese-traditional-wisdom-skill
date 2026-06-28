/**
 * yunqi-engine.js — 纯 JS 五运六气推算引擎
 * 基于年干推算岁运、司天在泉、客气六步
 * 无外部依赖
 *
 * 使用: YunqiEngine.calculate(year)
 * 返回: { year, tiangan, dizhi, wuyun, liuqi, disease_tendency }
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  const TG = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const DZ = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  // 岁运表: 甲己土, 乙庚金, 丙辛水, 丁壬木, 戊癸火
  const WUYUN_TABLE = {
    "甲":"土运太过","乙":"金运不及","丙":"水运太过","丁":"木运不及","戊":"火运太过",
    "己":"土运不及","庚":"金运太过","辛":"水运不及","壬":"木运太过","癸":"火运不及"
  };

  // 司天在泉表: 子午少阴君火/阳明燥金, 丑未太阴湿土/太阳寒水, 寅申少阳相火/厥阴风木
  // 卯酉阳明燥金/少阴君火, 辰戌太阳寒水/太阴湿土, 巳亥厥阴风木/少阳相火
  const SITIAN_TABLE = {
    "子":"少阴君火","午":"少阴君火",
    "丑":"太阴湿土","未":"太阴湿土",
    "寅":"少阳相火","申":"少阳相火",
    "卯":"阳明燥金","酉":"阳明燥金",
    "辰":"太阳寒水","戌":"太阳寒水",
    "巳":"厥阴风木","亥":"厥阴风木"
  };

  const ZAIQUAN_TABLE = {
    "少阴君火":"阳明燥金","太阴湿土":"太阳寒水","少阳相火":"厥阴风木",
    "阳明燥金":"少阴君火","太阳寒水":"太阴湿土","厥阴风木":"少阳相火"
  };

  // 六客气步序: 司天为三之气, 在泉为终之气
  const LIUQI_ORDER = ["厥阴风木","少阴君火","太阴湿土","少阳相火","阳明燥金","太阳寒水"];

  // 疾病倾向
  const DISEASE_MAP = {
    "土运太过":"脾湿、腹泻、四肢沉重",
    "土运不及":"消化不良、胃胀、肌肉酸痛",
    "金运太过":"皮肤干燥、咳嗽、便秘",
    "金运不及":"免疫力下降、气喘、皮肤过敏",
    "水运太过":"水肿、肾虚、腰膝酸软、畏寒",
    "水运不及":"尿频、耳鸣、骨质疏松",
    "木运太过":"肝火旺、头痛、眼疾、易怒",
    "木运不及":"疲劳、抑郁、筋骨不利",
    "火运太过":"心火旺、失眠、高血压、口腔溃疡",
    "火运不及":"心悸、怕冷、循环不良",
    "少阴君火":"心脑血管疾病、热证",
    "太阴湿土":"脾胃失调、水肿、湿证",
    "少阳相火":"肝胆热证、炎症、上火",
    "阳明燥金":"肺燥、便秘、皮肤干燥",
    "太阳寒水":"风寒感冒、关节痛、寒证",
    "厥阴风木":"肝风、头痛、过敏、眩晕"
  };

  window.YunqiEngine = {
    /**
     * 计算五运六气
     * @param {number} year - 公历年份
     * @returns {Object}
     */
    calculate: function(year) {
      const tgIndex = (year - 4) % 10;
      const dzIndex = (year - 4) % 12;
      const tiangan = TG[tgIndex >= 0 ? tgIndex : tgIndex + 10];
      const dizhi = DZ[dzIndex >= 0 ? dzIndex : dzIndex + 12];

      const dayun = WUYUN_TABLE[tiangan] || "";
      const sitian = SITIAN_TABLE[dizhi] || "";
      const zaiquan = ZAIQUAN_TABLE[sitian] || "";

      // 主运: 木火土金水 (每年固定)
      const zhuyun = ["木","火","土","金","水"];

      // 客运: 起于岁运对应的五行
      const dayunWx = extractWuxing(dayun);
      const wxCycle = ["木","火","土","金","水"];
      const startIdx = wxCycle.indexOf(dayunWx);
      const keyun = [];
      for (let i = 0; i < 5; i++) {
        keyun.push(wxCycle[(startIdx + i) % 5]);
      }

      // 客气六步
      const sitianIdx = LIUQI_ORDER.indexOf(sitian);
      const zhuke = [];
      const stepNames = ["初之气","二之气","三之气","四之气","五之气","六之气"];
      const termPairs = [
        ["大寒","春分"],["春分","小满"],["小满","大暑"],
        ["大暑","秋分"],["秋分","小雪"],["小雪","大寒"]
      ];
      for (let i = 0; i < 6; i++) {
        const qiIdx = (sitianIdx - 2 + i + 6) % 6;
        zhuke.push({
          step: stepNames[i],
          qi: LIUQI_ORDER[qiIdx],
          start: termPairs[i][0],
          end: termPairs[i][1]
        });
      }

      // 疾病倾向
      const tendencies = [];
      if (dayun) tendencies.push(dayun);
      if (sitian) tendencies.push(sitian);
      const disease_tendency = tendencies.map(function(t) {
        return DISEASE_MAP[t] || "";
      }).filter(Boolean).join("，") || "无明显特殊倾向";

      return {
        year: year,
        tiangan: tiangan,
        dizhi: dizhi,
        wuyun: {
          dayun: dayun,
          zhuyun: zhuyun,
          keyun: keyun
        },
        liuqi: {
          sitian: sitian,
          zaiquan: zaiquan,
          zhuke: zhuke
        },
        disease_tendency: disease_tendency
      };
    }
  };

  function extractWuxing(dayun) {
    const chars = ["金","木","水","火","土"];
    for (let i = 0; i < chars.length; i++) {
      if (dayun.indexOf(chars[i]) !== -1) return chars[i];
    }
    return "土";
  }
})();
