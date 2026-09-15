'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Clock, MessageSquare, AlertTriangle, BookCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import { markSuggestionReadAction } from '@/app/actions/suggestions'
import type { Suggestion } from '@/lib/types'

interface SuggestionWithUser extends Suggestion {
  full_name: string
  puesto: string
}

type Tab = 'todas' | 'pendientes' | 'leidas'

export default function SugerenciasAdminClient({ suggestions }: { suggestions: SuggestionWithUser[] }) {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [localItems, setLocalItems] = useState(suggestions)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = localItems.filter((s) => {
    if (tab === 'pendientes') return !s.is_read
    if (tab === 'leidas') return s.is_read
    return true
  })

  const pendingCount = localItems.filter((s) => !s.is_read).length

  function handleMarkRead(item: SuggestionWithUser) {
    setLoadingId(item.id)
    startTransition(async () => {
      const result = await markSuggestionReadAction(item.id, item.user_id, item.category)
      if (result.success) {
        setLocalItems((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? { ...s, is_read: true, read_at: new Date().toISOString() }
              : s
          )
        )
      }
      setLoadingId(null)
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendientes', label: `Pendientes ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
    { key: 'leidas', label: 'Leídas' },
    { key: 'todas', label: 'Todas' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Sugerencias y Reclamos</h1>
        <p className="text-sm text-brand-muted mt-1">
          {pendingCount > 0
            ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} de lectura`
            : 'Todo al día'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-border pb-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer border-b-2 -mb-px',
              tab === key
                ? 'text-brand-accent border-brand-accent'
                : 'text-brand-muted border-transparent hover:text-brand-text'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
          {tab === 'pendientes' ? '¡Sin pendientes! Todo al día.' : 'Sin resultados en esta sección.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                'bg-brand-card border rounded-2xl p-5 space-y-3',
                !item.is_read ? 'border-brand-accent/30' : 'border-brand-border'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.category === 'reclamo' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-error bg-brand-error/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Reclamo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">
                      <MessageSquare className="w-3 h-3" />
                      Sugerencia
                    </span>
                  )}
                  <span className="text-sm font-semibold text-brand-text">{item.full_name}</span>
                  <span className="text-xs text-brand-muted">{item.puesto}</span>
                </div>
                {item.is_read ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-brand-success flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Leído
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente
                  </span>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-brand-text leading-relaxed">{item.content}</p>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[10px] text-brand-muted">
                  {formatDateTime(item.created_at)}
                  {item.is_read && item.read_at && (
                    <span className="ml-2 text-brand-success">
                      · Leído el {formatDateTime(item.read_at)}
                    </span>
                  )}
                </p>
                {!item.is_read && (
                  <button
                    onClick={() => handleMarkRead(item)}
                    disabled={loadingId === item.id || isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookCheck className="w-3.5 h-3.5" />
                    {loadingId === item.id ? 'Marcando...' : 'Marcar como leído'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
