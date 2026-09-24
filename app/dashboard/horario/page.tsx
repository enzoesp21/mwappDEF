import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import {
  buscarEnHorario,
  etiquetaSemana,
  hoyEnArgentina,
  lunesDe,
  validarDatos,
  type DatosHorario,
} from '@/lib/horarios'
import MiSemana from '@/components/horario/MiSemana'
import TablaHorario from '@/components/horario/TablaHorario'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { semana?: string }
}

export default async function HorarioPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = hoyEnArgentina()
  const lunesActual = lunesDe(hoy)

  // Solo lo publicado: la política de la base tampoco deja ver borradores.
  const [{ data: semanas }, { data: yo }, { data: usuarios }] = await Promise.all([
    supabase
      .from('schedule_weeks')
      .select('id, week_start, data')
      .eq('status', 'published')
      .order('week_start', { ascending: false })
      .limit(6),
    supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
    supabase.from('profiles').select('full_name'),
  ])

  const publicadas = (semanas ?? []).filter((s) => validarDatos(s.data))

  // La de esta semana y la que viene, si ya está publicada (se publica el domingo).
  const vigentes = publicadas
    .filter((s) => (s.week_start as string) >= lunesActual)
    .sort((a, b) => (a.week_start as string).localeCompare(b.week_start as string))
    .slice(0, 2)

  // Si todavía no se publicó la de esta semana, se muestra la última que haya,
  // avisando que es vieja, antes que dejar la pantalla vacía.
  const ultimaAnterior = publicadas.find((s) => (s.week_start as string) < lunesActual)
  const opciones = vigentes.length > 0 ? vigentes : ultimaAnterior ? [ultimaAnterior] : []

  if (opciones.length === 0) {
    return (
      <div className="space-y-4 animate-slide-up">
        <Encabezado />
        <div className="bg-brand-card border border-brand-border rounded-2xl p-8 text-center space-y-2">
          <CalendarDays className="w-9 h-9 text-brand-muted mx-auto" />
          <p className="text-brand-text font-medium">Todavía no se publicó ningún horario</p>
          <p className="text-brand-muted text-sm leading-relaxed">
            Los encargados lo publican los domingos. Cuando esté, aparece acá.
          </p>
        </div>
      </div>
    )
  }

  const pedida = searchParams.semana
  const elegida = opciones.find((s) => s.week_start === pedida) ?? opciones[0]
  const lunes = elegida.week_start as string
  const datos = elegida.data as DatosHorario
  const esVieja = lunes < lunesActual
  const indiceHoy = lunes === lunesActual ? (new Date(hoy + 'T00:00:00Z').getUTCDay() + 6) % 7 : null

  const miNombre = (yo?.full_name as string) ?? ''
  const otros = (usuarios ?? []).map((u) => (u.full_name as string) ?? '')
  const misFilas = buscarEnHorario(datos, miNombre, otros)

  return (
    <div className="space-y-4 animate-slide-up">
      <Encabezado />

      {opciones.length > 1 && (
        <div className="flex gap-1 p-1 bg-brand-card border border-brand-border rounded-xl">
          {opciones.map((s) => {
            const activa = s.week_start === lunes
            const esEsta = s.week_start === lunesActual
            return (
              <Link
                key={s.id as string}
                href={'/dashboard/horario?semana=' + s.week_start}
                className={cn(
                  'flex-1 text-center px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                  activa ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'
                )}
              >
                {esEsta ? 'Esta semana' : 'La que viene'}
              </Link>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-brand-text">
        <Clock className="w-4 h-4 text-brand-accent flex-shrink-0" />
        <span>
          Semana del <strong>{etiquetaSemana(lunes)}</strong>
        </span>
      </div>

      {esVieja && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          Todavía no se publicó el horario de esta semana. Esto es el de la semana anterior, como
          referencia.
        </p>
      )}

      {misFilas.length > 0 && <MiSemana lunes={lunes} filas={misFilas} hoy={indiceHoy} />}

      <TablaHorario
        datos={datos}
        lunes={lunes}
        hoy={indiceHoy}
        resaltar={misFilas.map((f) => f.persona.nombre)}
      />
    </div>
  )
}

function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
        <CalendarDays className="w-6 h-6 text-brand-accent" />
        Horario
      </h1>
      <p className="text-brand-muted text-sm mt-0.5">El horario de todo el personal.</p>
    </div>
  )
}
