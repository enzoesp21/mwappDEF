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
// La pantalla de carga al tocar el ícono (Enzo, 16/11): sale del teléfono, al instante.
const ABRIR = '/abrir.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SIN_CONEXION, ABRIR, '/arranque/logo.png', '/logo.png', '/icon-192.png']))
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

  // La pantalla de carga: del teléfono al instante, y se actualiza por atrás para la próxima.
  if (url.pathname === ABRIR) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(ABRIR).then((guardada) => {
          const nueva = fetch(req).then((resp) => {
            if (resp.ok) cache.put(ABRIR, resp.clone())
            return resp
          })
          if (guardada) {
            event.waitUntil(nueva.catch(() => {}))
            return guardada
          }
          return nueva
        })
      )
    )
    return
  }

  // Las páginas, siempre frescas. Sin conexión, el aviso.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(SIN_CONEXION)))
  }
})

// Avisos al teléfono (Enzo, 16/11: que a Facu le llegue cada pedido de cambio
// de horario). Llegan aunque la app esté cerrada; en iPhone, solo con la app
// agregada a la pantalla de inicio.
self.addEventListener('push', (event) => {
  let aviso = { titulo: 'Mirador Waikiki', cuerpo: '', url: '/admin' }
  try {
    aviso = { ...aviso, ...event.data.json() }
  } catch (e) {
    if (event.data) aviso.cuerpo = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: aviso.url },
    })
  )
})

// Al tocar el aviso: abre la app en esa pantalla (o la trae al frente si ya estaba abierta).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => 'focus' in v)
      if (!abierta) return self.clients.openWindow(url)
      // Primero al frente (tiene que ser enseguida del toque); después, a la pantalla del aviso.
      return abierta.focus().then((v) => (v && 'navigate' in v ? v.navigate(url) : self.clients.openWindow(url)))
    })
  )
})
