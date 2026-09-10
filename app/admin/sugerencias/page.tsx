import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SugerenciasAdminClient from '@/components/admin/SugerenciasAdminClient'

export default async function AdminSugerenciasPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: rawSuggestions } = await supabase
    .from('suggestions')
    .select('id, user_id, content, category, is_read, read_at, read_by, created_at')
    .order('created_at', { ascending: false })

  const rows = rawSuggestions ?? []
  const userIds = rows.map((r) => r.user_id as string).filter((id, i, arr) => arr.indexOf(id) === i)

  const profileMap: Record<string, { full_name: string; puesto: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, puesto').in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name ?? 'Usuario', puesto: p.puesto ?? '' }
    }
  }

  const suggestions = rows.map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    content: r.content as string,
    category: r.category as string,
    is_read: r.is_read as boolean,
    read_at: r.read_at as string | null,
    read_by: r.read_by as string | null,
    created_at: r.created_at as string,
    full_name: profileMap[r.user_id]?.full_name ?? 'Usuario',
    puesto: profileMap[r.user_id]?.puesto ?? '',
  }))

  return <SugerenciasAdminClient suggestions={suggestions} />
}

