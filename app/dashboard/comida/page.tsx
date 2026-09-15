import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Utensils, Info } from 'lucide-react'
import MealSignupForm from '@/components/MealSignupForm'
import { getNextWeekDates, formatWeekLabel, isSignupOpen } from '@/lib/meals-utils'
import { menuPorFecha, semanaDelCiclo, hoyEnArgentina, platoDe } from '@/lib/menu-semanal'
import MenuDeHoy from '@/components/MenuDeHoy'

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

  const menu = menuPorFecha(weekDays.map((d) => d.date))
  const hoy = hoyEnArgentina()

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
          Qué se cocina y qué elegís para la semana que viene.
        </p>
      </div>

      <MenuDeHoy
        fecha={hoy}
        almuerzo={platoDe(hoy, 'almuerzo')}
        cena={platoDe(hoy, 'cena')}
      />

      <div className="flex items-start gap-2.5 bg-brand-card border border-brand-border rounded-2xl px-4 py-3">
        <Info className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-muted leading-relaxed">
          <span className="font-semibold text-brand-text">El menú puede cambiar.</span> En
          feriados, cuando queda comida de un evento —que aprovechamos y comemos— o ante
          cualquier imprevisto, se cocina otra cosa. Lo que figura acá es lo planificado, no una
          promesa.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
          Anotate para la semana que viene
        </h2>
        <p className="text-brand-muted text-sm mt-0.5 mb-3 leading-relaxed">
          Semana del {weekLabel} · Menú de la Semana {semanaDelCiclo(weekDays[0].date)}. Elegí tu
          opción por día y tocá Guardar.
        </p>
        <MealSignupForm weekDays={weekDays} signups={signups} isOpen={open} menu={menu} />
      </div>
    </div>
  )
}
