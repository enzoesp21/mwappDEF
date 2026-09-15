import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import GuideCard from '@/components/GuideCard'
import GuidePath, { type PathStep } from '@/components/GuidePath'
import { buscarPuesto } from '@/lib/puestos'
import type { GuideWithStatus } from '@/lib/types'

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
    .select('puesto')
    .eq('id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  const esTuPuesto = buscarPuesto(profile.puesto as string)?.valor === info.valor

  const [{ data: guides }, { data: exams }, { data: results }, { data: rawPath }] =
    await Promise.all([
      supabase
        .from('guides')
        .select('*')
        .or(`puestos.cs.{"${info.valor}"},puestos.cs.{"todos"}`)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase.from('exams').select('*'),
      supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('passed', true),
      supabase
        .from('guide_paths')
        .select('guide_id, orden, etiqueta')
        .eq('puesto', info.valor)
        .order('orden', { ascending: true }),
    ])

  const guidesWithStatus: GuideWithStatus[] = (guides ?? []).map((guide) => {
    const exam = exams?.find((e) => e.guide_id === guide.id)
    const result = results?.find((r) => r.exam_id === exam?.id)
    return {
      ...guide,
      exam,
      result: result ?? undefined,
      status: result ? 'passed' : exam ? 'exam_pending' : 'not_started',
    }
  })

  const porId = new Map(guidesWithStatus.map((g) => [g.id, g]))

  // Si una guía de la ruta ya no existe o dejó de ser visible para el puesto,
  // se saltea el paso en lugar de romper la pantalla.
  const steps: PathStep[] = (rawPath ?? []).flatMap((row) => {
    const g = porId.get(row.guide_id as string)
    if (!g) return []
    return [
      {
        guide_id: g.id,
        etiqueta: row.etiqueta as string,
        title: g.title,
        description: g.description ?? null,
        passed: g.status === 'passed',
        score: g.result?.score ?? null,
        hasExam: Boolean(g.exam),
      },
    ]
  })

  const enLaRuta = new Set(steps.map((s) => s.guide_id))
  const otras = guidesWithStatus.filter((g) => !enLaRuta.has(g.id))
  const Icono = info.icono

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/guides"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Volver a los puestos"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
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
            Todavía no hay un recorrido armado para este puesto
          </p>
          <p className="text-brand-muted text-xs mt-1 leading-relaxed">
            Abajo están las guías que igual le corresponden.
          </p>
        </div>
      )}

      {otras.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1">
            {steps.length > 0 ? 'Otras guías' : 'Guías'}
          </h2>
          {steps.length > 0 && (
            <p className="text-brand-muted text-xs mb-3 leading-relaxed">
              No están en el recorrido, pero se pueden leer y rendir igual.
            </p>
          )}
          <div className="space-y-3">
            {otras.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
