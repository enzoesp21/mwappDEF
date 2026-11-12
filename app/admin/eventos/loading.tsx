import { Bloque, EsqueletoTitulo } from '@/components/navegacion/Esqueleto'

/** El calendario, con su forma, mientras carga. */
export default function CargandoEventos() {
  return (
    <div className="max-w-2xl space-y-5" role="status" aria-label="Cargando el calendario">
      <EsqueletoTitulo />
      <Bloque className="h-12 rounded-full" />
      <Bloque className="h-[400px] rounded-2xl" />
      <Bloque className="h-24 rounded-xl" />
    </div>
  )
}
