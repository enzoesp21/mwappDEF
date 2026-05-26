import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Trophy } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: results } = await supabase
    .from('exam_results')
    .select(`
      *,
      exams (
        title,
        guides (title)
      )
    `)
    .eq('user_id', user.id)
    .eq('passed', true)
    .order('completed_at', { ascending: false })

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Mi Progreso</h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {results?.length ?? 0} examen{results?.length !== 1 ? 'es' : ''} aprobado
          {results?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {(!results || results.length === 0) ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 bg-brand-card rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-brand-muted" />
          </div>
          <p className="text-brand-muted">Todavía no aprobaste ningún examen.</p>
          <p className="text-brand-muted text-sm">¡Empezá leyendo una guía!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const exam = result.exams as { title: string; guides: { title: string } | null } | null
            return (
              <div
                key={result.id}
                className="bg-brand-card border border-brand-success/20 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle className="w-4 h-4 text-brand-success flex-shrink-0" />
                      <p className="text-brand-success text-xs font-semibold">APROBADO</p>
                    </div>
                    <h3 className="font-semibold text-brand-text text-sm leading-tight">
                      {exam?.guides?.title ?? 'Guía'}
                    </h3>
                    <p className="text-brand-muted text-xs mt-0.5">{exam?.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-bold text-brand-success">{result.score}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-brand-muted border-t border-brand-border pt-3">
                  <span>{formatDateTime(result.completed_at)}</span>
                  {result.signature_data && (
                    <details className="cursor-pointer">
                      <summary className="text-brand-accent hover:text-brand-accent-hover transition-colors select-none">
                        Ver firma
                      </summary>
                      <div className="mt-2 p-2 bg-brand-dark rounded-lg border border-brand-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.signature_data}
                          alt="Firma digital"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
