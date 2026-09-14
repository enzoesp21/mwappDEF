'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, PenLine, Clock3, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SignatureCanvas from '@/components/exam/SignatureCanvas'
import ProgressBar from '@/components/exam/ProgressBar'
import { cn } from '@/lib/utils'

type ExamState = 'loading' | 'taking' | 'signing' | 'passed' | 'failed' | 'pending'

// Sin correct_option a propósito: la corrección vive en el servidor.
interface PublicQuestion {
  id: string
  question: string
  options: string[]
  question_type: 'multiple_choice' | 'open'
  order: number
}

interface Answer {
  question_id: string
  selected_option?: number
  answer_text?: string
}

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const guideId = params.id as string

  const [state, setState] = useState<ExamState>('loading')
  const [questions, setQuestions] = useState<PublicQuestion[]>([])
  const [examId, setExamId] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [openText, setOpenText] = useState('')
  const [score, setScore] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [resultId, setResultId] = useState<string | null>(null)
  const [signature, setSignature] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadExam = useCallback(async () => {
    const supabase = createClient()
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, passing_score')
      .eq('guide_id', guideId)
      .single()

    if (!exam) {
      router.push('/dashboard/guides/' + guideId)
      return
    }

    const { data: qs } = await supabase.rpc('get_exam_questions', { p_exam_id: exam.id })

    if (!qs || qs.length === 0) {
      router.push('/dashboard/guides/' + guideId)
      return
    }

    setExamId(exam.id)
    setExamTitle(exam.title)
    setPassingScore(exam.passing_score)
    setQuestions(qs as PublicQuestion[])
    setState('taking')
  }, [guideId, router])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  const question = questions[currentIndex]
  const isOpen = question?.question_type === 'open'
  const canAdvance = isOpen ? openText.trim().length > 0 : selectedOption !== null

  const handleNext = () => {
    if (!canAdvance || !question) return

    const answer: Answer = isOpen
      ? { question_id: question.id, answer_text: openText.trim() }
      : { question_id: question.id, selected_option: selectedOption as number }

    setAnswers((prev) => ({ ...prev, [question.id]: answer }))
    setSelectedOption(null)
    setOpenText('')
    setError('')

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setState('signing')
    }
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setAnswers({})
    setSelectedOption(null)
    setOpenText('')
    setScore(0)
    setSignature('')
    setError('')
    setState('taking')
  }

  const handleSubmit = async () => {
    if (!signature) {
      setError('Por favor, firmá antes de confirmar.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = questions.map((q) => answers[q.id]).filter(Boolean)

    const { data, error: submitError } = await supabase.rpc('submit_exam', {
      p_exam_id: examId,
      p_answers: payload,
      p_signature: signature,
    })

    setSaving(false)

    if (submitError || !data) {
      setError('No se pudo enviar el examen. Revisá tu conexión e intentá de nuevo.')
      return
    }

    const result = data as {
      review_status: string
      score?: number
      passed?: boolean
      pending?: number
      result_id?: string
    }

    setResultId(result.result_id ?? null)

    if (result.review_status === 'pending_review') {
      setPendingCount(result.pending ?? 0)
      setState('pending')
      return
    }

    setScore(result.score ?? 0)
    setState(result.passed ? 'passed' : 'failed')
  }

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'pending') {
    return (
      <div className="text-center py-16 animate-slide-up space-y-4">
        <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Clock3 className="w-8 h-8 text-brand-accent" />
        </div>
        <h2 className="text-xl font-bold text-brand-text">Examen enviado</h2>
        <p className="text-brand-muted text-sm max-w-sm mx-auto leading-relaxed">
          {pendingCount === 1
            ? 'Tu examen tiene 1 respuesta escrita que un encargado tiene que corregir.'
            : 'Tu examen tiene ' + pendingCount + ' respuestas escritas que un encargado tiene que corregir.'}{' '}
          Te avisamos con una notificación cuando esté la nota.
        </p>
        <div className="max-w-xs mx-auto space-y-2 pt-2">
        {resultId && (
          <Link
            href={'/dashboard/revision/' + resultId}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-card border border-brand-border text-brand-text font-medium text-sm hover:border-brand-accent/50 transition-colors cursor-pointer min-h-[48px]"
          >
            <ClipboardList className="w-4 h-4" />
            Ver en qué me equivoqué
          </Link>
        )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full bg-brand-accent text-brand-dark font-semibold px-6 py-3 rounded-xl hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[48px]"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'passed') {
    return (
      <div className="text-center py-16 animate-slide-up space-y-4">
        <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-brand-success" />
        </div>
        <h2 className="text-2xl font-bold text-brand-success">{score}%</h2>
        <p className="text-brand-text font-semibold">¡Aprobaste el examen!</p>
        <div className="max-w-xs mx-auto space-y-2 pt-2">
        {resultId && (
          <Link
            href={'/dashboard/revision/' + resultId}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-card border border-brand-border text-brand-text font-medium text-sm hover:border-brand-accent/50 transition-colors cursor-pointer min-h-[48px]"
          >
            <ClipboardList className="w-4 h-4" />
            Ver en qué me equivoqué
          </Link>
        )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full bg-brand-accent text-brand-dark font-semibold px-6 py-3 rounded-xl hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[48px]"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 bg-brand-error/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-brand-error" />
          </div>
          <h2 className="text-2xl font-bold text-brand-error">{score}%</h2>
          <p className="text-brand-text font-semibold">No llegaste al puntaje mínimo</p>
          <p className="text-brand-muted text-sm">
            Necesitás {passingScore}% para aprobar.
          </p>
          <p className="text-brand-muted text-xs">Revisá la guía y volvé a intentarlo cuando estés listo.</p>
        </div>

        <div className="flex flex-col gap-3">
        {resultId && (
          <Link
            href={'/dashboard/revision/' + resultId}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-card border border-brand-border text-brand-text font-medium text-sm hover:border-brand-accent/50 transition-colors cursor-pointer min-h-[48px]"
          >
            <ClipboardList className="w-4 h-4" />
            Ver en qué me equivoqué
          </Link>
        )}
          <button
            onClick={handleRetry}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl min-h-[48px]',
              'bg-brand-accent text-brand-dark font-semibold text-sm',
              'hover:bg-brand-accent-hover transition-colors cursor-pointer'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar examen
          </button>
          <Link
            href={'/dashboard/guides/' + guideId}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl min-h-[48px]',
              'bg-brand-card border border-brand-border text-brand-muted text-sm',
              'hover:border-brand-accent/50 hover:text-brand-text transition-colors cursor-pointer'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la guía
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'signing') {
    const openCount = questions.filter((q) => q.question_type === 'open').length
    return (
      <div className="animate-slide-up space-y-6">
        <div className="text-center space-y-2 py-4">
          <h2 className="text-xl font-bold text-brand-text">Terminaste el examen</h2>
          <p className="text-brand-muted text-sm">
            {openCount > 0
              ? 'Firmá para enviarlo. Un encargado va a corregir las respuestas escritas.'
              : 'Firmá para enviarlo y ver tu resultado.'}
          </p>
        </div>

        <div className="bg-brand-card border border-brand-accent/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-brand-accent" />
            <h3 className="font-semibold text-brand-text">Firmá tu conformidad</h3>
          </div>
          <p className="text-brand-muted text-sm">
            Firmá con el dedo para confirmar que leíste la guía y que estas son tus respuestas.
          </p>
          <SignatureCanvas onSignature={setSignature} />

          {error && (
            <div className="bg-brand-error/10 border border-brand-error/30 rounded-lg px-4 py-3 text-brand-error text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !signature}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl min-h-[48px]',
              'bg-brand-accent text-brand-dark font-semibold text-sm',
              'hover:bg-brand-accent-hover transition-colors cursor-pointer',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
            ) : (
              'Enviar examen'
            )}
          </button>
        </div>
      </div>
    )
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={'/dashboard/guides/' + guideId}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer"
          aria-label="Salir del examen"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
        <div>
          <p className="text-brand-muted text-xs uppercase tracking-wider">Examen</p>
          <h1 className="text-base font-bold text-brand-text leading-tight">{examTitle}</h1>
        </div>
      </div>

      <ProgressBar current={currentIndex + 1} total={questions.length} />

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-slide-up space-y-2">
        {isOpen && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">
            Respuesta escrita
          </span>
        )}
        <p className="text-brand-text font-medium leading-relaxed">{question.question}</p>
      </div>

      {isOpen ? (
        <div className="space-y-2">
          <textarea
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            rows={6}
            maxLength={1500}
            placeholder="Escribí tu respuesta con tus palabras..."
            className="w-full px-4 py-3 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors resize-y leading-relaxed"
          />
          <p className="text-xs text-brand-muted text-right">{openText.length}/1500</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(question.options as string[]).map((option, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={cn(
                'w-full flex items-start gap-3 p-4 rounded-xl border text-left cursor-pointer',
                'transition-all duration-200 min-h-[52px]',
                selectedOption === idx
                  ? 'border-brand-accent bg-brand-accent/10 text-brand-text'
                  : 'border-brand-border bg-brand-card text-brand-text hover:border-brand-accent/40 hover:bg-brand-card-hover'
              )}
              aria-pressed={selectedOption === idx}
            >
              <span
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold',
                  selectedOption === idx
                    ? 'border-brand-accent bg-brand-accent text-brand-dark'
                    : 'border-brand-border text-brand-muted'
                )}
              >
                {optionLabels[idx]}
              </span>
              <span className="text-sm leading-relaxed pt-0.5">{option}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-brand-error text-sm text-center">{error}</p>}

      <button
        onClick={handleNext}
        disabled={!canAdvance}
        className={cn(
          'w-full py-3 px-4 rounded-xl font-semibold text-sm min-h-[48px]',
          'bg-brand-accent text-brand-dark hover:bg-brand-accent-hover',
          'transition-colors cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {currentIndex === questions.length - 1 ? 'Terminar y firmar' : 'Siguiente pregunta'}
      </button>
    </div>
  )
}
