import { Bloque, EsqueletoTitulo } from '@/components/navegacion/Esqueleto'

/** Las tarjetas de los puestos, con su forma, mientras cargan. */
export default function CargandoGuias() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando las guías">
      <EsqueletoTitulo />
      {Array.from({ length: 6 }, (_, i) => (
        <Bloque key={i} className="h-[88px] rounded-2xl" />
      ))}
    </div>
  )
}
