/**
 * 轻量 Service Worker — 仅在 http/https 环境下启用。
 * file:// 双击打开时不会加载 SW，确保离线 HTML 优先可用。
 * 缓存策略：core 静态资源 cache-first，其他请求 network-first。
 */
var CACHE_NAME = "wisdom-v03-20260704";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/capabilities.js",
  "./js/data-bridge.js",
  "./js/engine-adapters.js",
  "./js/history-store.js",
  "./js/search.js",
  "./js/tool-manifest.js",
  "./js/engines/bazi.js",
  "./js/engines/meihua.js",
  "./js/engines/yunqi.js",
  "./js/engines/liuyao.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).catch(function () {
        // 部分文件缓存失败不阻塞安装
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  // 跨域请求不拦截
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // 只缓存同源成功响应
        if (response.ok && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone).catch(function () {});
          });
        }
        return response;
      }).catch(function () {
        // 离线 fallback
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
