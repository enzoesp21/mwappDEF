'use client'

import { useMemo, useState } from 'react'
import { Search, Check, Loader2, AlertCircle, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { castVoteAction } from '@/app/actions/employee'

export interface Candidate {
  id: string
  full_name: string
  puesto: string
}

interface Props {
  candidates: Candidate[]
  currentVote: { candidate_id: string; comment: string | null } | null
  periodLabel: string
}

export default function VoteForm({ candidates, currentVote, periodLabel }: Props) {
  const [selected, setSelected] = useState<string | null>(currentVote?.candidate_id ?? null)
  const [comment, setComment] = useState(currentVote?.comment ?? '')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.puesto.toLowerCase().includes(q)
    )
  }, [candidates, search])

  const dirty =
    selected !== (currentVote?.candidate_id ?? null) ||
    comment.trim() !== (currentVote?.comment ?? '').trim()

  async function handleSave() {
    if (!selected || saving) return
    setSaving(true)
    setError(null)

    const result = await castVoteAction(selected, comment)
    setSaving(false)

    if (result.ok) setSaved(true)
    else setError(result.error)
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 text-center">
        <p className="text-brand-muted text-sm">
          Todavía no hay compañeros a quienes votar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <Eye className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Tu voto <strong>no es anónimo</strong>: los encargados ven a quién votaste. Podés
          cambiarlo cuando quieras hasta que cierre el mes.
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o puesto..."
          className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors min-h-[44px]"
        />
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-brand-muted text-sm text-center py-8">Nadie coincide con la búsqueda.</p>
        ) : (
          <div className="divide-y divide-brand-border">
            {filtered.map((c) => {
              const isSel = selected === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelected(c.id)
                    setSaved(false)
                    setError(null)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full text-left px-4 py-3 transition-colors cursor-pointer min-h-[52px]',
                    isSel ? 'bg-brand-accent/10' : 'hover:bg-brand-card-hover'
                  )}
                >
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                      isSel ? 'bg-brand-accent text-white' : 'bg-brand-dark text-brand-muted'
                    )}
                  >
                    {isSel ? <Check className="w-4 h-4" /> : c.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-text truncate">{c.full_name}</p>
                    {c.puesto && <p className="text-xs text-brand-muted truncate">{c.puesto}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value)
          setSaved(false)
        }}
        rows={3}
        maxLength={300}
        placeholder="¿Por qué lo votás? (opcional)"
        className="w-full px-4 py-3 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors resize-y leading-relaxed"
      />

      {error && (
        <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {saved && !dirty && (
        <p className="flex items-center gap-1.5 text-xs text-brand-success font-medium">
          <Check className="w-3.5 h-3.5" />
          Voto guardado para {periodLabel}.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!selected || saving || (!dirty && saved)}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm min-h-[48px] transition-colors',
          !selected || saving
            ? 'bg-brand-card border border-brand-border text-brand-muted cursor-not-allowed'
            : 'bg-brand-accent text-white hover:bg-brand-accent-hover cursor-pointer'
        )}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {currentVote ? 'Cambiar mi voto' : 'Votar'}
      </button>
    </div>
  )
}
