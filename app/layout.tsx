import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, Poppins } from 'next/font/google'
import './globals.css'
import BarraProgreso from '@/components/navegacion/BarraProgreso'
import RegistrarSW from '@/components/navegacion/RegistrarSW'

// Las letras de miradorwaikiki.com, servidas por la propia app: no se bajan de
// Google al abrirla y no hay salto de letra mientras cargan.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400', '500'],
  variable: '--font-bodoni',
  display: 'swap',
  // Next no trae medidas de reemplazo para esta letra; solo se usa en frases.
  adjustFontFallback: false,
})

// Pantalla de arranque del iPhone (Enzo, 16/11: al tocar el ícono quedaba la
// pantalla negra un rato). iOS no la arma solo: pide una imagen exacta por cada
// tamaño de pantalla (public/arranque/, fondo crema y el logo). Ancho y alto en
// puntos y densidad: de los iPhone 17 al SE. Solo vertical (la app no gira).
const PANTALLAS_IPHONE: [number, number, number][] = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus y Pro Max, 16 Plus
  [420, 912, 3], // Air
  [402, 874, 3], // 16 Pro, 17 y 17 Pro
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12 y 13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12 y 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6s, 7 y 8 Plus
  [375, 667, 2], // 6s, 7, 8, SE 2 y 3
  [320, 568, 2], // SE 1
]

export const metadata: Metadata = {
  title: 'Mirador Waikiki App',
  description: 'Plataforma de capacitación para el personal de Mirador Waikiki',
  manifest: '/manifest.json',
  // iOS no lee el manifest: necesita estas dos cosas para abrirse como app
  // cuando la agregan a la pantalla de inicio.
  appleWebApp: {
    capable: true,
    title: 'Waikiki',
    statusBarStyle: 'default',
    startupImage: PANTALLAS_IPHONE.map(([ancho, alto, densidad]) => ({
      url: `/arranque/iphone-${ancho * densidad}x${alto * densidad}.png`,
      media: `(device-width: ${ancho}px) and (device-height: ${alto}px) and (-webkit-device-pixel-ratio: ${densidad}) and (orientation: portrait)`,
    })),
  },
  // Todos salen del logo real. La pestaña usa el logo recortado al ras y sin
  // fondo, para que a 16 px se vea lo más grande posible. El de iPhone lleva
  // fondo crema porque iOS pinta de negro lo transparente.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#516d5c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${poppins.variable} ${bodoni.variable}`}>
      <body className="bg-brand-dark text-brand-text antialiased">
        <BarraProgreso />
        <RegistrarSW />
        {children}
      </body>
    </html>
  )
}
