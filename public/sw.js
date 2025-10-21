// Service Worker for SwipeUp PWA
const CACHE_NAME = 'swipeup-v8-20251021-fetch-fix';
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
  // Skip non-http(s) requests (chrome-extension, data:, blob:, etc.)
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Skip external domains except fonts
  const isOwnDomain = url.hostname.includes('swipeup-marketing.com') || 
                      url.hostname.includes('supabase.co');
  const isFontDomain = url.hostname.includes('googleapis.com') || 
                       url.hostname.includes('gstatic.com');
  
  if (!isOwnDomain && !isFontDomain) {
    return;
  }
  
  // NEVER cache HTML, JS, CSS, API calls - always fetch from network
  if (url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname.includes('/assets/') ||
      url.pathname.includes('/rest/') ||
      url.pathname.includes('/storage/')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('Fetch failed for:', event.request.url, error);
        // Return a basic error response instead of letting the promise reject
        return new Response('Network error', {
          status: 408,
          statusText: 'Request Timeout',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
    );
  } else {
    // Cache-first for fonts and static images only
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            // Only cache successful, complete responses
            if (response && response.status === 200 && response.type !== 'opaque') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {
                  // Silently ignore cache errors
                });
              });
            }
            return response;
          }).catch((error) => {
            console.error('Fetch failed for cached resource:', event.request.url, error);
            // Return a basic error response
            return new Response('Network error', {
              status: 408,
              statusText: 'Request Timeout',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
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
