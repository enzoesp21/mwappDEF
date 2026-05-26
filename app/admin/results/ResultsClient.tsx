'use client'

import { useState, useMemo } from 'react'
import { X, Filter, PenLine } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ResultRow {
  id: string
  score: number
  passed: boolean
  completed_at: string
  signature_data: string | null
  user_name: string
  user_puesto: string
  guide_title: string
  guide_id: string
  passing_score: number
}

interface ResultsClientProps {
  results: ResultRow[]
  guideOptions: { id: string; title: string }[]
}

export default function ResultsClient({ results, guideOptions }: ResultsClientProps) {
  const [guideFilter, setGuideFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [signatureModal, setSignatureModal] = useState<ResultRow | null>(null)

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (guideFilter && r.guide_id !== guideFilter) return false
      if (nameSearch && !r.user_name.toLowerCase().includes(nameSearch.toLowerCase())) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(r.completed_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(r.completed_at) > to) return false
      }
      return true
    })
  }, [results, guideFilter, dateFrom, dateTo, nameSearch])

  const approvedCount = filtered.filter((r) => r.passed).length

  function clearFilters() {
    setGuideFilter('')
    setDateFrom('')
    setDateTo('')
    setNameSearch('')
  }

  const hasFilters = !!(guideFilter || dateFrom || dateTo || nameSearch)

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Resultados</h1>
          <p className="text-sm text-brand-muted mt-1">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · {approvedCount} aprobado{approvedCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-muted" />
            <span className="text-xs font-medium text-brand-muted">Filtros</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-brand-accent hover:text-brand-accent-hover transition-colors duration-200 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
            />

            <select
              value={guideFilter}
              onChange={(e) => setGuideFilter(e.target.value)}
              className="px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              <option value="">Todas las guías</option>
              {guideOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <label className="absolute -top-2 left-3 text-[10px] text-brand-muted bg-brand-dark px-1">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px] cursor-pointer"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 text-[10px] text-brand-muted bg-brand-dark px-1">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">
            No hay resultados que coincidan con los filtros.
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5">Usuario</th>
                    <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5 hidden md:table-cell">
                      Guía
                    </th>
                    <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5">Puntaje</th>
                    <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5 hidden lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filtered.map((result) => (
                    <tr
                      key={result.id}
                      className="hover:bg-brand-card-hover transition-colors duration-200"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-brand-text">{result.user_name}</p>
                        <p className="text-xs text-brand-muted mt-0.5">{result.user_puesto}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-brand-text">{result.guide_title}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-bold',
                              result.passed ? 'text-brand-success' : 'text-brand-error'
                            )}
                          >
                            {result.score}%
                          </span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full hidden sm:inline-flex',
                              result.passed
                                ? 'bg-brand-success/10 text-brand-success'
                                : 'bg-brand-error/10 text-brand-error'
                            )}
                          >
                            {result.passed ? 'Aprobado' : 'Reprobado'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-brand-muted text-xs">
                        {formatDateTime(result.completed_at)}
                      </td>
                      <td className="px-5 py-4">
                        {result.signature_data ? (
                          <button
                            onClick={() => setSignatureModal(result)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors duration-200 cursor-pointer min-h-[36px]"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            Ver firma
                          </button>
                        ) : (
                          <span className="text-xs text-brand-border">Sin firma</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Signature modal */}
      {signatureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setSignatureModal(null)}
        >
          <div
            className="bg-brand-card border border-brand-border rounded-xl p-5 max-w-md w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-brand-text">Firma del examen</h2>
                <p className="text-xs text-brand-muted mt-0.5">{signatureModal.user_name}</p>
              </div>
              <button
                onClick={() => setSignatureModal(null)}
                className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-lg p-2 flex items-center justify-center min-h-[160px]">
              <img
                src={signatureModal.signature_data!}
                alt={`Firma de ${signatureModal.user_name}`}
                className="max-w-full max-h-48 object-contain"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-brand-muted">Guía</p>
                <p className="text-xs text-brand-text font-medium mt-0.5 truncate">
                  {signatureModal.guide_title}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-muted">Puntaje</p>
                <p
                  className={cn(
                    'text-sm font-bold mt-0.5',
                    signatureModal.passed ? 'text-brand-success' : 'text-brand-error'
                  )}
                >
                  {signatureModal.score}%
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-muted">Fecha</p>
                <p className="text-xs text-brand-text font-medium mt-0.5">
                  {formatDateTime(signatureModal.completed_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
