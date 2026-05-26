'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, ShieldCheck, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PUESTOS } from '@/lib/types'
import type { Profile, ExamResult } from '@/lib/types'
import { cn, formatDate, formatDateTime } from '@/lib/utils'

type UserWithResults = Profile & {
  resultsLoaded?: boolean
  results?: (ExamResult & { guide_title?: string })[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithResults[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [puestoFilter, setPuestoFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function loadResults(userId: string) {
    const { data: results } = await supabase
      .from('exam_results')
      .select(`*, exams ( title, guides ( title ) )`)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    const mapped = (results ?? []).map((r) => {
      const exam = r.exams as { title: string; guides: { title: string } | null } | null
      return { ...r, guide_title: exam?.guides?.title ?? exam?.title ?? '—' }
    })

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, results: mapped, resultsLoaded: true } : u))
    )
  }

  async function toggleExpand(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null)
      return
    }
    setExpandedId(userId)
    const user = users.find((u) => u.id === userId)
    if (!user?.resultsLoaded) {
      await loadResults(userId)
    }
  }

  async function toggleRole(user: UserWithResults) {
    const newRole = user.role === 'admin' ? 'staff' : 'admin'
    setRoleChanging(user.id)
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
    setRoleChanging(null)
  }

  const filtered = users.filter((u) => {
    const matchName = u.full_name.toLowerCase().includes(search.toLowerCase())
    const matchPuesto = puestoFilter ? u.puesto === puestoFilter : true
    return matchName && matchPuesto
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Usuarios</h1>
        <p className="text-sm text-brand-muted mt-1">Gestiona el personal registrado</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px]"
          />
        </div>
        <select
          value={puestoFilter}
          onChange={(e) => setPuestoFilter(e.target.value)}
          className="px-3 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors duration-200 min-h-[44px] cursor-pointer"
        >
          <option value="">Todos los puestos</option>
          {PUESTOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-muted text-sm">No se encontraron usuarios.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                  {user.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-brand-accent" />
                  ) : (
                    <User className="w-4 h-4 text-brand-muted" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-brand-text">{user.full_name}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 text-xs font-medium rounded',
                        user.role === 'admin'
                          ? 'bg-brand-accent/15 text-brand-accent'
                          : 'bg-brand-card-hover text-brand-muted'
                      )}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-brand-muted">{user.puesto}</span>
                    <span className="text-brand-border text-xs">·</span>
                    <span className="text-xs text-brand-muted">{formatDate(user.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleRole(user)}
                    disabled={roleChanging === user.id}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer min-h-[36px] disabled:opacity-50',
                      user.role === 'admin'
                        ? 'bg-brand-card-hover text-brand-muted hover:text-brand-error hover:bg-brand-error/10'
                        : 'bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10'
                    )}
                  >
                    {roleChanging === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : user.role === 'admin' ? (
                      'Cambiar a staff'
                    ) : (
                      'Cambiar a admin'
                    )}
                  </button>

                  <button
                    onClick={() => toggleExpand(user.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-card-hover text-brand-muted hover:text-brand-text rounded-lg transition-colors duration-200 cursor-pointer min-h-[36px]"
                  >
                    Ver resultados
                    {expandedId === user.id ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Results panel */}
              {expandedId === user.id && (
                <div className="border-t border-brand-border bg-brand-dark px-4 py-3 animate-slide-up">
                  {!user.resultsLoaded ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                      <span className="text-sm text-brand-muted">Cargando resultados...</span>
                    </div>
                  ) : !user.results || user.results.length === 0 ? (
                    <p className="text-sm text-brand-muted py-2">Sin resultados de exámenes.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-brand-muted mb-2">
                        {user.results.length} resultado{user.results.length !== 1 ? 's' : ''}
                      </p>
                      {user.results.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 py-2 border-b border-brand-border last:border-0"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-brand-text">{r.guide_title}</p>
                            <p className="text-xs text-brand-muted">{formatDateTime(r.completed_at)}</p>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-bold',
                              r.passed ? 'text-brand-success' : 'text-brand-error'
                            )}
                          >
                            {r.score}%
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              r.passed
                                ? 'bg-brand-success/10 text-brand-success'
                                : 'bg-brand-error/10 text-brand-error'
                            )}
                          >
                            {r.passed ? 'Aprobado' : 'Reprobado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
