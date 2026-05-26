'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SignatureCanvas from '@/components/exam/SignatureCanvas'
import ProgressBar from '@/components/exam/ProgressBar'
import { cn } from '@/lib/utils'
import type { ExamQuestion } from '@/lib/types'

type ExamState = 'loading' | 'taking' | 'passed' | 'failed' | 'signing' | 'done'

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const guideId = params.id as string

  const [state, setState] = useState<ExamState>('loading')
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [examId, setExamId] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [score, setScore] = useState(0)
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
      router.push(`/dashboard/guides/${guideId}`)
      return
    }

    const { data: qs } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', exam.id)
      .order('order', { ascending: true })

    if (!qs || qs.length === 0) {
      router.push(`/dashboard/guides/${guideId}`)
      return
    }

    setExamId(exam.id)
    setExamTitle(exam.title)
    setPassingScore(exam.passing_score)
    setQuestions(qs)
    setState('taking')
  }, [guideId, router])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  const handleNext = () => {
    if (selectedOption === null) return
    const newAnswers = [...answers, selectedOption]

    if (currentIndex < questions.length - 1) {
      setAnswers(newAnswers)
      setSelectedOption(null)
      setCurrentIndex((i) => i + 1)
    } else {
      const correct = newAnswers.filter((a, i) => a === questions[i].correct_option).length
      const finalScore = Math.round((correct / questions.length) * 100)
      setAnswers(newAnswers)
      setScore(finalScore)
      setState(finalScore >= passingScore ? 'passed' : 'failed')
    }
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setAnswers([])
    setSelectedOption(null)
    setScore(0)
    setState('taking')
  }

  const handleSaveResult = async () => {
    if (!signature) {
      setError('Por favor, firmá antes de confirmar.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error: saveError } = await supabase.from('exam_results').insert({
      user_id: user.id,
      exam_id: examId,
      score,
      passed: true,
      signature_data: signature,
    })

    if (saveError) {
      setError('Error al guardar el resultado. Intentá de nuevo.')
      setSaving(false)
      return
    }

    setState('done')
    setSaving(false)
  }

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="text-center py-16 animate-slide-up space-y-4">
        <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-brand-success" />
        </div>
        <h2 className="text-xl font-bold text-brand-text">¡Examen completado!</h2>
        <p className="text-brand-muted text-sm">Tu firma fue guardada correctamente.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-6 py-3 rounded-xl hover:bg-brand-accent-hover transition-colors cursor-pointer"
        >
          Ir al inicio
        </Link>
      </div>
    )
  }

  if (state === 'passed' || state === 'signing') {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-2xl font-bold text-brand-success">{score}%</h2>
          <p className="text-brand-text font-semibold">¡Aprobaste el examen!</p>
          <p className="text-brand-muted text-sm">Respondiste correctamente {Math.round((score / 100) * questions.length)} de {questions.length} preguntas.</p>
        </div>

        <div className="bg-brand-card border border-brand-accent/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-brand-accent" />
            <h3 className="font-semibold text-brand-text">Firma tu conformidad</h3>
          </div>
          <p className="text-brand-muted text-sm">
            Firmá con el dedo para confirmar que leíste la guía y aprobaste el examen.
          </p>
          <SignatureCanvas onSignature={setSignature} />

          {error && (
            <div className="bg-brand-error/10 border border-brand-error/30 rounded-lg px-4 py-3 text-brand-error text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSaveResult}
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
              'Confirmar firma'
            )}
          </button>
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
            Necesitás {passingScore}% para aprobar. Respondiste correctamente {Math.round((score / 100) * questions.length)} de {questions.length} preguntas.
          </p>
          <p className="text-brand-muted text-xs">Revisá la guía y volvé a intentarlo cuando estés listo.</p>
        </div>

        <div className="flex flex-col gap-3">
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
            href={`/dashboard/guides/${guideId}`}
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

  const question = questions[currentIndex]
  const optionLabels = ['A', 'B', 'C', 'D']

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/guides/${guideId}`}
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

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-slide-up">
        <p className="text-brand-text font-medium leading-relaxed">{question.question}</p>
      </div>

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

      <button
        onClick={handleNext}
        disabled={selectedOption === null}
        className={cn(
          'w-full py-3 px-4 rounded-xl font-semibold text-sm min-h-[48px]',
          'bg-brand-accent text-brand-dark hover:bg-brand-accent-hover',
          'transition-colors cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {currentIndex === questions.length - 1 ? 'Finalizar examen' : 'Siguiente pregunta'}
      </button>
    </div>
  )
}
