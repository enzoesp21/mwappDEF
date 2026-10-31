import { Bloque, EsqueletoTitulo } from '@/components/navegacion/Esqueleto'

/** "Tu semana" y la tabla del horario, con su forma, mientras cargan. */
export default function CargandoHorario() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando el horario">
      <EsqueletoTitulo />
      <div className="bg-brand-card border border-brand-border rounded-2xl p-3 space-y-3">
        <Bloque className="h-4 w-24" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Bloque key={i} className="h-[62px]" />
          ))}
        </div>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-2xl p-3 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Bloque key={i} className="h-6" />
        ))}
      </div>
    </div>
  )
}
