import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Utensils } from 'lucide-react'
import MealSignupForm from '@/components/MealSignupForm'
import { getNextWeekDates, formatWeekLabel, isSignupOpen } from '@/lib/meals-utils'

export const dynamic = 'force-dynamic'

export default async function ComidaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const weekDays = getNextWeekDates()
  const weekStart = weekDays[0].date
  const weekEnd = weekDays[weekDays.length - 1].date
  const weekLabel = formatWeekLabel(weekStart)
  const open = isSignupOpen()

  const { data: rows } = await supabase
    .from('meal_signups')
    .select('meal_date, meal_type, preference')
    .eq('user_id', session.user.id)
    .gte('meal_date', weekStart)
    .lte('meal_date', weekEnd)

  const signups: Record<string, Record<string, string>> = {}
  for (const row of rows ?? []) {
    const date = row.meal_date as string
    if (!signups[date]) signups[date] = {}
    signups[date][row.meal_type as string] = row.preference as string
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Utensils className="w-6 h-6 text-brand-accent" />
          Comida Semanal
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">
          Semana del {weekLabel}. Elegí tu opción por día y tocá Guardar.
        </p>
      </div>

      <MealSignupForm weekDays={weekDays} signups={signups} isOpen={open} />
    </div>
  )
}
