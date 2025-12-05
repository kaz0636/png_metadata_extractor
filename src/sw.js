/**
 * Service Worker for PNG Metadata Extractor
 * オフライン対応とキャッシュ管理を担当
 */

// キャッシュ名（更新時はバージョン番号をインクリメント）
// メジャー.マイナー.パッチ形式で管理
const CACHE_NAME = 'png-metadata-extractor-v1.1.0';

// キャッシュ対象のローカルファイル
const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// キャッシュ対象の外部CDNリソース
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/jsnview/build/index.css',
    'https://cdn.jsdelivr.net/npm/jsnview/build/index.min.js'
];

/**
 * インストールイベント
 * 静的アセットをキャッシュに追加
 */
self.addEventListener('install', (event) => {
    console.log('[Service Worker] インストール中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] キャッシュを作成中...');
                // ローカルアセットをキャッシュ
                return cache.addAll(LOCAL_ASSETS)
                    .then(() => {
                        // 外部CDNリソースを個別にキャッシュ（失敗しても継続）
                        return Promise.allSettled(
                            EXTERNAL_ASSETS.map((url) =>
                                fetch(url, { mode: 'cors' })
                                    .then((response) => {
                                        if (response.ok) {
                                            return cache.put(url, response);
                                        }
                                    })
                                    .catch((error) => {
                                        console.warn(`[Service Worker] 外部リソースのキャッシュに失敗: ${url}`, error);
                                    })
                            )
                        );
                    });
            })
            .then(() => {
                console.log('[Service Worker] インストール完了');
                // 即座にアクティブ化
                return self.skipWaiting();
            })
    );
});

/**
 * アクティベートイベント
 * 古いキャッシュを削除
 */
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] アクティベート中...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log(`[Service Worker] 古いキャッシュを削除: ${cacheName}`);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] アクティベート完了');
                // 即座にクライアントを制御
                return self.clients.claim();
            })
    );
});

/**
 * フェッチイベント
 * Cache First 戦略でリソースを提供
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // GETリクエストのみキャッシュ対象
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // キャッシュにあればキャッシュから返す
                if (cachedResponse) {
                    return cachedResponse;
                }

                // キャッシュになければネットワークから取得
                return fetch(request)
                    .then((networkResponse) => {
                        // 正常なレスポンスのみキャッシュに追加
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[Service Worker] フェッチエラー:', error);
                        // オフライン時のフォールバック（必要に応じて）
                    });
            })
    );
});
