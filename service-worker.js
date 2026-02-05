// Service Worker for Family Task Manager PWA

const CACHE_NAME = "familytaskapp-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/auth.js",
  "/firebase.js",
  "/manifest.json",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js",
];

// Install event - pre-cache essential assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching assets...");
      
      // Cache local assets
      const localAssets = ASSETS_TO_CACHE.filter(
        (url) => !url.startsWith("https://www.gstatic.com")
      );
      
      return cache.addAll(localAssets)
        .catch((err) => {
          console.warn("[Service Worker] Some assets failed to cache:", err);
          // Don't fail install if some assets are missing
          return Promise.resolve();
        });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately
  return self.clients.claim();
});

// Fetch event - cache-first strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }
  
  // Skip Firebase remote calls (let them go to network)
  if (url.origin === "https://www.gstatic.com" || 
      url.hostname.includes("firebaseio.com") ||
      url.hostname.includes("firebase.googleapis.com")) {
    return; // Let fetch proceed normally to network
  }
  
  // Cache-first strategy for local assets
  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached response if available
      if (response) {
        console.log("[Service Worker] Serving from cache:", request.url);
        return response;
      }
      
      // Try to fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "error") {
            return networkResponse;
          }
          
          // Clone and cache successful responses
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return networkResponse;
        })
        .catch((err) => {
          // Network failed, try to return cached version
          console.log("[Service Worker] Network request failed, checking cache:", request.url);
          return caches.match(request).catch(() => {
            // Return offline page or error response
            return new Response("Offline - Resource not cached", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
        });
    })
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
