// Service worker de la app (Enzo, 11/11: "tarda en cargar desde la pantalla de
// inicio"). Guarda en el teléfono SOLO lo que nunca cambia sin cambiar de
// nombre: el código de la app (/_next/static/, con el número de versión en el
// nombre), las letras, los íconos, el logo y las fotos. Así, al abrirla, eso
// sale del teléfono y no se baja de nuevo.
//
// Lo que tiene datos (las páginas, el horario, las propinas, la base de
// Supabase) NO se guarda: siempre se pide fresco. Si no hay conexión, se
// muestra /sin-conexion.html.
//
// Para tirar todo lo guardado y empezar de cero, subir VERSION.

const VERSION = 'v1'
const CACHE = 'waikiki-' + VERSION
const SIN_CONEXION = '/sin-conexion.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SIN_CONEXION, '/logo.png', '/icon-192.png']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

function esFijo(url) {
  if (url.pathname.startsWith('/_next/static/')) return true
  if (url.pathname.startsWith('/fotos/')) return true
  return /\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Supabase y cualquier otro sitio: no se toca.
  if (url.origin !== self.location.origin) return

  if (esFijo(url)) {
    // Del teléfono si ya está; si no, de internet y se guarda para la próxima.
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then(
          (guardado) =>
            guardado ||
            fetch(req).then((resp) => {
              if (resp.ok) cache.put(req, resp.clone())
              return resp
            })
        )
      )
    )
    return
  }

  // Las páginas, siempre frescas. Sin conexión, el aviso.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(SIN_CONEXION)))
  }
})
