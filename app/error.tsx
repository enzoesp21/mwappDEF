'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="w-14 h-14 bg-brand-error/10 rounded-full flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-brand-error" />
      </div>
      <h2 className="text-brand-text font-semibold">Algo salió mal</h2>
      <p className="text-brand-muted text-sm">Ocurrió un error inesperado.</p>
      <button
        onClick={reset}
        className="bg-brand-accent text-brand-dark font-semibold px-6 py-3 rounded-xl hover:bg-brand-accent-hover transition-colors cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  )
}
