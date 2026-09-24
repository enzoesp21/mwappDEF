import { redirect } from 'next/navigation'
import Link from 'next/link'
import InstallPrompt from '@/components/InstallPrompt'
import { Utensils, ChevronRight, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNextWeekDates, isSignupOpen, SIGNUP_CUTOFF_LABEL } from '@/lib/meals-utils'
import { currentPeriod } from '@/lib/month-utils'
import EmployeeOfMonthCard from '@/components/EmployeeOfMonthCard'
import type { GuideWithStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    // Profile missing — create from auth metadata (trigger may not have run)
    await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: session.user.user_metadata?.full_name ?? 'Usuario',
      puesto: session.user.user_metadata?.puesto ?? 'Sin puesto',
      role: session.user.user_metadata?.role ?? 'staff',
    })
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    profile = newProfile
  }

  if (!profile) redirect('/login')

  // En período de prueba solo cuenta la guía principal: es la única habilitada.
  const enPrueba = profile.experience === 'nuevo'
  const consultaGuias = supabase
    .from('guides')
    .select('*')
    .or(`puestos.cs.{"${profile.puesto}"},puestos.cs.{"todos"}`)
  const { data: guides } = await (enPrueba ? consultaGuias.eq('is_primary', true) : consultaGuias)
    // La guía principal va siempre primera, sin importar cuándo se creó.
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  // Sin join anidado a exam_questions: el personal ya no puede leer esa tabla
  // (las respuestas correctas viven ahí) y el join anularía toda la consulta.
  const { data: exams } = await supabase
    .from('exams')
    .select('id, guide_id, title, passing_score')

  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('passed', true)

  const guidesWithStatus: GuideWithStatus[] = (guides ?? []).map((guide) => {
    const exam = exams?.find((e) => e.guide_id === guide.id)
    const result = results?.find((r) => r.exam_id === exam?.id)
    const status = result
      ? 'passed'
      : exam
      ? 'exam_pending'
      : 'not_started'

    return {
      ...guide,
      exam: exam ?? undefined,
      result: result ?? undefined,
      status,
    }
  })

  const passedCount = guidesWithStatus.filter((g) => g.status === 'passed').length
  const totalCount = guidesWithStatus.length

  // Empleado del mes vigente, para que lo vea todo el equipo al entrar.
  const { data: eom } = await supabase
    .from('employee_of_month')
    .select('period, user_id, photo_url, message')
    .eq('period', currentPeriod())
    .maybeSingle()

  let eomProfile: { full_name: string; puesto: string; avatar_url: string | null } | null = null
  if (eom) {
    const { data: p } = await supabase
      .from('profiles')
      .select('full_name, puesto, avatar_url')
      .eq('id', eom.user_id as string)
      .maybeSingle()
    eomProfile = p
      ? {
          full_name: (p.full_name as string) ?? 'Usuario',
          puesto: (p.puesto as string) ?? '',
          avatar_url: (p.avatar_url as string) ?? null,
        }
      : null
  }

  // Aviso de comida: cuántas comidas de la semana que viene quedan sin elegir.
  const mealsOpen = isSignupOpen()
  let missingMeals = 0
  if (mealsOpen) {
    const weekDays = getNextWeekDates()
    const totalSlots = weekDays.reduce((n, d) => n + d.meals.length, 0)
    const { count: chosen } = await supabase
      .from('meal_signups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('meal_date', weekDays[0].date)
      .lte('meal_date', weekDays[weekDays.length - 1].date)
    missingMeals = Math.max(0, totalSlots - (chosen ?? 0))
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Hola, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">{profile.puesto}</p>
      </div>

      <InstallPrompt dismissible />

      {eom && eomProfile && (
        <Link href="/dashboard/empleado-del-mes" className="block">
          <EmployeeOfMonthCard
            period={eom.period as string}
            fullName={eomProfile.full_name}
            puesto={eomProfile.puesto}
            // Si el encargado no subió una foto, se usa la del perfil.
            photoUrl={(eom.photo_url as string) ?? eomProfile.avatar_url}
            message={(eom.message as string) ?? null}
            compact
          />
        </Link>
      )}

      {missingMeals > 0 && (
        <Link
          href="/dashboard/comida"
          className="flex items-center gap-3 bg-brand-card border border-brand-accent/40 rounded-2xl p-4 hover:border-brand-accent transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <Utensils className="w-5 h-5 text-brand-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-text">
              Te faltan elegir {missingMeals} comida{missingMeals !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-brand-muted">
              Se cierra {SIGNUP_CUTOFF_LABEL}. Después no se puede cambiar.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
        </Link>
      )}

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-3">
          Tu progreso
        </p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-brand-accent">{passedCount}</span>
          <span className="text-brand-muted text-sm mb-1">de {totalCount} guías aprobadas</span>
        </div>
        <div className="h-2 bg-brand-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(passedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        {passedCount === totalCount && totalCount > 0 && (
          <p className="text-brand-success text-xs mt-2 font-medium">
            ¡Completaste todas las guías de tu sector!
          </p>
        )}
      </div>

      <Link
        href="/dashboard/guides"
        className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-brand-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-text">Ver las guías</p>
          <p className="text-xs text-brand-muted leading-relaxed">
            Tu recorrido y el de cada sector
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
      </Link>
    </div>
  )
}
