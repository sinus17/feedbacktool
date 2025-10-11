// Service Worker for SwipeUp PWA
const CACHE_NAME = 'swipeup-v2';
const urlsToCache = [
  '/',
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
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
