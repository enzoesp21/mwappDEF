import EsqueletoPagina from '@/components/navegacion/Esqueleto'

export default function CargandoFichadas() {
  return (
    <div className="max-w-3xl">
      <EsqueletoPagina tarjetas={4} altas />
    </div>
  )
}
