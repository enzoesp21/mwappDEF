import Link from 'next/link'
import Logo from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 text-center space-y-6">
      <Logo size="md" />
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-brand-accent">404</h1>
        <p className="text-brand-text font-semibold">Página no encontrada</p>
        <p className="text-brand-muted text-sm">La página que buscás no existe.</p>
      </div>
      <Link
        href="/"
        className="bg-brand-accent text-brand-dark font-semibold px-6 py-3 rounded-xl hover:bg-brand-accent-hover transition-colors cursor-pointer"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
