import PaginaPlazas from '@/components/plazas/PaginaPlazas'

export const dynamic = 'force-dynamic'

/** La hoja de plazas de los mozos, para los encargados (el layout ya frena a quien no es admin). */
export default function PlazasAdmin() {
  return <PaginaPlazas />
}
