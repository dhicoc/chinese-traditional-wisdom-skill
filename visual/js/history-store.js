/**
 * history-store.js — 本地历史与收藏存储
 *
 * 使用原生 localStorage 保存脱敏阅读摘要，不保存完整姓名、完整出生日期、具体地点。
 * 历史最多 30 条，收藏无上限但建议用户定期清理。
 *
 * 数据结构：
 *   HistoryEntry: { id, module, title, summary, tags, mode, createdAt, favorite }
 *
 * 公开 API：
 *   HistoryStore.add(entry)           — 添加一条历史
 *   HistoryStore.list()               — 获取历史列表（倒序）
 *   HistoryStore.listFavorites()      — 获取收藏列表
 *   HistoryStore.toggleFavorite(id)   — 切换收藏状态
 *   HistoryStore.remove(id)           — 删除单条
 *   HistoryStore.clear()              — 清空全部历史
 *   HistoryStore.clearFavorites()     — 清空收藏
 *   HistoryStore.getCount()           — 获取历史条数
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var HISTORY_KEY = "FORTUNE_HISTORY";
  var FAVORITES_KEY = "FORTUNE_FAVORITES";
  var MAX_HISTORY = 30;

  function safeParse(json) {
    try { return JSON.parse(json); } catch (e) { return []; }
  }

  function safeStringify(value) {
    try { return JSON.stringify(value); } catch (e) { return "[]"; }
  }

  function getHistory() {
    return safeParse(localStorage.getItem(HISTORY_KEY) || "[]");
  }

  function setHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, safeStringify(arr)); } catch (e) {}
  }

  function getFavorites() {
    return safeParse(localStorage.getItem(FAVORITES_KEY) || "[]");
  }

  function setFavorites(arr) {
    try { localStorage.setItem(FAVORITES_KEY, safeStringify(arr)); } catch (e) {}
  }

  function generateId() {
    return "h_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 脱敏：去除可能的完整日期、姓名、地点信息。
   * 只保留 module、title、summary、tags、mode 字段。
   */
  function sanitize(entry) {
    var clean = {
      id: entry.id || generateId(),
      module: String(entry.module || "unknown").slice(0, 30),
      title: String(entry.title || "").slice(0, 120),
      summary: String(entry.summary || "").slice(0, 500),
      tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 10).map(function (t) {
        return String(t).slice(0, 30);
      }) : [],
      mode: String(entry.mode || "unknown").slice(0, 20),
      createdAt: entry.createdAt || new Date().toISOString(),
      favorite: entry.favorite === true
    };
    // 移除可能包含的完整出生日期模式
    clean.summary = clean.summary.replace(/\d{4}-\d{2}-\d{2}/g, "****");
    clean.title = clean.title.replace(/\d{4}-\d{2}-\d{2}/g, "****");
    return clean;
  }

  /**
   * 添加一条历史记录。
   * 如果 module 和 title 相同，覆盖最近一条而非新增。
   */
  function add(entry) {
    if (!entry || !entry.module) return null;
    var clean = sanitize(entry);
    var history = getHistory();

    // 查找同 module 同 title 的最近一条
    var existingIdx = -1;
    for (var i = 0; i < history.length; i++) {
      if (history[i].module === clean.module && history[i].title === clean.title) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx >= 0) {
      // 保留原 favorite 状态
      clean.favorite = history[existingIdx].favorite;
      history.splice(existingIdx, 1);
    }

    history.unshift(clean);

    // 限制最大数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }

    setHistory(history);

    // 如果是收藏，也更新收藏列表
    if (clean.favorite) {
      var favs = getFavorites();
      var favIdx = -1;
      for (var j = 0; j < favs.length; j++) {
        if (favs[j].module === clean.module && favs[j].title === clean.title) {
          favIdx = j;
          break;
        }
      }
      if (favIdx >= 0) {
        favs[favIdx] = clean;
      } else {
        favs.unshift(clean);
      }
      setFavorites(favs);
    }

    return clean;
  }

  function list() {
    return getHistory();
  }

  function listFavorites() {
    return getFavorites();
  }

  function toggleFavorite(id) {
    var history = getHistory();
    var found = false;
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === id) {
        history[i].favorite = !history[i].favorite;
        found = true;
        break;
      }
    }
    if (found) setHistory(history);

    // 同步收藏列表
    var favs = getFavorites();
    var entry = null;
    for (var j = 0; j < history.length; j++) {
      if (history[j].id === id) { entry = history[j]; break; }
    }
    if (entry) {
      if (entry.favorite) {
        // 添加到收藏
        var exists = favs.some(function (f) { return f.id === id; });
        if (!exists) favs.unshift(entry);
      } else {
        // 从收藏移除
        favs = favs.filter(function (f) { return f.id !== id; });
      }
      setFavorites(favs);
    }
    return entry ? entry.favorite : false;
  }

  function remove(id) {
    var history = getHistory().filter(function (h) { return h.id !== id; });
    setHistory(history);
    var favs = getFavorites().filter(function (f) { return f.id !== id; });
    setFavorites(favs);
  }

  function clear() {
    setHistory([]);
  }

  function clearFavorites() {
    var history = getHistory();
    history.forEach(function (h) { h.favorite = false; });
    setHistory(history);
    setFavorites([]);
  }

  function getCount() {
    return getHistory().length;
  }

  window.HistoryStore = {
    version: "0.1.0",
    maxHistory: MAX_HISTORY,
    add: add,
    list: list,
    listFavorites: listFavorites,
    toggleFavorite: toggleFavorite,
    remove: remove,
    clear: clear,
    clearFavorites: clearFavorites,
    getCount: getCount,
    _sanitize: sanitize // 暴露用于测试
  };
})();
