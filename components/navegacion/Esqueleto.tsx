import { cn } from '@/lib/utils'

/** Un bloque gris crema con brillo, mientras llegan los datos. */
export function Bloque({ className }: { className?: string }) {
  return <div aria-hidden className={cn('esqueleto rounded-lg', className)} />
}

/** El encabezado de una sección: etiqueta, título y bajada. */
export function EsqueletoTitulo() {
  return (
    <div className="space-y-2">
      <Bloque className="h-3 w-28" />
      <Bloque className="h-7 w-48" />
      <Bloque className="h-3.5 w-64 max-w-full" />
    </div>
  )
}

/** Una tarjeta como las de la app, con ícono y dos renglones. */
export function EsqueletoTarjeta({ alta = false }: { alta?: boolean }) {
  return (
    <div className={cn('bg-brand-card border border-brand-border rounded-2xl p-4 flex items-center gap-3', alta && 'py-6')}>
      <Bloque className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Bloque className="h-3.5 w-2/3" />
        <Bloque className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Lo que se ve al cambiar de sección mientras el servidor arma la página. */
export default function EsqueletoPagina({ tarjetas = 4, altas = false }: { tarjetas?: number; altas?: boolean }) {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando">
      <EsqueletoTitulo />
      <div className="space-y-3">
        {Array.from({ length: tarjetas }, (_, i) => (
          <EsqueletoTarjeta key={i} alta={altas} />
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
