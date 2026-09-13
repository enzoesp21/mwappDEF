import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Utensils, Leaf, Sprout, Wheat, ShoppingBag } from 'lucide-react'
import { getNextWeekDates, formatWeekLabel } from '@/lib/meals-utils'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PCFG = {
  tradicional: { label: 'Tradicional', color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
  vegetariano: { label: 'Vegetariano', color: 'text-green-600', bg: 'bg-green-50' },
  vegano: { label: 'Vegano', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  celiaco: { label: 'Celíaco', color: 'text-amber-600', bg: 'bg-amber-50' },
  propio: { label: 'Me lo traigo', color: 'text-slate-500', bg: 'bg-slate-50' },
} as const

const PICONS = {
  tradicional: Utensils,
  vegetariano: Leaf,
  vegano: Sprout,
  celiaco: Wheat,
  propio: ShoppingBag,
}

export default async function AdminComidaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const weekDays = getNextWeekDates()
  const weekStart = weekDays[0].date
  const weekEnd = weekDays[weekDays.length - 1].date
  const weekLabel = formatWeekLabel(weekStart)

  const { data: rawSignups } = await supabase
    .from('meal_signups')
    .select('meal_date, meal_type, preference, user_id')
    .gte('meal_date', weekStart)
    .lte('meal_date', weekEnd)
    .order('meal_date')

  const rows = rawSignups ?? []
  const userIds = rows.map((r) => r.user_id as string).filter((id, i, a) => a.indexOf(id) === i)

  const profileMap: Record<string, { full_name: string; puesto: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, puesto')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name ?? 'Usuario', puesto: p.puesto ?? '' }
    }
  }

  const signups = rows.map((r) => ({
    meal_date: r.meal_date as string,
    meal_type: r.meal_type as string,
    preference: r.preference as string,
    full_name: profileMap[r.user_id as string]?.full_name ?? 'Usuario',
    puesto: profileMap[r.user_id as string]?.puesto ?? '',
  }))

  const total = signups.length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Comida Semanal</h1>
        <p className="text-sm text-brand-muted mt-1">
          Semana del {weekLabel} · {total} inscripción{total !== 1 ? 'es' : ''}
        </p>
      </div>

      {weekDays.map((day) => {
        const daySignups = signups.filter((s) => s.meal_date === day.date)
        if (daySignups.length === 0) return null
        return (
          <div key={day.date} className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-brand-text">
              {day.dayName}{' '}
              <span className="text-brand-muted font-normal text-sm">
                — {daySignups.length} inscriptos
              </span>
            </h2>

            {day.meals.map((meal) => {
              const mealSignups = daySignups.filter((s) => s.meal_type === meal)
              if (mealSignups.length === 0) return null
              return (
                <div key={meal}>
                  <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2 capitalize">
                    {meal}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(PCFG).map(([key, cfg]) => {
                      const count = mealSignups.filter((s) => s.preference === key).length
                      if (count === 0) return null
                      return (
                        <span
                          key={key}
                          className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}
                        >
                          {cfg.label}: {count}
                        </span>
                      )
                    })}
                  </div>
                  <div className="divide-y divide-brand-border">
                    {mealSignups.map((s, i) => {
                      const cfg = PCFG[s.preference as keyof typeof PCFG]
                      const Icon = PICONS[s.preference as keyof typeof PICONS] ?? Utensils
                      return (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <Icon className={cn('w-4 h-4 flex-shrink-0', cfg?.color ?? 'text-brand-muted')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-text truncate">{s.full_name}</p>
                            <p className="text-xs text-brand-muted truncate">{s.puesto}</p>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                              cfg?.bg ?? 'bg-brand-accent/10',
                              cfg?.color ?? 'text-brand-accent'
                            )}
                          >
                            {cfg?.label ?? s.preference}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {total === 0 && (
        <div className="text-center py-10 bg-brand-card border border-brand-border rounded-2xl text-brand-muted text-sm">
          Nadie se anotó todavía para esta semana.
        </div>
      )}
    </div>
  )
}
