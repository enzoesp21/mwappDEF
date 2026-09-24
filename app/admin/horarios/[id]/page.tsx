import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { etiquetaSemana, semanaVacia, validarDatos } from '@/lib/horarios'
import EditorHorario from '@/components/admin/EditorHorario'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function EditarHorarioPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: semana } = await supabase
    .from('schedule_weeks')
    .select('id, week_start, status, data, updated_at')
    .eq('id', params.id)
    .maybeSingle()
  if (!semana) notFound()

  const lunes = semana.week_start as string
  const etiqueta = etiquetaSemana(lunes)
  // Si alguien tocó la base a mano y dejó algo raro, se arranca vacío en lugar
  // de romper la pantalla.
  const datos = validarDatos(semana.data) ? semana.data : semanaVacia()

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/horarios"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Volver a los horarios"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-brand-muted uppercase tracking-wider">Horario</p>
          <h1 className="text-xl font-display font-bold text-brand-text leading-tight">
            Semana del {etiqueta}
          </h1>
        </div>
      </div>

      <EditorHorario
        id={semana.id as string}
        lunes={lunes}
        etiqueta={etiqueta}
        publicada={semana.status === 'published'}
        datosIniciales={datos}
        versionInicial={semana.updated_at as string}
      />
    </div>
  )
}
