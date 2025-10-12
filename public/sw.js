// Service Worker for SwipeUp PWA
const CACHE_NAME = 'swipeup-v4-20251012-nocache';
const urlsToCache = [
  '/plane_new.png',
  '/NEU_PSD_swipeup-marketing_2.png'
];

// VAPID Public Key (same as in frontend)
const VAPID_PUBLIC_KEY = 'BLeXYHMpjqspKNY_pxGtuCHgDbH6IxE6Ksk0vAtZPySciN9JvgrDX20TtAbjLWapDQU_BYO3Qbc4IQr10MWZTDk';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network only for HTML/JS/CSS, cache for images
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // NEVER cache HTML, JS, CSS - always fetch from network
  if (url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for images and static assets only
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            // Only cache successful responses
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
        })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'SwipeUp',
    body: 'New trend available!',
    icon: '/plane_new.png',
    badge: '/plane_new.png',
    url: '/library?tab=feed&public=true'
  };
  
  // Parse the JSON payload
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('Parsed notification data:', notificationData);
    } catch (e) {
      console.error('Failed to parse notification data:', e);
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/plane_new.png',
    badge: notificationData.badge || '/plane_new.png',
    vibrate: [200, 100, 200],
    data: {
      url: notificationData.url || '/library?tab=feed&public=true',
      dateOfArrival: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'SwipeUp', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/library?tab=feed&public=true';
  console.log('Opening URL:', urlToOpen);

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
