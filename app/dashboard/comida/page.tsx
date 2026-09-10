import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Utensils } from 'lucide-react'
import MealSignupForm from '@/components/MealSignupForm'
import { getNextWeekStart, formatWeekLabel } from '@/lib/meals-utils'

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const end = new Date(date)
  end.setDate(date.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${date.toLocaleDateString('es-AR', opts)} al ${end.toLocaleDateString('es-AR', opts)}`
}

export default async function ComidaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const weekStart = getNextWeekStart()

  const { data: existing } = await supabase
    .from('meal_signups')
    .select('preference')
    .eq('user_id', session.user.id)
    .eq('week_start', weekStart)
    .single()

  const currentPreference = existing?.preference ?? null
  const weekLabel = formatWeekLabel(weekStart)

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Utensils className="w-6 h-6 text-brand-accent" />
          Comida Semanal
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">
          Anotate para la semana que viene. La cocina necesita saberlo con anticipación.
        </p>
      </div>

      <MealSignupForm currentPreference={currentPreference} weekLabel={weekLabel} />
    </div>
  )
}
