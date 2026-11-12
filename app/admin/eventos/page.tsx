import PaginaEventos from '@/components/eventos/PaginaEventos'

export const dynamic = 'force-dynamic'

/** El calendario de mesas personalizadas y eventos privados, para los encargados (el layout ya frena a quien no es admin). */
export default function EventosAdmin({ searchParams }: { searchParams: { mes?: string; dia?: string } }) {
  return <PaginaEventos base="/admin/eventos" searchParams={searchParams} esAdmin />
}
