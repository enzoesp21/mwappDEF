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
}

export default nextConfig
