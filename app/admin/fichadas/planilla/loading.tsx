import { Bloque, EsqueletoTitulo } from '@/components/navegacion/Esqueleto'

/** La forma de la planilla mientras llegan los datos: título, contadores y la grilla. */
export default function CargandoPlanilla() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando la planilla">
      <EsqueletoTitulo />
      <div className="flex flex-wrap gap-2">
        <Bloque className="h-8 w-32 rounded-full" />
        <Bloque className="h-8 w-28 rounded-full" />
        <Bloque className="h-8 w-36 rounded-full" />
      </div>
      <div className="bg-brand-card border border-brand-border rounded-2xl p-3 space-y-2">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex gap-1.5">
            <Bloque className="h-7 w-28 flex-shrink-0" />
            {Array.from({ length: 9 }, (_, j) => (
              <Bloque key={j} className="h-7 flex-1 min-w-[28px]" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
