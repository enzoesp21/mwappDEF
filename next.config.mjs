/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Sin optimizador de imágenes. Lo único que pasaba por ahí era el logo, y
    // el logo ya se baja entero como marca de agua de las tarjetas: con el
    // optimizador se descargaba dos veces, por dos direcciones distintas.
    // Además, varias vulnerabilidades de Next 14 que no tienen arreglo en esa
    // versión están en el optimizador (entre ellas una de ejecución remota de
    // código con AVIF). Apagándolo, esa superficie desaparece.
    unoptimized: true,
    remotePatterns: [],
  },
  // El service worker (public/sw.js) nunca se guarda viejo: así los teléfonos
  // toman enseguida una versión nueva.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
  experimental: {
    // Ir y volver entre secciones sin esperar: una página visitada hace menos
    // de 30 segundos se muestra al instante desde la memoria del navegador.
    // Cuando algo se guarda, las acciones del servidor la invalidan igual.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
