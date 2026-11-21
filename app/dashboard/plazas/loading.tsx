import { Bloque, EsqueletoTitulo } from '@/components/navegacion/Esqueleto'

/** La hoja de plazas, con su forma, mientras carga. */
export default function CargandoPlazas() {
  return (
    <div className="max-w-2xl space-y-5" role="status" aria-label="Cargando la hoja de plazas">
      <EsqueletoTitulo />
      <Bloque className="h-[420px] rounded-2xl" />
      <Bloque className="h-64 rounded-2xl" />
    </div>
  )
}
