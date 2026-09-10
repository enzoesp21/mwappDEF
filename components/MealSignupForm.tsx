'use client'

import { useState } from 'react'
import { Utensils, Leaf, Sprout, Wheat, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveMealSignupAction, removeMealSignupAction } from '@/app/actions/meals'

const PREFS = [
  { key: 'tradicional', label: 'Tradicional', icon: Utensils, color: 'text-brand-accent', bg: 'bg-brand-accent/10 border-brand-accent/30', sel: 'bg-brand-accent border-brand-accent text-white' },
  { key: 'vegetariano', label: 'Vegetariano', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50 border-green-200', sel: 'bg-green-600 border-green-600 text-white' },
  { key: 'vegano', label: 'Vegano', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', sel: 'bg-emerald-600 border-emerald-600 text-white' },
  { key: 'celiaco', label: 'Celiaco', icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', sel: 'bg-amber-600 border-amber-600 text-white' },
  { key: 'propio', label: 'Me lo traigo', icon: ShoppingBag, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', sel: 'bg-slate-500 border-slate-500 text-white' },
] as const

type Pref = typeof PREFS[number]['key']
interface Day { date: string; dayName: string; meals: ('almuerzo' | 'cena')[] }
interface Props { weekDays: Day[]; signups: Record<string, Record<string, string>>; isOpen: boolean }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function MealSignupForm({ weekDays, signups, isOpen }: Props) {
  const [local, setLocal] = useState(signups)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  async function handleClick(date: string, meal: string, pref: Pref) {
    if (!isOpen) return
    const k = date + '_' + meal
    if (busy[k]) return
    const cur = local[date]?.[meal]
    setBusy(b => ({ ...b, [k]: true }))
    if (cur === pref) {
      setLocal(l => {
        const n = { ...l, [date]: { ...(l[date] ?? {}) } }
        delete n[date][meal]
        return n
      })
      await removeMealSignupAction(date, meal)
    } else {
      setLocal(l => ({ ...l, [date]: { ...(l[date] ?? {}), [meal]: pref } }))
      await saveMealSignupAction(date, meal, pref)
    }
    setBusy(b => ({ ...b, [k]: false }))
  }

  return (
    <div className="space-y-3">
      {!isOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Las inscripciones cerraron el sabado a las 22hs. La proxima semana podes anotarte de nuevo.
        </div>
      )}
      {weekDays.map((day) => (
        <div key={day.date} className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-brand-text">{day.dayName}</span>
            <span className="text-xs text-brand-muted">{fmtDate(day.date)}</span>
          </div>
          {day.meals.map((meal) => {
            const k = day.date + '_' + meal
            const selected = local[day.date]?.[meal] as Pref | undefined
            return (
              <div key={meal}>
                <p className="text-xs font-medium text-brand-muted uppercase tracking-wide mb-2 capitalize">{meal}</p>
                <div className="flex flex-wrap gap-2">
                  {PREFS.map(({ key, label, icon: Icon, color, bg, sel }) => {
                    const isSel = selected === key
                    const isBusy = !!busy[k]
                    return (
                      <button
                        key={key}
                        onClick={() => handleClick(day.date, meal, key)}
                        disabled={!isOpen || isBusy}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                          isSel ? sel : cn(bg, color),
                          (!isOpen || isBusy) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
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
    </div>
  )
}
