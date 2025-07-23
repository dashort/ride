const CACHE_NAME = 'availability-calendar-v1.0.0';
const OFFLINE_URL = '/enhanced-rider-availability.html';

// Essential files to cache
const CACHE_URLS = [
  '/',
  '/enhanced-rider-availability.html',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js'
];

// Install - cache essential files
self.addEventListener('install', event => {
  console.log('📱 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(error => console.error('❌ Installation failed:', error))
  );
});

// Activate - clean up old caches
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => 
          cacheName !== CACHE_NAME ? caches.delete(cacheName) : null
        )
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - simplified caching strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Google Apps Script API
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    // Try network first for most requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && isStaticAsset(request.url)) {
      // Cache static assets
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    // Return basic offline response for API calls
    return new Response(JSON.stringify({
      offline: true,
      message: 'You are currently offline.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function isStaticAsset(url) {
  return ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2']
    .some(ext => url.includes(ext)) || url.includes('cdn.jsdelivr.net');
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('📬 Push notification received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    title: data.title || '🗓️ Availability Reminder',
    body: data.body || 'Don\'t forget to update your availability!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'availability-reminder',
    data: data.url || '/enhanced-rider-availability.html',
    actions: [
      { action: 'open', title: 'Open Calendar' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(options.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data || '/enhanced-rider-availability.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes('availability') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow ? clients.openWindow(url) : null;
      })
  );
});

// Handle messages from main app
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker: Ready');