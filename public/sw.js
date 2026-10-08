// AI Study Companion & Socratic WhatsApp Tutor - Offline PWA Service Worker
const CACHE_NAME = 'ai-tutor-offline-v1';

// Essential App Shell URLs to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-512-maskable.png',
];

// Core API endpoints to cache for offline rural study
const CACHEABLE_API_PATHS = [
  '/api/documents',
  '/api/learning-resources',
  '/api/reviews/summary',
  '/api/reviews',
  '/api/students',
  '/api/milestones',
];

// Install Event: Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Offline-first & Stale-While-Revalidate caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g., POST reviews will be handled by IndexedDB offline queue)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Core API Requests (Documents, Learning Resources, Reviews, Roadmap)
  // Strategy: Network-First with Cache Fallback (Ensures fresh data when online, instant access when offline in rural areas)
  const isApiRequest = CACHEABLE_API_PATHS.some((path) => url.pathname.startsWith(path));
  if (isApiRequest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Clone and update cache with fresh response
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed: Serve cached data for offline rural study
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no exact match, try matching the path without query params
          const matchWithoutQuery = await caches.match(url.pathname);
          if (matchWithoutQuery) {
            return matchWithoutQuery;
          }
          return new Response(
            JSON.stringify({
              error: 'Offline',
              offlineMode: true,
              message: 'You are currently studying offline in rural mode. Stored materials are available in your local cache.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        })
    );
    return;
  }

  // 2. Static Assets (Scripts, CSS, Fonts, Images)
  // Strategy: Cache-First with Network Fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico|json)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Navigation / HTML Requests
  // Strategy: Network-First with App Shell Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) {
          return cachedIndex;
        }
        return caches.match('/');
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. Firebase Cloud Messaging (FCM) Push Notification Handler
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    payload = {
      notification: {
        title: 'Smart Study Reminder',
        body: event.data ? event.data.text() : 'Time for your scheduled study session!',
      },
    };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'Smart Study Reminder';
  const options = {
    body:
      notification.body ||
      data.body ||
      'Time for your scheduled study session! Protect your daily learning streak.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'smart-study-reminder-fcm',
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

