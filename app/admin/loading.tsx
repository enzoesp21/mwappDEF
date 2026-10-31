import EsqueletoPagina from '@/components/navegacion/Esqueleto'

/** Aparece al instante al tocar una sección del panel, mientras llegan los datos. */
export default function CargandoAdmin() {
  return (
    <div className="max-w-3xl">
      <EsqueletoPagina tarjetas={5} />
    </div>
  )
}
