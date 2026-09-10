import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SugerenciasAdminClient from '@/components/admin/SugerenciasAdminClient'
export default async function AdminSugerenciasPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id',session.user.id).single()
  if (profile?.role!=='admin') redirect('/dashboard')
  const { data: raw } = await supabase.from('suggestions').select('*, profiles(full_name,puesto)').order('created_at',{ascending:false})
  const suggestions=(raw??[]).map(s=>{const p=s.profiles as {full_name:string;puesto:string}|null;return{...s,full_name:p?.full_name??'Usuario',puesto:p?.puesto??''}})
  return <SugerenciasAdminClient suggestions={suggestions}/>
}
