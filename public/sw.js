const CACHE_NAME = 'ana-lima-psi-v1.8.0-1790360753069';
const APP_VERSION = '1.8.0';
const RELEASE_NOTES = "Melhorias de desempenho, sincronização em nuvem e segurança clínica aplicadas automaticamente no seu consultório.";

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=7',
  '/favicon.svg?v=8',
  '/logo-app.svg?v=8',
  '/pwa-192x192.png?v=7',
  '/pwa-512x512.png?v=7',
  '/pwa-1024x1024.png?v=7',
  '/apple-touch-icon.png?v=7'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const oldKeys = keys.filter((key) => key !== CACHE_NAME);
      const isUpgrade = oldKeys.length > 0;

      await Promise.all(oldKeys.map((key) => caches.delete(key)));
      await self.clients.claim();

      if (isUpgrade) {
        // 1. Dispara Notificação Nativa do Sistema Android / Desktop em segundo plano
        if (self.registration && typeof self.registration.showNotification === 'function') {
          try {
            await self.registration.showNotification(`✨ App Ana Lima Atualizado (v${APP_VERSION})`, {
              body: RELEASE_NOTES,
              icon: '/pwa-192x192.png?v=7',
              badge: '/pwa-192x192.png?v=7',
              vibrate: [200, 100, 200],
              tag: `ana-lima-update-${APP_VERSION}`,
              renotify: true,
              data: {
                type: 'system_update',
                version: APP_VERSION,
                notes: RELEASE_NOTES
              },
              actions: [
                { action: 'open', title: '✨ Abrir Aplicativo' }
              ]
            });
          } catch (e) {
            // Permissão ainda não concedida ou bloqueada pelo SO
          }
        }

        // 2. Avisa todas as abas/janelas abertas do app
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'SW_UPDATED',
            version: APP_VERSION,
            notes: RELEASE_NOTES
          });
        }
      }
    })
  );
});

// Clique em qualquer Notificação Nativa do Android / Sistema Operacional
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notifData
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/?app=v7');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
