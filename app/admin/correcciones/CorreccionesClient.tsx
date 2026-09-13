'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, AlertCircle, ClipboardCheck, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { gradeOpenAnswerAction } from '@/app/actions/grading'

interface PendingAnswer {
  id: string
  question: string
  answer_guide: string | null
  answer_text: string
}

interface PendingResult {
  id: string
  full_name: string
  puesto: string
  guide_title: string
  completed_at: string
  answers: PendingAnswer[]
}

interface Props {
  pending: PendingResult[]
}

export default function CorreccionesClient({ pending }: Props) {
  const router = useRouter()
  const [comments, setComments] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  async function grade(answerId: string, isCorrect: boolean) {
    if (busy) return
    setBusy(answerId)
    setError(null)

    const result = await gradeOpenAnswerAction(answerId, isCorrect, comments[answerId] ?? '')
    setBusy(null)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setDone((d) => ({ ...d, [answerId]: true }))
    router.refresh()
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-16 bg-brand-card border border-brand-border rounded-2xl space-y-3">
        <div className="w-14 h-14 rounded-full bg-brand-success/10 flex items-center justify-center mx-auto">
          <ClipboardCheck className="w-7 h-7 text-brand-success" />
        </div>
        <p className="text-brand-text font-medium">Todo corregido</p>
        <p className="text-brand-muted text-sm">
          Cuando alguien rinda un examen con respuestas escritas, te va a aparecer acá.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {pending.map((result) => (
        <div key={result.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-border">
            <p className="font-semibold text-brand-text">{result.full_name}</p>
            <p className="text-xs text-brand-muted">
              {result.puesto ? result.puesto + ' · ' : ''}
              {result.guide_title} · {result.completed_at}
            </p>
          </div>

          <div className="divide-y divide-brand-border">
            {result.answers.map((answer) => {
              const isDone = done[answer.id]
              const isBusy = busy === answer.id
              return (
                <div
                  key={answer.id}
                  className={cn('p-5 space-y-3', isDone && 'opacity-50 pointer-events-none')}
                >
                  <p className="text-sm font-medium text-brand-text leading-relaxed">
                    {answer.question}
                  </p>

                  {answer.answer_guide && (
                    <div className="flex items-start gap-2 text-xs text-brand-muted bg-brand-dark rounded-lg px-3 py-2">
                      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-brand-accent" />
                      <span>
                        <span className="font-semibold">Referencia: </span>
                        {answer.answer_guide}
                      </span>
                    </div>
                  )}

                  <div className="bg-brand-dark border border-brand-border rounded-xl px-4 py-3">
                    <p className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">
                      {answer.answer_text}
                    </p>
                  </div>

                  <input
                    type="text"
                    value={comments[answer.id] ?? ''}
                    onChange={(e) =>
                      setComments((c) => ({ ...c, [answer.id]: e.target.value }))
                    }
                    placeholder="Devolución para el empleado (opcional)"
                    maxLength={300}
                    className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors min-h-[44px]"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => grade(answer.id, false)}
                      disabled={isBusy || isDone}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium bg-brand-card-hover text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Incorrecta
                    </button>
                    <button
                      onClick={() => grade(answer.id, true)}
                      disabled={isBusy || isDone}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Correcta
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
