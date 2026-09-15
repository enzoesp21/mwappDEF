'use client'

import { useRef, useState, useTransition } from 'react'
import { Send, MessageSquare, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitSuggestionAction } from '@/app/actions/suggestions'

export default function SugerenciasForm() {
  const [category, setCategory] = useState<'sugerencia' | 'reclamo'>('sugerencia')
  const [content, setContent] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    const formData = new FormData(formRef.current!)
    formData.set('category', category)

    startTransition(async () => {
      const result = await submitSuggestionAction(formData)
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error })
      } else {
        setFeedback({ type: 'success', msg: '¡Enviado correctamente! Los administradores lo revisarán pronto.' })
        setContent('')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-brand-text">Nueva {category}</h2>

      {/* Category selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCategory('sugerencia')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border',
            category === 'sugerencia'
              ? 'bg-brand-accent text-white border-brand-accent'
              : 'bg-transparent text-brand-muted border-brand-border hover:border-brand-accent/50'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Sugerencia
        </button>
        <button
          type="button"
          onClick={() => setCategory('reclamo')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border',
            category === 'reclamo'
              ? 'bg-brand-error text-white border-brand-error'
              : 'bg-transparent text-brand-muted border-brand-border hover:border-brand-error/50'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Reclamo
        </button>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            category === 'sugerencia'
              ? 'Escribí tu sugerencia acá...'
              : 'Describí tu reclamo con detalle...'
          }
          rows={4}
          maxLength={500}
          required
          className="w-full px-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted resize-none focus:outline-none focus:border-brand-accent transition-colors duration-200"
        />
        <p className="text-right text-[10px] text-brand-muted mt-1">{content.length}/500</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            'text-sm px-4 py-3 rounded-xl',
            feedback.type === 'success'
              ? 'bg-brand-success/10 text-brand-success'
              : 'bg-brand-error/10 text-brand-error'
          )}
        >
          {feedback.msg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || content.trim().length < 10}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {isPending ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
