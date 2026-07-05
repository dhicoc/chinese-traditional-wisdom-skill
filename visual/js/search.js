/**
 * search.js — 全局搜索模块
 *
 * 统一搜索三个数据源：
 * 1. CORE.termExplanations — 284 条术语通俗解释（已加载在内存中）
 * 2. mappings — 6 个风水 JSON 映射表
 * 3. knowledge-base — 30 个古籍文件
 *
 * 使用: 点击头部 🔍 按钮打开搜索浮层
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  // ─── 搜索索引 ─────────────────────────────────────

  /** 映射表索引 (自包含, 不依赖外部文件) */
  var MAPPING_INDEX = [
    {file:"life-trigram.json", title:"命卦速查表", source:"knowledge-base/fengshui/mappings/life-trigram.json", category:"八宅命卦", completeness:"完整映射", summary:"根据出生年份和性别计算东四命/西四命", tags:["命卦","东四命","西四命","八宅","八卦"]},
    {file:"eight-mansions.json", title:"八宅大游年", source:"knowledge-base/fengshui/mappings/eight-mansions.json", category:"八宅大游年", completeness:"完整映射", summary:"八宅派的八方吉凶星曜（生气/天医/延年/伏位/绝命/五鬼/六煞/祸害）", tags:["八宅","大游年","吉星","凶星","生气","绝命"]},
    {file:"twenty-four-mountains.json", title:"二十四山", source:"knowledge-base/fengshui/mappings/twenty-four-mountains.json", category:"罗盘方位", completeness:"完整映射", summary:"24山方位度数、五行属性、吉凶信息", tags:["二十四山","方位","罗盘","度数"]},
    {file:"yearly-flying-stars.json", title:"流年飞星", source:"knowledge-base/fengshui/mappings/yearly-flying-stars.json", category:"玄空飞星", completeness:"完整映射", summary:"玄空九星逐年飞布方位、吉凶色、化解方法", tags:["飞星","玄空","九星","流年","紫白"]},
    {file:"three-essentials.json", title:"阳宅三要", source:"knowledge-base/fengshui/mappings/three-essentials.json", category:"阳宅门主灶", completeness:"完整映射", summary:"阳宅门主灶三要素的吉凶判断", tags:["阳宅","三要","门","主","灶"]},
    {file:"form-sha-cures.json", title:"形煞分类与化解", source:"knowledge-base/fengshui/mappings/form-sha-cures.json", category:"形煞化解", completeness:"完整映射", summary:"常见风水形煞的识别、影响和化解方法", tags:["形煞","煞气","化解","风水"]}
  ];

  /** 古籍索引 (从 _index.md 提取) */
  var KB_INDEX = [
    {file:"01-situation-form/葬書-內篇.md", title:"葬书·内篇", author:"郭璞", category:"形势派", completeness:"完整", summary:"风水形势派纲领，论生气、藏风、得水", tags:["葬书","郭璞","形势","生气","风水"]},
    {file:"01-situation-form/葬書-外篇.md", title:"葬书·外篇", author:"郭璞", category:"形势派", completeness:"完整", summary:"葬书外篇，续论形势与山水", tags:["葬书","郭璞","形势"]},
    {file:"01-situation-form/葬書-雜篇.md", title:"葬书·杂篇", author:"郭璞", category:"形势派", completeness:"完整", summary:"葬书杂篇，补充形势断法", tags:["葬书","郭璞","形势"]},
    {file:"01-situation-form/撼龙经.md", title:"撼龙经", author:"杨筠松", category:"形势派", completeness:"完整", summary:"形势派核心经典，详论龙脉识别", tags:["撼龙经","杨筠松","龙脉","形势"]},
    {file:"01-situation-form/疑龙经.md", title:"疑龙经", author:"杨筠松", category:"形势派", completeness:"部分", summary:"辨真假龙穴", tags:["疑龙经","杨筠松","龙穴"]},
    {file:"01-situation-form/雪心赋.md", title:"雪心赋", author:"卜应天", category:"形势派", completeness:"完整", summary:"形势派重要文献", tags:["雪心赋","卜应天","形势"]},
    {file:"01-situation-form/葬经翼.md", title:"葬经翼", author:"缪希雍", category:"形势派", completeness:"完整", summary:"形势派文献", tags:["葬经翼","缪希雍","形势"]},
    {file:"02-principle-form/青囊经.md", title:"青囊经", author:"黄石公", category:"理气派", completeness:"完整", summary:"玄空理论之祖，含白话注释", tags:["青囊经","黄石公","玄空","理气"]},
    {file:"02-principle-form/青囊序.md", title:"青囊序", author:"曾文辿", category:"理气派", completeness:"完整", summary:"青囊经序文", tags:["青囊序","曾文辿","玄空"]},
    {file:"02-principle-form/天玉经.md", title:"天玉经", author:"杨筠松", category:"理气派", completeness:"完整", summary:"玄空理气核心经典，详论玄空飞星", tags:["天玉经","杨筠松","玄空","飞星"]},
    {file:"02-principle-form/都天宝照经.md", title:"都天宝照经", author:"杨筠松", category:"理气派", completeness:"完整", summary:"玄空理气经典", tags:["都天宝照经","杨筠松","玄空"]},
    {file:"02-principle-form/催官篇.md", title:"催官篇", author:"赖文俊", category:"理气派", completeness:"完整", summary:"理气派经典，论星峰方位与官禄", tags:["催官篇","赖文俊","理气","官禄"]},
    {file:"03-yang-house/阳宅三要.md", title:"阳宅三要", author:"赵九峰", category:"阳宅派", completeness:"完整", summary:"阳宅派核心经典，论门主灶三要", tags:["阳宅三要","门主灶","阳宅"]},
    {file:"03-yang-house/八宅明镜.md", title:"八宅明镜", author:"箬冠道人", category:"阳宅派", completeness:"部分", summary:"八宅派经典，论东四/西四命与宅匹配", tags:["八宅明镜","八宅","东四命","西四命"]},
    {file:"03-yang-house/阳宅十书-全文.md", title:"阳宅十书·全文", author:"", category:"阳宅派", completeness:"完整", summary:"阳宅十书十章合集", tags:["阳宅十书","阳宅","大游年","福元"]},
    {file:"03-yang-house/阳宅十书-第1章-论宅外形.md", title:"阳宅十书·论宅外形", author:"", category:"阳宅派", completeness:"完整", summary:"住宅外形与环境判断", tags:["阳宅十书","宅外形","形煞"]},
    {file:"03-yang-house/阳宅十书-第2章-论福元.md", title:"阳宅十书·论福元", author:"", category:"阳宅派", completeness:"完整", summary:"福元与命宅匹配", tags:["阳宅十书","福元","命卦"]},
    {file:"03-yang-house/阳宅十书-第3章-论大游年.md", title:"阳宅十书·论大游年", author:"", category:"阳宅派", completeness:"完整", summary:"八宅大游年规则", tags:["阳宅十书","大游年","八宅"]},
    {file:"03-yang-house/阳宅十书-第4章-论穿宫九星.md", title:"阳宅十书·论穿宫九星", author:"", category:"阳宅派", completeness:"完整", summary:"穿宫九星与宅法", tags:["阳宅十书","九星","穿宫"]},
    {file:"03-yang-house/阳宅十书-第5章-论元空装卦.md", title:"阳宅十书·论元空装卦", author:"", category:"阳宅派", completeness:"完整", summary:"元空装卦规则", tags:["阳宅十书","元空","装卦"]},
    {file:"03-yang-house/阳宅十书-第6章-论开门修造门.md", title:"阳宅十书·论开门修造门", author:"", category:"阳宅派", completeness:"完整", summary:"开门与修门规则", tags:["阳宅十书","开门","修造"]},
    {file:"03-yang-house/阳宅十书-第7章-论放水.md", title:"阳宅十书·论放水", author:"", category:"阳宅派", completeness:"完整", summary:"放水与水路规则", tags:["阳宅十书","放水","水法"]},
    {file:"03-yang-house/阳宅十书-第8章-论宅内形.md", title:"阳宅十书·论宅内形", author:"", category:"阳宅派", completeness:"完整", summary:"宅内形局判断", tags:["阳宅十书","宅内形","布局"]},
    {file:"03-yang-house/阳宅十书-第9章-论宅选择.md", title:"阳宅十书·论宅选择", author:"", category:"阳宅派", completeness:"完整", summary:"择宅规则", tags:["阳宅十书","择宅","选址"]},
    {file:"03-yang-house/阳宅十书-第10章-论符镇.md", title:"阳宅十书·论符镇", author:"", category:"阳宅派", completeness:"完整", summary:"符镇与化解记录", tags:["阳宅十书","符镇","化解"]},
    {file:"04-comprehensive/宅经.md", title:"宅经", author:"", category:"综合类", completeness:"完整", summary:"黄帝宅经，综合宅法", tags:["宅经","黄帝宅经","阳宅"]},
    {file:"04-comprehensive/管氏地理指蒙.md", title:"管氏地理指蒙", author:"管辂", category:"综合类", completeness:"部分", summary:"风水综合性经典，含序言与首章内容", tags:["管氏地理指蒙","管辂","风水"]},
    {file:"04-comprehensive/地理大全.md", title:"地理大全", author:"李国木", category:"综合类", completeness:"目录", summary:"地理大全卷目结构", tags:["地理大全","风水","目录"]},
    {file:"05-others/博山篇.md", title:"博山篇", author:"黄妙应", category:"其他", completeness:"完整", summary:"形法经典，八章全", tags:["博山篇","黄妙应","形法"]},
    {file:"05-others/入地眼全书.md", title:"入地眼全书", author:"静道和尚", category:"其他", completeness:"框架", summary:"含五十字诀等框架内容", tags:["入地眼全书","风水","五十字诀"]}
  ];

  // ─── 搜索函数 ─────────────────────────────────────

  function searchAll(query) {
    if (!query || query.length < 1) return { terms: [], mappings: [], kb: [] };
    var q = query.toLowerCase();

    // 1. 搜索术语解释
    var terms = [];
    if (typeof CORE !== "undefined" && CORE.termExplanations) {
      var all = CORE.termExplanations;
      for (var key in all) {
        if (key.toLowerCase().indexOf(q) !== -1 || all[key].toLowerCase().indexOf(q) !== -1) {
          terms.push({ term: key, explanation: all[key] });
        }
      }
    }

    // 2. 搜索映射表
    var mappings = [];
    MAPPING_INDEX.forEach(function(m) {
      var score = 0;
      if (m.title.toLowerCase().indexOf(q) !== -1) score += 3;
      if (m.summary.toLowerCase().indexOf(q) !== -1) score += 2;
      m.tags.forEach(function(t) { if (t.toLowerCase().indexOf(q) !== -1) score += 3; });
      if (score > 0) {
        mappings.push({ file: m.file, source: m.source, title: m.title, category: m.category, completeness: m.completeness, summary: m.summary, score: score });
      }
    });
    mappings.sort(function(a,b) { return b.score - a.score; });

    // 3. 搜索古籍
    var kb = [];
    KB_INDEX.forEach(function(k) {
      var score = 0;
      if (k.title.toLowerCase().indexOf(q) !== -1) score += 3;
      if (k.summary.toLowerCase().indexOf(q) !== -1) score += 2;
      if (k.author && k.author.toLowerCase().indexOf(q) !== -1) score += 2;
      k.tags.forEach(function(t) { if (t.toLowerCase().indexOf(q) !== -1) score += 3; });
      if (score > 0) {
        kb.push({ file: k.file, title: k.title, author: k.author, category: k.category, completeness: k.completeness, summary: k.summary, score: score });
      }
    });
    kb.sort(function(a,b) { return b.score - a.score; });

    return { terms: terms, mappings: mappings, kb: kb };
  }

  // ─── UI ──────────────────────────────────────────

  var searchModal = null;
  var searchInput = null;
  var resultsEl = null;

  function createSearchModal() {
    if (document.getElementById("global-search-modal")) return;
    var modal = document.createElement("div");
    modal.id = "global-search-modal";
    modal.innerHTML =
      '<div id="gs-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:9998;"></div>' +
      '<div id="gs-dialog" style="position:fixed;top:80px;left:50%;transform:translateX(-50%);width:640px;max-width:90vw;max-height:70vh;background:#FFF;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.2);z-index:9999;display:flex;flex-direction:column;overflow:hidden;font-family:\'Noto Sans SC\',\'Microsoft YaHei\',sans-serif;">' +
        '<div style="padding:16px 20px 12px;border-bottom:1px solid #EFEBE6;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:18px;">🔍</span>' +
            '<input id="gs-input" type="text" placeholder="搜索术语、古籍、风水概念…" style="flex:1;border:none;outline:none;font-size:15px;padding:6px 0;background:transparent;color:#2C1810;" autofocus>' +
            '<button id="gs-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#BCAAA4;padding:0 4px;">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="gs-results" style="flex:1;overflow-y:auto;padding:8px 0;min-height:100px;"></div>' +
      '</div>';
    document.body.appendChild(modal);

    searchInput = document.getElementById("gs-input");
    resultsEl = document.getElementById("gs-results");

    // 关闭
    document.getElementById("gs-close").addEventListener("click", closeSearch);
    document.getElementById("gs-overlay").addEventListener("click", closeSearch);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") closeSearch();
    });

    // 搜索
    var timer = null;
    searchInput.addEventListener("input", function() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() { doSearch(searchInput.value); }, 150);
    });

    searchModal = modal;
  }

  function doSearch(query) {
    var results = searchAll(query);
    var html = "";

    if (!query || query.length === 0) {
      html = '<div style="text-align:center;padding:40px 20px;color:#BCAAA4;font-size:14px;">输入关键词开始搜索，可查术语解释、风水古籍、映射表</div>';
      resultsEl.innerHTML = html;
      return;
    }

    var total = results.terms.length + results.mappings.length + results.kb.length;
    if (total === 0) {
      html = '<div style="text-align:center;padding:40px 20px;color:#BCAAA4;font-size:14px;">未找到与 <b>"' + escapeHtml(query) + '"</b> 相关的结果</div>';
      resultsEl.innerHTML = html;
      return;
    }

    // 术语
    if (results.terms.length > 0) {
      html += renderGroup("术语解释", results.terms.length, results.terms.slice(0, 20), function(t) {
        return '<div class="gs-item" style="padding:10px 20px;cursor:pointer;border-bottom:1px solid #F5F0EB;">' +
          '<div style="font-size:13px;font-weight:bold;color:#3E2723;">' + highlight(t.term, query) + '</div>' +
          '<div style="font-size:12px;color:#8D6E63;margin-top:3px;line-height:1.5;">' + highlight(t.explanation.substring(0, 120), query) + '</div>' +
        '</div>';
      });
    }

    // 映射表
    if (results.mappings.length > 0) {
      html += renderGroup("风水映射表", results.mappings.length, results.mappings.slice(0, 10), function(m) {
        return '<div class="gs-item" style="padding:10px 20px;cursor:pointer;border-bottom:1px solid #F5F0EB;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span style="font-size:11px;background:#D4A017;color:#FFF;padding:1px 6px;border-radius:4px;font-weight:bold;">JSON</span>' +
            '<span style="font-size:13px;font-weight:bold;color:#3E2723;">' + highlight(m.title, query) + '</span>' +
          '</div>' +
          '<div style="font-size:11px;color:#A1887F;margin-top:3px;">' + escapeHtml(m.category || '未分类') + ' · ' + escapeHtml(m.completeness || '未知') + ' · ' + escapeHtml(m.source || m.file) + '</div>' +
          '<div style="font-size:12px;color:#8D6E63;margin-top:3px;">' + highlight(m.summary, query) + '</div>' +
        '</div>';
      });
    }

    // 古籍
    if (results.kb.length > 0) {
      html += renderGroup("古籍文献", results.kb.length, results.kb.slice(0, 10), function(k) {
        return '<div class="gs-item gs-kb-item" style="padding:10px 20px;cursor:pointer;border-bottom:1px solid #F5F0EB;" data-file="' + k.file + '">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span style="font-size:11px;background:#5D4037;color:#FFF;padding:1px 6px;border-radius:4px;font-weight:bold;">古籍</span>' +
            '<span style="font-size:13px;font-weight:bold;color:#3E2723;">' + highlight(k.title, query) + '</span>' +
            (k.author ? '<span style="font-size:11px;color:#BCAAA4;">' + k.author + '</span>' : '') +
            '<span style="font-size:11px;color:#8D6E63;">' + (k.category || '未分类') + ' · ' + (k.completeness || '未知') + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#8D6E63;margin-top:3px;">' + highlight(k.summary, query) + '</div>' +
        '</div>';
      });
    }

    resultsEl.innerHTML = html;

    // 点击古籍条目打开文件
    resultsEl.querySelectorAll(".gs-kb-item").forEach(function(el) {
      el.addEventListener("click", function() {
        var file = el.dataset.file;
        if (file) {
          var path = "../knowledge-base/fengshui/" + file;
          window.open(path, "_blank");
        }
      });
    });
  }

  function renderGroup(label, count, items, renderFn) {
    var html = '<div style="padding:8px 20px 4px;font-size:11px;color:#BCAAA4;display:flex;justify-content:space-between;">' +
      '<span>' + label + '</span><span>' + count + ' 条</span></div>';
    items.forEach(function(item) { html += renderFn(item); });
    return html;
  }

  function highlight(text, query) {
    if (!text || !query) return text || "";
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.substring(0, idx) + '<b style="color:#D4A017;">' + text.substring(idx, idx + query.length) + '</b>' + text.substring(idx + query.length);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function openSearch() {
    createSearchModal();
    searchModal.style.display = "";
    setTimeout(function() {
      if (searchInput) { searchInput.value = ""; searchInput.focus(); }
      doSearch("");
    }, 100);
  }

  function closeSearch() {
    if (searchModal) searchModal.style.display = "none";
  }

  // ─── 公开 API ─────────────────────────────────────

  window.GlobalSearch = {
    open: openSearch,
    close: closeSearch,
    searchAll: searchAll,
    getIndexStats: function() {
      return {
        mappings: MAPPING_INDEX.length,
        knowledgeBase: KB_INDEX.length,
        mappingFiles: MAPPING_INDEX.map(function(item) { return item.file; }),
        knowledgeBaseFiles: KB_INDEX.map(function(item) { return item.file; })
      };
    }
  };
})();
