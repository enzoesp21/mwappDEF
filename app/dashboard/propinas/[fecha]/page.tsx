import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaginaDia from '@/components/propinas/PaginaDia'

export const dynamic = 'force-dynamic'

export default async function PropinasDiaPage({ params }: { params: { fecha: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return <PaginaDia base="/dashboard/propinas" userId={session.user.id} fecha={params.fecha} />
}
