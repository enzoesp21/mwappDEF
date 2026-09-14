import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Trophy, XCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { fetchExams, uniqueIds } from '@/lib/lookups'

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: rawResults } = await supabase
    .from('exam_results')
    .select('id, score, passed, completed_at, exam_id, signature_data, review_status')
    .eq('user_id', session.user.id)
    .order('completed_at', { ascending: false })

  const rows = rawResults ?? []
  const examMap = await fetchExams(supabase, uniqueIds(rows.map((r) => r.exam_id as string)))

  const todos = rows.map((r) => ({
    id: r.id as string,
    passed: r.passed as boolean,
    pending: (r.review_status as string) === 'pending_review',
    score: r.score as number,
    completed_at: r.completed_at as string,
    signature_data: r.signature_data as string | null,
    guide_title: examMap[r.exam_id as string]?.guide_title ?? 'Guía',
    exam_title: examMap[r.exam_id as string]?.title ?? '',
  }))

  const results = todos.filter((r) => r.passed)
  const fallidos = todos.filter((r) => !r.passed && !r.pending)

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
                      {result.guide_title}
                    </h3>
                    <p className="text-brand-muted text-xs mt-0.5">{result.exam_title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-bold text-brand-success">{result.score}%</span>
                  </div>
                </div>

                <Link
                  href={'/dashboard/revision/' + result.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer"
                >
                  Ver en qué me equivoqué
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

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

      {fallidos.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Intentos no aprobados
          </h2>
          <div className="space-y-2">
            {fallidos.map((r) => (
              <Link
                key={r.id}
                href={'/dashboard/revision/' + r.id}
                className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-brand-error flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{r.guide_title}</p>
                  <p className="text-xs text-brand-muted">{formatDateTime(r.completed_at)}</p>
                </div>
                <span className="text-sm font-bold text-brand-error flex-shrink-0">{r.score}%</span>
                <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
