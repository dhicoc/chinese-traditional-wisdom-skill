(function () {
  "use strict";

  var tools = [
    {
      id: "home",
      title: "首页",
      icon: "☯",
      category: "入口",
      entryTab: "home",
      capabilityKey: "dashboard",
      questionTypes: ["总览", "导航"],
      requiredInputs: [],
      privacyLevel: "none",
      reportSection: "overview",
      accent: "#C9A86A",
      intro: "工具总览与能力边界。",
      description: "按命盘、卜筮、风水、健康、知识分组进入各个可视化工具。"
    },
    {
      id: "bazi",
      title: "八字命盘",
      icon: "◉",
      category: "命盘",
      entryTab: "bazi",
      capabilityKey: "bazi",
      questionTypes: ["命盘", "五行", "体质参考"],
      requiredInputs: ["出生年", "月", "日", "时", "性别"],
      privacyLevel: "birth-partial",
      reportSection: "bazi",
      accent: "#D7B56D",
      intro: "四柱、五行和日主结构。",
      description: "内置精确历法读取节气干支，可关闭后回退本地近似模式。"
    },
    {
      id: "ziwei",
      title: "紫微斗数",
      icon: "✦",
      category: "命盘",
      entryTab: "ziwei",
      capabilityKey: "ziwei",
      questionTypes: ["十二宫", "结构观察"],
      requiredInputs: ["出生年", "性别"],
      privacyLevel: "birth-partial",
      reportSection: "ziwei",
      accent: "#A77BD8",
      intro: "十二宫结构展示。",
      description: "当前为演示结构；真实排盘将接入本地紫微 Adapter。"
    },
    {
      id: "liuyao",
      title: "六爻占卜",
      icon: "☷",
      category: "卜筮",
      entryTab: "liuyao",
      capabilityKey: "liuyao",
      questionTypes: ["占卜", "决策"],
      requiredInputs: ["问题", "起卦方式"],
      privacyLevel: "question",
      reportSection: "liuyao",
      accent: "#9D7CE0",
      intro: "六爻卦象与动爻。",
      description: "当前为演示卦象；真实纳甲、六亲、六神规则待内置。"
    },
    {
      id: "meihua",
      title: "梅花易数",
      icon: "✺",
      category: "卜筮",
      entryTab: "meihua",
      capabilityKey: "meihua",
      questionTypes: ["时间起卦", "数字起卦"],
      requiredInputs: ["时间", "数字或问题"],
      privacyLevel: "question",
      reportSection: "meihua",
      accent: "#D9B35F",
      intro: "上下卦、动爻、体用生克。",
      description: "已内置本地时间起卦 Adapter，后续补数字起卦模式。"
    },
    {
      id: "fengshui",
      title: "风水罗盘",
      icon: "◎",
      category: "风水",
      entryTab: "fengshui",
      capabilityKey: "fengshui",
      questionTypes: ["方位", "罗盘"],
      requiredInputs: ["坐向", "方位"],
      privacyLevel: "space-general",
      reportSection: "fengshui",
      accent: "#4C8FD9",
      intro: "二十四山与方位映射。",
      description: "基于内置方位表和 Canvas 绘制，支持术语引用浏览。"
    },
    {
      id: "feixing",
      title: "流年飞星",
      icon: "✧",
      category: "风水",
      entryTab: "feixing",
      capabilityKey: "feixing",
      questionTypes: ["九宫", "流年"],
      requiredInputs: ["年份"],
      privacyLevel: "year-only",
      reportSection: "feixing",
      accent: "#5EB27D",
      intro: "九宫飞星与煞位提示。",
      description: "本地规则计算入中星和九宫飞布，用于风水参考。"
    },
    {
      id: "bazhai",
      title: "八宅大游年",
      icon: "⌂",
      category: "风水",
      entryTab: "bazhai",
      capabilityKey: "bazhai",
      questionTypes: ["命卦", "宅卦"],
      requiredInputs: ["出生年", "性别", "宅卦"],
      privacyLevel: "birth-year",
      reportSection: "bazhai",
      accent: "#6CBA83",
      intro: "命卦与八方吉凶。",
      description: "本地规则推导东西四命与八方星曜，支持映射校验。"
    },
    {
      id: "yunqi",
      title: "五运六气",
      icon: "◌",
      category: "健康",
      entryTab: "yunqi",
      capabilityKey: "yunqi",
      questionTypes: ["岁运", "气候", "体质参考"],
      requiredInputs: ["年份", "日期"],
      privacyLevel: "birth-partial",
      reportSection: "yunqi",
      accent: "#C9852A",
      intro: "岁运、司天在泉和客气六步。",
      description: "内置大寒边界修正，医学相关输出仅作文化参考。"
    },
    {
      id: "tizhi",
      title: "体质辨识",
      icon: "◇",
      category: "健康",
      entryTab: "tizhi",
      capabilityKey: "tizhi",
      questionTypes: ["体质", "养生"],
      requiredInputs: ["问卷或命盘派生"],
      privacyLevel: "health-general",
      reportSection: "constitution",
      accent: "#8B5A46",
      intro: "九种体质雷达图。",
      description: "结合五行偏颇生成体质参考，不替代医疗诊断。"
    },
    {
      id: "mermaid",
      title: "知识图谱",
      icon: "⌁",
      category: "知识",
      entryTab: "mermaid",
      capabilityKey: "mermaid",
      questionTypes: ["学习", "引用"],
      requiredInputs: [],
      privacyLevel: "none",
      reportSection: "knowledge",
      accent: "#8F6A55",
      intro: "五行、风水和命理流程图。",
      description: "Mermaid 可选渲染，离线时显示降级提示并保留核心 Canvas。"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getTools() {
    return clone(tools);
  }

  function getVisibleTools() {
    return clone(tools.filter(function (tool) { return tool.id !== "home"; }));
  }

  function getCategories() {
    var seen = {};
    return tools.reduce(function (list, tool) {
      if (!seen[tool.category]) {
        seen[tool.category] = true;
        list.push(tool.category);
      }
      return list;
    }, []);
  }

  function getById(id) {
    for (var i = 0; i < tools.length; i++) {
      if (tools[i].id === id || tools[i].entryTab === id) return clone(tools[i]);
    }
    return null;
  }

  function getByCategory(category) {
    return clone(tools.filter(function (tool) { return tool.category === category && tool.id !== "home"; }));
  }

  window.ToolManifest = {
    version: "0.3.0",
    tools: tools,
    getTools: getTools,
    getVisibleTools: getVisibleTools,
    getCategories: getCategories,
    getById: getById,
    getByCategory: getByCategory
  };
})();
