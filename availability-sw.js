const CACHE_NAME = 'availability-calendar-v1.0.0';
const OFFLINE_URL = '/enhanced-rider-availability.html';

// Files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/enhanced-rider-availability.html',
  '/availability-calendar-manifest.json',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('📱 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching essential files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Immediately activate the new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests with caching strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to Google Apps Script API
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  // Handle the request with cache-first strategy for static assets
  if (isStaticAsset(event.request.url)) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
  // Handle availability data with network-first strategy
  else if (isAvailabilityData(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request));
  }
  // Handle all other requests with stale-while-revalidate
  else {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
  }
});

// Cache-first strategy for static assets (CSS, JS, images)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📡 Service Worker: Cache-first failed, serving from cache', error);
    return caches.match(request) || caches.match(OFFLINE_URL);
  }
}

// Network-first strategy for dynamic data
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📡 Service Worker: Network failed, serving from cache', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline indicator for availability data
    return new Response(JSON.stringify({
      offline: true,
      message: 'You are currently offline. Availability data may be outdated.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy for HTML pages
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // If network fails, return cached version or offline page
    return cachedResponse || caches.match(OFFLINE_URL);
  });

  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.includes(ext)) || url.includes('cdn.jsdelivr.net');
}

function isAvailabilityData(url) {
  return url.includes('availability') || url.includes('calendar') || url.includes('schedule');
}

// Handle background sync for offline availability updates
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'availability-sync') {
    event.waitUntil(syncAvailabilityData());
  }
});

// Sync availability data when back online
async function syncAvailabilityData() {
  try {
    // Get pending updates from IndexedDB or localStorage
    const pendingUpdates = await getPendingUpdates();
    
    for (const update of pendingUpdates) {
      try {
        // Attempt to sync each pending update
        const response = await fetch('/sync-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });
        
        if (response.ok) {
          await removePendingUpdate(update.id);
          console.log('✅ Service Worker: Synced availability update', update.id);
        }
      } catch (error) {
        console.log('❌ Service Worker: Failed to sync update', update.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Handle push notifications for availability reminders
self.addEventListener('push', event => {
  console.log('📬 Service Worker: Push notification received');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    title: data.title || '🗓️ Availability Reminder',
    body: data.body || 'Don\'t forget to update your availability for this week!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'availability-reminder',
    data: data.url || '/enhanced-rider-availability.html',
    actions: [
      {
        action: 'open',
        title: 'Open Calendar',
        icon: '/action-open.png'
      },
      {
        action: 'quick-available',
        title: 'Available Today',
        icon: '/action-available.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/action-dismiss.png'
      }
    ],
    requireInteraction: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Notification clicked', event.action);
  
  event.notification.close();

  let action = event.action;
  let url = event.notification.data || '/enhanced-rider-availability.html';

  if (action === 'quick-available') {
    // Handle quick available action
    url += '?action=available';
  } else if (action === 'dismiss') {
    return; // Just close the notification
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url.includes('availability') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app not already open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle message events from the main app
self.addEventListener('message', event => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_AVAILABILITY') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.put(event.data.url, new Response(event.data.data)))
    );
  }
});

// Utility functions for offline data management
async function getPendingUpdates() {
  // This would typically use IndexedDB
  // For simplicity, using localStorage simulation
  try {
    const stored = localStorage.getItem('pendingAvailabilityUpdates');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function removePendingUpdate(id) {
  try {
    const updates = await getPendingUpdates();
    const filtered = updates.filter(update => update.id !== id);
    localStorage.setItem('pendingAvailabilityUpdates', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending update', error);
  }
}

// Error handling for uncaught errors
self.addEventListener('error', event => {
  console.error('❌ Service Worker: Uncaught error', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker: Unhandled promise rejection', event.reason);
});

console.log('🚀 Service Worker: Loaded and ready');