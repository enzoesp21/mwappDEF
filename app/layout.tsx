import type { Metadata, Viewport } from 'next'
import './globals.css'

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
  themeColor: '#6e8f7a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-brand-dark text-brand-text antialiased">{children}</body>
    </html>
  )
}
