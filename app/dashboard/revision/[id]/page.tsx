import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X, BookOpen, Clock3, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

interface ReviewRow {
  question_id: string
  question: string
  question_type: 'multiple_choice' | 'open'
  options: string[]
  selected_option: number | null
  answer_text: string | null
  is_correct: boolean | null
  comment: string | null
  orden: number
}

const LABELS = ['A', 'B', 'C', 'D']

export default async function RevisionPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: result } = await supabase
    .from('exam_results')
    .select('id, user_id, exam_id, score, passed, completed_at, review_status')
    .eq('id', params.id)
    .maybeSingle()

  if (!result) notFound()

  // La función valida el dueño, pero cortamos acá para no mostrar el encabezado.
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  const isOwner = result.user_id === session.user.id
  if (!isOwner && me?.role !== 'admin') redirect('/dashboard')

  const { data: exam } = await supabase
    .from('exams')
    .select('title, guide_id')
    .eq('id', result.exam_id as string)
    .maybeSingle()

  const { data: guide } = exam?.guide_id
    ? await supabase.from('guides').select('id, title').eq('id', exam.guide_id).maybeSingle()
    : { data: null }

  const { data: raw } = await supabase.rpc('get_exam_review', { p_result_id: params.id })
  const rows = (raw ?? []) as ReviewRow[]

  const mc = rows.filter((r) => r.question_type === 'multiple_choice')
  const open = rows.filter((r) => r.question_type === 'open')
  const wrong = mc.filter((r) => r.is_correct === false)
  const pending = result.review_status === 'pending_review'

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/progress"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
        <div className="min-w-0">
          <p className="text-brand-muted text-xs uppercase tracking-wider">Revisión</p>
          <h1 className="text-base font-bold text-brand-text leading-tight truncate">
            {guide?.title ?? exam?.title ?? 'Examen'}
          </h1>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-3xl font-bold',
                pending
                  ? 'text-amber-600'
                  : result.passed
                    ? 'text-brand-success'
                    : 'text-brand-error'
              )}
            >
              {pending ? 'Sin corregir' : result.score + '%'}
            </p>
            <p className="text-xs text-brand-muted mt-0.5">
              {formatDateTime(result.completed_at as string)}
            </p>
          </div>
          {!pending && (
            <span
              className={cn(
                'text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex-shrink-0',
                result.passed
                  ? 'bg-brand-success/10 text-brand-success'
                  : 'bg-brand-error/10 text-brand-error'
              )}
            >
              {result.passed ? 'Aprobado' : 'No aprobado'}
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <p className="text-sm text-brand-text mt-4 pt-4 border-t border-brand-border">
            {wrong.length === 0
              ? 'No te equivocaste en ninguna de opción múltiple.'
              : 'Te equivocaste en ' +
                wrong.length +
                ' de ' +
                mc.length +
                (wrong.length === 1 ? ' pregunta.' : ' preguntas.')}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center space-y-2">
          <Clock3 className="w-7 h-7 text-brand-muted mx-auto" />
          <p className="text-brand-text text-sm font-medium">No hay detalle de este intento</p>
          <p className="text-brand-muted text-xs leading-relaxed">
            Se rindió antes de que la app guardara las respuestas una por una. Los próximos sí van
            a quedar registrados.
          </p>
        </div>
      ) : (
        <>
          {wrong.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
                En qué te equivocaste
              </h2>
              <div className="space-y-3">
                {wrong.map((r) => (
                  <div
                    key={r.question_id}
                    className="bg-brand-card border border-brand-error/30 rounded-2xl p-4 space-y-3"
                  >
                    <p className="text-sm font-medium text-brand-text leading-relaxed">
                      {r.question}
                    </p>
                    <div className="flex items-start gap-2 bg-brand-error/10 rounded-lg px-3 py-2">
                      <X className="w-3.5 h-3.5 text-brand-error flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-error">
                          Tu respuesta
                        </p>
                        <p className="text-sm text-brand-text leading-relaxed">
                          {r.selected_option !== null && r.options[r.selected_option]
                            ? LABELS[r.selected_option] + '. ' + r.options[r.selected_option]
                            : 'No quedó guardada'}
                        </p>
                        {r.selected_option === null && (
                          <p className="text-xs text-brand-muted leading-relaxed mt-1">
                            Este examen se rindió antes de que revisáramos las preguntas, así
                            que no podemos mostrarte cuál habías elegido.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {guide && (
                <Link
                  href={'/dashboard/guides/' + guide.id}
                  className="flex items-center justify-center gap-2 w-full mt-3 py-3 px-4 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[48px]"
                >
                  <BookOpen className="w-4 h-4" />
                  Repasar la guía
                </Link>
              )}

              <p className="text-xs text-brand-muted text-center mt-3 leading-relaxed">
                No te mostramos cuál era la correcta a propósito: la idea es que vuelvas a la guía
                y la encuentres.
              </p>
            </div>
          )}

          {open.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <PenLine className="w-3.5 h-3.5" />
                Tus respuestas escritas
              </h2>
              <div className="space-y-3">
                {open.map((r) => (
                  <div
                    key={r.question_id}
                    className={cn(
                      'bg-brand-card border rounded-2xl p-4 space-y-2',
                      r.is_correct === true
                        ? 'border-brand-success/30'
                        : r.is_correct === false
                          ? 'border-brand-error/30'
                          : 'border-brand-border'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {r.is_correct === true ? (
                        <Check className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" />
                      ) : r.is_correct === false ? (
                        <X className="w-4 h-4 text-brand-error flex-shrink-0 mt-0.5" />
                      ) : (
                        <Clock3 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium text-brand-text leading-relaxed">
                        {r.question}
                      </p>
                    </div>

                    <p className="text-sm text-brand-muted whitespace-pre-wrap leading-relaxed bg-brand-dark rounded-lg px-3 py-2">
                      {r.answer_text || 'Sin responder'}
                    </p>

                    {r.comment && (
                      <p className="text-xs text-brand-text bg-brand-accent/10 border border-brand-accent/20 rounded-lg px-3 py-2 leading-relaxed">
                        <span className="font-semibold">Devolución: </span>
                        {r.comment}
                      </p>
                    )}

                    {r.is_correct === null && (
                      <p className="text-xs text-amber-700">Todavía sin corregir.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
