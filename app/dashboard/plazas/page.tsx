import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeCargarPropinas } from '@/lib/propinas-datos'
import PaginaPlazas from '@/components/plazas/PaginaPlazas'

export const dynamic = 'force-dynamic'

/** La hoja de plazas de los mozos, para las cajeras con permiso de propinas. Los mozos no la ven. */
export default async function PlazasPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  if (!(await puedeCargarPropinas(supabase, session.user.id))) redirect('/dashboard')
  return <PaginaPlazas />
}
