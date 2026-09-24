import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaginaPropinas from '@/components/propinas/PaginaPropinas'

export const dynamic = 'force-dynamic'

export default async function PropinasPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return <PaginaPropinas base="/admin/propinas" userId={session.user.id} />
}
