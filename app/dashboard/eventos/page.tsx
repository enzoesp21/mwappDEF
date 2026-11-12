import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeVerEventos } from '@/lib/eventos-datos'
import PaginaEventos from '@/components/eventos/PaginaEventos'

export const dynamic = 'force-dynamic'

/**
 * El calendario de mesas personalizadas y eventos privados, para quien tiene
 * el permiso (Enzo lo da en Usuarios). El resto vuelve a Inicio; la base
 * tampoco le mostraría nada.
 */
export default async function EventosPage({ searchParams }: { searchParams: { mes?: string; dia?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  if (!(await puedeVerEventos(supabase, session.user.id))) redirect('/dashboard')

  return <PaginaEventos base="/dashboard/eventos" searchParams={searchParams} esAdmin={false} />
}
