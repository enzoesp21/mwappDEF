import EsqueletoPagina from '@/components/navegacion/Esqueleto'

export default function CargandoEmpleados() {
  return (
    <div className="max-w-3xl">
      <EsqueletoPagina tarjetas={8} />
    </div>
  )
}
