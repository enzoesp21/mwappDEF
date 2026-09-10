'use client'

import { useState, useTransition } from 'react'
import { Utensils, Leaf, Wheat, Sprout, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signupForMealAction, cancelMealSignupAction } from '@/app/actions/meals'

const OPTIONS = [
  {
    key: 'tradicional',
    label: 'Tradicional',
    desc: 'Menú completo sin restricciones',
    icon: Utensils,
    color: 'text-brand-accent',
    bg: 'bg-brand-accent/10 border-brand-accent/30',
    activeBg: 'bg-brand-accent border-brand-accent',
  },
  {
    key: 'vegetariano',
    label: 'Vegetariano',
    desc: 'Sin carnes, con lácteos y huevos',
    icon: Leaf,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    activeBg: 'bg-green-600 border-green-600',
  },
  {
    key: 'vegano',
    label: 'Vegano',
    desc: 'Sin productos de origen animal',
    icon: Sprout,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    activeBg: 'bg-emerald-600 border-emerald-600',
  },
  {
    key: 'celiaco',
    label: 'Celíaco',
    desc: 'Sin TACC (trigo, avena, cebada, centeno)',
    icon: Wheat,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-600 border-amber-600',
  },
] as const

interface MealSignupFormProps {
  currentPreference: string | null
  weekLabel: string
}

export default function MealSignupForm({ currentPreference, weekLabel }: MealSignupFormProps) {
  const [selected, setSelected] = useState<string | null>(currentPreference)
  const [saved, setSaved] = useState<string | null>(currentPreference)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function handleSelect(key: string) {
    if (isPending) return
    setSelected(key)
    setFeedback(null)
  }

  function handleSave() {
    if (!selected) return
    startTransition(async () => {
      const result = await signupForMealAction(selected)
      if (result.error) {
        setFeedback({ type: 'error', msg: 'Error al guardar. Intentá de nuevo.' })
      } else {
        setSaved(selected)
        setFeedback({ type: 'success', msg: '¡Anotación guardada! La cocina ya lo sabe.' })
      }
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelMealSignupAction()
      if (!result.error) {
        setSelected(null)
        setSaved(null)
        setFeedback({ type: 'success', msg: 'Anotación cancelada.' })
      }
    })
  }

  const hasChanges = selected !== saved

  return (
    <div className="space-y-4">
      <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
        <p className="text-xs text-brand-muted mb-1">Semana del</p>
        <p className="text-sm font-semibold text-brand-text">{weekLabel}</p>
        {saved && (
          <p className="text-xs text-brand-success mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Ya estás anotado: <span className="font-medium capitalize">{saved}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map(({ key, label, desc, icon: Icon, color, bg, activeBg }) => {
          const isActive = selected === key
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isPending}
              className={cn(
                'flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer disabled:opacity-50',
                isActive ? cn(activeBg, 'text-white') : cn(bg, 'hover:opacity-90')
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', isActive ? 'text-white' : color)} />
              <div>
                <p className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-brand-text')}>
                  {label}
                </p>
                <p className={cn('text-xs mt-0.5', isActive ? 'text-white/80' : 'text-brand-muted')}>
                  {desc}
                </p>
              </div>
              {isActive && <CheckCircle className="w-4 h-4 text-white ml-auto flex-shrink-0 mt-0.5" />}
            </button>
          )
        })}
      </div>

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

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!selected || !hasChanges || isPending}
          className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Guardando...' : 'Confirmar anotación'}
        </button>
        {saved && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 py-3 border border-brand-border text-brand-muted hover:text-brand-error hover:border-brand-error rounded-xl text-sm transition-colors duration-200 cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
