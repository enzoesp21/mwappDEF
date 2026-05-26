'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Save, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PUESTOS } from '@/lib/types'
import type { ExamQuestion } from '@/lib/types'
import MarkdownEditor from '@/components/admin/MarkdownEditor'
import QuestionList from '@/components/admin/QuestionList'
import QuestionForm from '@/components/admin/QuestionForm'
import { FullPageLoader } from '@/components/LoadingSpinner'
import { cn } from '@/lib/utils'

export default function EditGuidePage() {
  const params = useParams()
  const guideId = params.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPuestos, setSelectedPuestos] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [examId, setExamId] = useState<string | null>(null)
  const [examTitle, setExamTitle] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [showExamSection, setShowExamSection] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: guide } = await supabase
        .from('guides')
        .select('*')
        .eq('id', guideId)
        .single()

      if (!guide) {
        router.push('/admin/guides')
        return
      }

      setTitle(guide.title)
      setDescription(guide.description ?? '')
      setSelectedPuestos(guide.puestos ?? [])
      setContent(guide.content ?? '')

      const { data: exam } = await supabase
        .from('exams')
        .select('*')
        .eq('guide_id', guideId)
        .single()

      if (exam) {
        setExamId(exam.id)
        setExamTitle(exam.title)
        setPassingScore(exam.passing_score)

        const { data: qs } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', exam.id)
          .order('order', { ascending: true })

        setQuestions(qs ?? [])
      }

      setLoading(false)
    }

    loadData()
  }, [guideId, router])

  function markDirty() {
    setDirty(true)
    setSaved(false)
    isDirtyRef.current = true
  }

  const handleSave = useCallback(async (isAuto = false) => {
    if (!title.trim()) {
      if (!isAuto) setError('El título es obligatorio.')
      return
    }
    if (selectedPuestos.length === 0) {
      if (!isAuto) setError('Selecciona al menos un puesto.')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      const { error: guideErr } = await supabase
        .from('guides')
        .update({
          title: title.trim(),
          description: description.trim(),
          puestos: selectedPuestos,
          content,
        })
        .eq('id', guideId)

      if (guideErr) throw new Error(guideErr.message)

      if (examTitle.trim()) {
        let currentExamId = examId

        if (!currentExamId) {
          const { data: newExam, error: examErr } = await supabase
            .from('exams')
            .insert({ guide_id: guideId, title: examTitle.trim(), passing_score: passingScore })
            .select('id')
            .single()

          if (examErr || !newExam) throw new Error(examErr?.message ?? 'Error al crear examen')
          currentExamId = newExam.id
          setExamId(currentExamId)
        } else {
          await supabase
            .from('exams')
            .update({ title: examTitle.trim(), passing_score: passingScore })
            .eq('id', currentExamId)
        }

        await supabase.from('exam_questions').delete().eq('exam_id', currentExamId)

        if (questions.length > 0) {
          await supabase.from('exam_questions').insert(
            questions.map((q, i) => ({
              exam_id: currentExamId,
              question: q.question,
              options: q.options,
              correct_option: q.correct_option,
              order: i,
            }))
          )
        }
      }

      setSaved(true)
      setDirty(false)
      isDirtyRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [guideId, title, description, selectedPuestos, content, examId, examTitle, passingScore, questions])

  useEffect(() => {
    if (!dirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (isDirtyRef.current) handleSave(true)
    }, 30000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [dirty, handleSave])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  function togglePuesto(puesto: string) {
    markDirty()
    setSelectedPuestos((prev) =>
      prev.includes(puesto) ? prev.filter((p) => p !== puesto) : [...prev, puesto]
    )
  }

  function toggleAllPuestos() {
    markDirty()
    if (selectedPuestos.length === PUESTOS.length) {
      setSelectedPuestos([])
    } else {
      setSelectedPuestos([...PUESTOS])
    }
  }

  function handleAddQuestion(question: ExamQuestion) {
    setQuestions((prev) => [...prev, { ...question, order: prev.length }])
    markDirty()
  }

  function handleReorderQuestions(reordered: ExamQuestion[]) {
    setQuestions(reordered)
    markDirty()
  }

  function handleDeleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })))
    markDirty()
  }

  function handleEditQuestion(q: ExamQuestion) {
    setQuestions((prev) => prev.filter((existing) => existing.id !== q.id).concat(q))
    markDirty()
  }

  async function handleSaveAndExit() {
    await handleSave(false)
    if (!error) router.push('/admin/guides')
  }

  if (loading) return <FullPageLoader />

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-28 lg:pb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Editar guía</h1>
          <p className="text-sm text-brand-muted mt-1 truncate max-w-xs">{title}</p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-border text-brand-muted text-sm font-medium rounded-lg hover:text-brand-text hover:border-brand-text transition-colors duration-200 cursor-pointer disabled:opacity-40 min-h-[44px]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          <button
            onClick={handleSaveAndExit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-brand-dark text-sm font-semibold rounded-lg hover:bg-brand-accent-hover transition-colors duration-200 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-brand-error/10 border border-brand-error/20 rounded-lg text-sm text-brand-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-success/10 border border-brand-success/20 rounded-lg text-sm text-brand-success">
          <CheckCircle2 className="w-4 h-4" />
          Cambios guardados correctamente
        </div>
      )}

      {/* Guide fields */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-5">
        <h2 className="text-base font-semibold text-brand-text">Información de la guía</h2>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">
            Título <span className="text-brand-error">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty() }}
            className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => { setDescription(e.target.value); markDirty() }}
            className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-brand-muted">
              Puestos <span className="text-brand-error">*</span>
            </label>
            <button
              type="button"
              onClick={toggleAllPuestos}
              className="text-xs text-brand-accent hover:text-brand-accent-hover transition-colors duration-200 cursor-pointer"
            >
              {selectedPuestos.length === PUESTOS.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PUESTOS.map((puesto) => (
              <button
                key={puesto}
                type="button"
                onClick={() => togglePuesto(puesto)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 cursor-pointer min-h-[32px]',
                  selectedPuestos.includes(puesto)
                    ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
                    : 'bg-brand-dark text-brand-muted border-brand-border hover:border-brand-accent/30 hover:text-brand-text'
                )}
              >
                {puesto}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content editor */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-brand-text">Contenido de la guía</h2>
        <MarkdownEditor
          value={content}
          onChange={(v) => { setContent(v); markDirty() }}
          saved={saved}
          dirty={dirty}
        />
      </div>

      {/* Exam section */}
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExamSection((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer"
        >
          <h2 className="text-base font-semibold text-brand-text">
            Examen asociado
            {questions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-brand-muted">
                ({questions.length} preguntas)
              </span>
            )}
          </h2>
          {showExamSection ? (
            <ChevronUp className="w-4 h-4 text-brand-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-muted" />
          )}
        </button>

        {showExamSection && (
          <div className="border-t border-brand-border p-5 space-y-5 animate-slide-up">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">
                  Título del examen
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => { setExamTitle(e.target.value); markDirty() }}
                  placeholder="Ej: Evaluación protocolo de atención"
                  className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">
                  Puntaje de aprobación (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => { setPassingScore(Number(e.target.value)); markDirty() }}
                  className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-brand-text mb-3">
                Preguntas{' '}
                <span className="text-brand-muted font-normal">({questions.length})</span>
              </h3>
              <QuestionList
                questions={questions}
                onReorder={handleReorderQuestions}
                onDelete={handleDeleteQuestion}
                onEdit={handleEditQuestion}
              />
            </div>

            <QuestionForm
              examId={examId ?? 'pending'}
              onAdd={handleAddQuestion}
            />
          </div>
        )}
      </div>

      {/* Mobile sticky save */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-brand-dark border-t border-brand-border z-20 flex gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !dirty}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-brand-border text-brand-muted text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-40 min-h-[48px]"
        >
          Guardar
        </button>
        <button
          onClick={handleSaveAndExit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-brand-dark text-sm font-semibold rounded-lg hover:bg-brand-accent-hover transition-colors duration-200 cursor-pointer disabled:opacity-50 min-h-[48px]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
