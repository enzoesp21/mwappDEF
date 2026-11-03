import { redirect } from 'next/navigation'
import Link from 'next/link'
import InstallPrompt from '@/components/InstallPrompt'
import FaltasGraves from '@/components/FaltasGraves'
import { Utensils, ChevronRight, BookOpen, Banknote, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNextWeekDates, isSignupOpen, SIGNUP_CUTOFF_LABEL } from '@/lib/meals-utils'
import { currentPeriod } from '@/lib/month-utils'
import EmployeeOfMonthCard from '@/components/EmployeeOfMonthCard'
import type { GuideWithStatus } from '@/lib/types'
import { misPropinas } from '@/lib/propinas-datos'
import { fechaConDia, pesos } from '@/lib/propinas'
import { datosNivel } from '@/lib/progresion'
import { EN_BETA } from '@/lib/beta'

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

  // Aviso de comida: cuántas comidas de la semana que viene quedan sin elegir.
  const mealsOpen = isSignupOpen()
  const weekDays = mealsOpen ? getNextWeekDates() : []

  // Todo lo que muestra Inicio se pide a la vez: antes iba de a una consulta
  // por vez y la pantalla tardaba la suma de todas.
  const [
    { data: guides },
    // Sin join anidado a exam_questions: el personal ya no puede leer esa tabla
    // (las respuestas correctas viven ahí) y el join anularía toda la consulta.
    { data: exams },
    { data: results },
    { data: eom },
    { count: chosen },
    { propinas },
    { data: miNivel },
  ] = await Promise.all([
    (enPrueba ? consultaGuias.eq('is_primary', true) : consultaGuias)
      // La guía principal va siempre primera, sin importar cuándo se creó.
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase.from('exams').select('id, guide_id, title, passing_score'),
    supabase.from('exam_results').select('*').eq('user_id', session.user.id).eq('passed', true),
    // Empleado del mes vigente, para que lo vea todo el equipo al entrar.
    supabase
      .from('employee_of_month')
      .select('period, user_id, photo_url, message')
      .eq('period', currentPeriod())
      .maybeSingle(),
    mealsOpen
      ? supabase
          .from('meal_signups')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('meal_date', weekDays[0].date)
          .lte('meal_date', weekDays[weekDays.length - 1].date)
      : Promise.resolve({ count: 0 }),
    misPropinas(supabase, session.user.id),
    // Progresión: solo para mozos, y no en fase beta (no se muestra el nivel).
    // Si todavía no se corrió el SQL, no aparece.
    profile.puesto === 'Mozos' && !EN_BETA.progresion
      ? supabase.from('mozo_niveles').select('nivel').eq('user_id', session.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

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

  const totalSlots = weekDays.reduce((n, d) => n + d.meals.length, 0)
  const missingMeals = mealsOpen ? Math.max(0, totalSlots - (chosen ?? 0)) : 0

  // Propinas: quien las carga tiene el acceso a mano; mozos y runners ven el
  // reparto de todos; el resto ve la última suya.
  const cargaPropinas = profile.carga_propinas === true
  const veRepartoSalon = profile.puesto === 'Mozos'
  const ultimaPropina = propinas[0] ?? null

  const nivelActual = datosNivel((miNivel?.nivel as number) ?? 0)

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
          {profile.puesto} · Mirador Waikiki
        </p>
        <h1 className="text-3xl font-semibold text-brand-accent leading-tight mt-1">
          Hola, {profile.full_name.split(' ')[0]}.
        </h1>
        <p className="font-serif italic text-brand-text/80 text-lg mt-0.5">Que tengas un buen turno.</p>
      </div>

      <InstallPrompt dismissible />

      {/* Mientras dura la prueba, siempre a la vista: no alcanza con verla una vez. */}
      {enPrueba && <FaltasGraves />}

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

      {(cargaPropinas || ultimaPropina || veRepartoSalon) && (
        <Link
          href="/dashboard/propinas"
          className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-5 h-5 text-brand-accent" />
          </div>
          <div className="min-w-0 flex-1">
            {cargaPropinas ? (
              <>
                <p className="text-sm font-semibold text-brand-text">Cargar propinas</p>
                <p className="text-xs text-brand-muted">El reparto del salón y el reporte para el grupo</p>
              </>
            ) : ultimaPropina ? (
              <>
                <p className="text-sm font-semibold text-brand-text">
                  Tu propina: {pesos(ultimaPropina.monto)}
                </p>
                <p className="text-xs text-brand-muted">
                  Del {fechaConDia(ultimaPropina.fecha)} ·{' '}
                  {veRepartoSalon ? 'ver el reparto' : 'ver todas'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-brand-text">Propinas del salón</p>
                <p className="text-xs text-brand-muted">El reparto de cada día</p>
              </>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
        </Link>
      )}

      {profile.puesto === 'Mozos' && (
        <Link
          href="/dashboard/progresion"
          className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-brand-accent" />
          </div>
          {EN_BETA.progresion ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-text flex items-center gap-2">
                Tu progresión en la propina
                <span className="px-1.5 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-[9px] font-bold uppercase tracking-[0.12em]">
                  Beta
                </span>
              </p>
              <p className="text-xs text-brand-muted">En fase beta: se habilitará próximamente</p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-text">
                {nivelActual ? `Tu nivel: ${nivelActual.porcentaje} % de la propina` : 'Tu progresión en la propina'}
              </p>
              <p className="text-xs text-brand-muted">
                {nivelActual && nivelActual.nivel < 3 ? 'Mirá qué te falta para subir' : 'Del 50 % al 100 % en tres niveles'}
              </p>
            </div>
          )}
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
