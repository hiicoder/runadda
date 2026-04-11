const CACHE_NAME = "runadda-v1"
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/offline.html",
]

// Install — cache static assets
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, fallback to cache, fallback to offline page
self.addEventListener("fetch", e => {
  // Skip non-GET and API requests
  if (e.request.method !== "GET") return
  if (e.request.url.includes("/api/")) return
  if (e.request.url.includes("supabase.co")) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful page responses
        if (res.ok && e.request.destination === "document") {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached || caches.match("/offline.html"))
      )
  )
})
