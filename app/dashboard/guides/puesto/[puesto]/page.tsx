import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import GuidePath, { type PathStep } from '@/components/GuidePath'
import { buscarPuesto } from '@/lib/puestos'

export const dynamic = 'force-dynamic'

interface Props {
  params: { puesto: string }
}

export default async function PuestoGuidesPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const info = buscarPuesto(decodeURIComponent(params.puesto))
  if (!info) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('puesto, experience')
    .eq('id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  const miPuesto = buscarPuesto(profile.puesto as string)?.valor ?? null
  const esTuPuesto = miPuesto === info.valor
  const enPrueba = profile.experience === 'nuevo'

  // En período de prueba no se entra al recorrido de otro puesto, ni escribiendo
  // la dirección a mano.
  if (enPrueba && !esTuPuesto && miPuesto) {
    redirect('/dashboard/guides/puesto/' + encodeURIComponent(miPuesto))
  }

  // Lo que ve este puesto lo decide guide_paths, que es lo que el admin arma.
  // No se filtra además por guides.puestos: si lo hiciera, una guía asignada
  // desde el panel podría no aparecer y no habría forma de darse cuenta.
  const { data: rawPath } = await supabase
    .from('guide_paths')
    .select('guide_id, orden, etiqueta')
    .eq('puesto', info.valor)
    .order('orden', { ascending: true })

  const ids = (rawPath ?? []).map((p) => p.guide_id as string)

  // Consultas sueltas, sin joins anidados: en este proyecto los joins
  // anidados de PostgREST vienen anulando consultas enteras.
  const [{ data: guides }, { data: exams }, { data: results }] = await Promise.all([
    ids.length
      ? supabase.from('guides').select('id, title, description').in('id', ids)
      : Promise.resolve({ data: [] as { id: string; title: string; description: string }[] }),
    supabase.from('exams').select('id, guide_id'),
    supabase
      .from('exam_results')
      .select('exam_id, score')
      .eq('user_id', session.user.id)
      .eq('passed', true),
  ])

  const porId = new Map((guides ?? []).map((g) => [g.id as string, g]))
  const examPorGuia = new Map((exams ?? []).map((e) => [e.guide_id as string, e.id as string]))
  const notaPorExamen = new Map(
    (results ?? []).map((r) => [r.exam_id as string, r.score as number])
  )

  // Si el recorrido apunta a una guía borrada, se saltea el paso.
  const steps: PathStep[] = (rawPath ?? []).flatMap((row) => {
    const g = porId.get(row.guide_id as string)
    if (!g) return []
    const examId = examPorGuia.get(g.id as string)
    const nota = examId ? notaPorExamen.get(examId) : undefined
    return [
      {
        guide_id: g.id as string,
        etiqueta: row.etiqueta as string,
        title: g.title as string,
        description: (g.description as string) ?? null,
        passed: nota !== undefined,
        score: nota ?? null,
        hasExam: Boolean(examId),
      },
    ]
  })

  const Icono = info.icono

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        {!enPrueba && (
          <Link
            href="/dashboard/guides"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Volver a los puestos"
          >
            <ArrowLeft className="w-4 h-4 text-brand-text" />
          </Link>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, ' + info.desde + ', ' + info.hasta + ')' }}
          >
            <Icono className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-brand-text leading-tight truncate">
              {info.nombre}
            </h1>
            {!esTuPuesto && (
              <p className="text-brand-muted text-xs">No es tu puesto, pero podés leerlas</p>
            )}
          </div>
        </div>
      </div>

      {steps.length > 0 ? (
        <GuidePath puesto={info.nombre} steps={steps} />
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center">
          <p className="text-brand-text text-sm font-medium">
            Todavía no hay guías asignadas a este puesto
          </p>
          <p className="text-brand-muted text-xs mt-1 leading-relaxed">
            Cuando los encargados armen el recorrido, va a aparecer acá.
          </p>
        </div>
      )}
    </div>
  )
}
