import EsqueletoPagina from '@/components/navegacion/Esqueleto'

export default function CargandoPapel() {
  return (
    <div className="max-w-3xl">
      <EsqueletoPagina tarjetas={3} altas />
    </div>
  )
}
