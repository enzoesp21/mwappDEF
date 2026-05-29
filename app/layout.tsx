import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mirador Waikiki App',
  description: 'Plataforma de capacitaciÃ³n para el personal de Mirador Waikiki',
  manifest: '/manifest.json',
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

