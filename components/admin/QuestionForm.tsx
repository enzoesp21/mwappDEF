'use client'

import { useState } from 'react'
import { Plus, ListChecks, PenLine } from 'lucide-react'
import type { ExamQuestion, QuestionType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface QuestionFormProps {
  onAdd: (question: ExamQuestion) => void
  examId: string
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

const EMPTY_FORM = {
  question: '',
  options: ['', '', '', ''],
  correct_option: -1,
  question_type: 'multiple_choice' as QuestionType,
  answer_guide: '',
}

export default function QuestionForm({ onAdd, examId }: QuestionFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<string[]>([])

  const isOpen = form.question_type === 'open'

  function setOption(index: number, value: string) {
    setForm((prev) => {
      const options = [...prev.options]
      options[index] = value
      return { ...prev, options }
    })
  }

  function validate() {
    const errs: string[] = []
    if (!form.question.trim()) errs.push('La pregunta es obligatoria.')

    if (!isOpen) {
      form.options.forEach((opt, i) => {
        if (!opt.trim()) errs.push('La opción ' + OPTION_LABELS[i] + ' es obligatoria.')
      })
      if (form.correct_option === -1) errs.push('Tenés que marcar cuál es la opción correcta.')
    }

    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])

    const question: ExamQuestion = {
      id: crypto.randomUUID(),
      exam_id: examId,
      question: form.question.trim(),
      options: isOpen ? [] : form.options.map((o) => o.trim()),
      correct_option: isOpen ? null : form.correct_option,
      question_type: form.question_type,
      answer_guide: isOpen && form.answer_guide.trim() !== '' ? form.answer_guide.trim() : null,
      order: 0,
    }

    onAdd(question)
    setForm(EMPTY_FORM)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-brand-text">Agregar pregunta</h3>

      {errors.length > 0 && (
        <ul className="bg-brand-error/10 border border-brand-error/20 rounded-lg px-4 py-3 space-y-1">
          {errors.map((err) => (
            <li key={err} className="text-xs text-brand-error">
              {err}
            </li>
          ))}
        </ul>
      )}

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1.5">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, question_type: 'multiple_choice' }))}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer min-h-[44px]',
              !isOpen
                ? 'bg-brand-accent/10 border-brand-accent text-brand-accent'
                : 'bg-brand-dark border-brand-border text-brand-muted hover:text-brand-text'
            )}
          >
            <ListChecks className="w-4 h-4" />
            Opción múltiple
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, question_type: 'open' }))}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer min-h-[44px]',
              isOpen
                ? 'bg-brand-accent/10 border-brand-accent text-brand-accent'
                : 'bg-brand-dark border-brand-border text-brand-muted hover:text-brand-text'
            )}
          >
            <PenLine className="w-4 h-4" />
            Respuesta escrita
          </button>
        </div>
        {isOpen && (
          <p className="text-xs text-brand-muted mt-2">
            El empleado escribe la respuesta y vos la corregís a mano desde Correcciones.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1.5">Pregunta</label>
        <textarea
          rows={2}
          value={form.question}
          onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
          placeholder="Escribí la pregunta..."
          className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 resize-none"
        />
      </div>

      {isOpen ? (
        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">
            Referencia para corregir <span className="text-brand-muted">(opcional)</span>
          </label>
          <textarea
            rows={2}
            value={form.answer_guide}
            onChange={(e) => setForm((prev) => ({ ...prev, answer_guide: e.target.value }))}
            placeholder="Qué tendría que mencionar una buena respuesta..."
            className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 resize-none"
          />
          <p className="text-xs text-brand-muted mt-1.5">
            Solo la ves vos al corregir. El empleado no la ve.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <label className="block text-xs font-medium text-brand-muted">
            Opciones <span className="text-brand-accent">(marcá la correcta)</span>
          </label>
          {OPTION_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="correct_option"
                  value={i}
                  checked={form.correct_option === i}
                  onChange={() => setForm((prev) => ({ ...prev, correct_option: i }))}
                  className="w-4 h-4 accent-brand-accent cursor-pointer"
                />
                <span
                  className={cn(
                    'text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                    form.correct_option === i
                      ? 'bg-brand-accent text-brand-dark'
                      : 'bg-brand-card-hover text-brand-muted'
                  )}
                >
                  {label}
                </span>
              </label>
              <input
                type="text"
                value={form.options[i]}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={'Opción ' + label}
                className="flex-1 px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-brand-dark text-sm font-semibold rounded-lg hover:bg-brand-accent-hover transition-colors duration-200 cursor-pointer min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        Agregar pregunta
      </button>
    </form>
  )
}
