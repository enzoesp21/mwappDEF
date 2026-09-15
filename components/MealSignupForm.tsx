'use client'

import { useMemo, useState } from 'react'
import { Utensils, Leaf, Sprout, Wheat, ShoppingBag, Check, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveMealSignupsAction, type MealChange } from '@/app/actions/meals'
import { SIGNUP_CUTOFF_LABEL } from '@/lib/meals-utils'
import type { MenuDia } from '@/lib/menu-semanal'

const PREFS = [
  { key: 'tradicional', label: 'Tradicional', icon: Utensils, color: 'text-brand-accent', bg: 'bg-brand-accent/10 border-brand-accent/30', sel: 'bg-brand-accent border-brand-accent text-white' },
  { key: 'vegetariano', label: 'Vegetariano', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50 border-green-200', sel: 'bg-green-600 border-green-600 text-white' },
  { key: 'vegano', label: 'Vegano', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', sel: 'bg-emerald-600 border-emerald-600 text-white' },
  { key: 'celiaco', label: 'Celíaco', icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', sel: 'bg-amber-600 border-amber-600 text-white' },
  { key: 'propio', label: 'Me lo traigo', icon: ShoppingBag, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', sel: 'bg-slate-500 border-slate-500 text-white' },
] as const

type Pref = typeof PREFS[number]['key']
type Sel = Record<string, string>

interface Day {
  date: string
  dayName: string
  meals: ('almuerzo' | 'cena')[]
}

interface Props {
  weekDays: Day[]
  signups: Record<string, Record<string, string>>
  isOpen: boolean
  /** Qué se cocina cada día, para elegir sabiendo. */
  menu: Record<string, MenuDia>
}

function slotKey(date: string, meal: string) {
  return date + '|' + meal
}

function flatten(nested: Record<string, Record<string, string>>): Sel {
  const out: Sel = {}
  for (const date of Object.keys(nested)) {
    for (const meal of Object.keys(nested[date])) {
      out[slotKey(date, meal)] = nested[date][meal]
    }
  }
  return out
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function MealSignupForm({ weekDays, signups, isOpen, menu }: Props) {
  const initial = useMemo(() => flatten(signups), [signups])
  const [saved, setSaved] = useState<Sel>(initial)
  const [draft, setDraft] = useState<Sel>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const dirtyKeys = useMemo(() => {
    const keys = new Set([...Object.keys(saved), ...Object.keys(draft)])
    return Array.from(keys).filter((k) => (saved[k] ?? '') !== (draft[k] ?? ''))
  }, [saved, draft])

  function pick(date: string, meal: string, pref: Pref) {
    if (!isOpen || saving) return
    setError(null)
    setJustSaved(false)
    const k = slotKey(date, meal)
    setDraft((d) => {
      const next = { ...d }
      if (next[k] === pref) delete next[k]
      else next[k] = pref
      return next
    })
  }

  async function handleSave() {
    if (dirtyKeys.length === 0 || saving) return
    setSaving(true)
    setError(null)

    const changes: MealChange[] = dirtyKeys.map((k) => {
      const [mealDate, mealType] = k.split('|')
      return { mealDate, mealType, preference: draft[k] ?? null }
    })

    const result = await saveMealSignupsAction(changes)
    setSaving(false)

    if (result.ok) {
      setSaved(draft)
      setJustSaved(true)
    } else {
      setError(result.error)
    }
  }

  function discard() {
    setDraft(saved)
    setError(null)
  }

  return (
    <div className="space-y-3 pb-48">
      {!isOpen && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Las inscripciones cerraron {SIGNUP_CUTOFF_LABEL}. Vas a poder anotarte para la semana
            siguiente a partir del lunes.
          </span>
        </div>
      )}

      {weekDays.map((day) => (
        <div key={day.date} className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-brand-text">{day.dayName}</span>
            <span className="text-xs text-brand-muted">{fmtDate(day.date)}</span>
          </div>

          {day.meals.map((meal) => {
            const k = slotKey(day.date, meal)
            const selected = draft[k] as Pref | undefined
            const isDirty = (saved[k] ?? '') !== (draft[k] ?? '')
            const plato = menu[day.date]?.[meal] ?? null
            return (
              <div key={meal}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-brand-muted uppercase tracking-wide capitalize">
                    {meal}
                  </p>
                  {isDirty && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      sin guardar
                    </span>
                  )}
                </div>

                {plato && (
                  <div className="bg-brand-dark/60 rounded-xl px-3 py-2 mb-2 space-y-1">
                    <p className="text-sm text-brand-text leading-snug">
                      {plato.principal}
                      {plato.nota && (
                        <span className="text-brand-muted"> · {plato.nota}</span>
                      )}
                    </p>
                    {plato.vegetariano && (
                      <p className="flex items-start gap-1.5 text-xs text-green-700 leading-snug">
                        <Leaf className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        {plato.vegetariano}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {PREFS.map(({ key, label, icon: Icon, color, bg, sel }) => {
                    const isSel = selected === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => pick(day.date, meal, key)}
                        disabled={!isOpen || saving}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                          isSel ? sel : cn(bg, color),
                          !isOpen || saving
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:opacity-80 cursor-pointer'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {isOpen && (
        <div
          className="fixed left-0 right-0 z-30 bg-brand-dark/95 backdrop-blur-sm border-t border-brand-border"
          // Apoyada justo encima del menú inferior (h-16), que va en z-40.
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
            {error && (
              <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {dirtyKeys.length > 0 ? (
                  <p className="text-xs text-brand-text font-medium">
                    {dirtyKeys.length} cambio{dirtyKeys.length !== 1 ? 's' : ''} sin guardar
                  </p>
                ) : justSaved ? (
                  <p className="text-xs text-brand-success font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Guardado. Ya le llegó al encargado.
                  </p>
                ) : (
                  <p className="text-xs text-brand-muted">Elegí tu menú y tocá Guardar.</p>
                )}
              </div>

              {dirtyKeys.length > 0 && !saving && (
                <button
                  type="button"
                  onClick={discard}
                  className="text-xs text-brand-muted hover:text-brand-text transition-colors cursor-pointer px-2 py-2"
                >
                  Descartar
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={dirtyKeys.length === 0 || saving}
                className={cn(
                  'flex items-center justify-center gap-2 px-5 rounded-xl font-semibold text-sm min-h-[44px] transition-colors',
                  dirtyKeys.length === 0 || saving
                    ? 'bg-brand-card border border-brand-border text-brand-muted cursor-not-allowed'
                    : 'bg-brand-accent text-white hover:bg-brand-accent-hover cursor-pointer'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
