import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Utensils, Leaf, Sprout, Wheat, Users } from 'lucide-react'
import { getNextWeekStart, formatWeekLabel } from '@/lib/meals-utils'
import { cn } from '@/lib/utils'

const PREFERENCES = [
  { key: 'tradicional', label: 'Tradicional', icon: Utensils, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
  { key: 'vegetariano', label: 'Vegetariano', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'vegano', label: 'Vegano', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'celiaco', label: 'Celiaco', icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50' },
] as const

export default async function AdminComidaPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const weekStart = getNextWeekStart()
  const weekLabel = formatWeekLabel(weekStart)

  const { data: rawSignups } = await supabase
    .from('meal_signups')
    .select('*, profiles ( full_name, puesto )')
    .eq('week_start', weekStart)
    .order('preference')

  const signups = (rawSignups ?? []).map((s) => {
    const p = s.profiles as { full_name: string; puesto: string } | null
    return { id: s.id as string, preference: s.preference as string, full_name: p?.full_name ?? 'Usuario', puesto: p?.puesto ?? '' }
  })

  const counts = PREFERENCES.map(({ key, label, icon: Icon, color, bg }) => ({
    key, label, Icon, color, bg, count: signups.filter((s) => s.preference === key).length,
  }))

  const total = signups.length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Comida Semanal</h1>
        <p className="text-sm text-brand-muted mt-1">Semana del {weekLabel} · {total} anotado{total !== 1 ? 's' : ''}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {counts.map(({ key, label, Icon, color, bg, count }) => (
          <div key={key} className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2', bg)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <p className="text-2xl font-bold text-brand-text">{count}</p>
            <p className="text-xs text-brand-muted">{label}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />Detalle por persona
        </h2>
        {signups.length === 0 ? (
          <div className="text-center py-10 bg-brand-card border border-brand-border rounded-2xl text-brand-muted text-sm">
            Nadie se anoto todavia para esta semana.
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {signups.map((s) => {
                const pref = PREFERENCES.find((p) => p.key === s.preference)
                const Icon = pref?.icon ?? Utensils
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={cn('w-4 h-4 flex-shrink-0', pref?.color ?? 'text-brand-muted')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">{s.full_name}</p>
                      <p className="text-xs text-brand-muted truncate">{s.puesto}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', pref?.bg ?? 'bg-brand-accent/10', pref?.color ?? 'text-brand-accent')}>
                      {pref?.label ?? s.preference}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
