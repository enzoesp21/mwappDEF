'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, ShieldCheck, User, Loader2, UserPlus, Check, X, AlertCircle, UserMinus, Trash2, RotateCcw, Pencil, Wand2, GraduationCap, Sprout, Banknote, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PUESTOS } from '@/lib/types'
import type { Profile, ExamResult } from '@/lib/types'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { setUserStatusAction, deleteUserAction, updateUserNameAction, setUserExperienceAction, setCargaPropinasAction, setUserPuestoAction } from '@/app/actions/users'
import { formatearNombre, necesitaFormato } from '@/lib/nombres'
import { buscarPuesto } from '@/lib/puestos'
import CambiarClaveUsuario from '@/components/admin/CambiarClaveUsuario'

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
  const [statusChanging, setStatusChanging] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserWithResults | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  // Edición del nombre: qué fila está abierta y qué se escribió.
  const [editandoNombre, setEditandoNombre] = useState<string | null>(null)
  const [borradorNombre, setBorradorNombre] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [errorNombre, setErrorNombre] = useState<string | null>(null)

  function abrirEdicion(user: UserWithResults) {
    setEditandoNombre(user.id)
    setBorradorNombre(user.full_name)
    setErrorNombre(null)
  }

  function cerrarEdicion() {
    setEditandoNombre(null)
    setBorradorNombre('')
    setErrorNombre(null)
  }

  async function guardarNombre(userId: string) {
    const limpio = borradorNombre.replace(/\s+/g, ' ').trim()
    if (limpio.length < 2) {
      setErrorNombre('El nombre es demasiado corto.')
      return
    }
    setGuardandoNombre(true)
    setErrorNombre(null)
    const res = await updateUserNameAction(userId, limpio)
    setGuardandoNombre(false)
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, full_name: limpio } : u))
      )
      cerrarEdicion()
    } else {
      setErrorNombre(res.error)
    }
  }

  const [cambiandoNivel, setCambiandoNivel] = useState<string | null>(null)

  async function cambiarNivel(user: UserWithResults) {
    const destino = user.experience === 'nuevo' ? 'experimentado' : 'nuevo'
    setCambiandoNivel(user.id)
    setStatusError(null)
    const res = await setUserExperienceAction(user.id, destino)
    setCambiandoNivel(null)
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, experience: destino } : u))
      )
    } else {
      setStatusError(res.error)
    }
  }

  // A quién se le está cambiando la contraseña (abre la ventana).
  const [claveDe, setClaveDe] = useState<UserWithResults | null>(null)

  const [cambiandoPuesto, setCambiandoPuesto] = useState<string | null>(null)

  async function cambiarPuesto(user: UserWithResults, puesto: string) {
    if (puesto === user.puesto) return
    const nombre = buscarPuesto(puesto)?.nombre ?? puesto
    if (!confirm(`¿Pasar a ${user.full_name} a ${nombre}? Va a ver las guías de ese puesto.`)) return
    setCambiandoPuesto(user.id)
    setStatusError(null)
    const res = await setUserPuestoAction(user.id, puesto)
    setCambiandoPuesto(null)
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, puesto } : u)))
    } else {
      setStatusError(res.error)
    }
  }

  const [cambiandoPropinas, setCambiandoPropinas] = useState<string | null>(null)

  async function cambiarPropinas(user: UserWithResults) {
    const destino = !user.carga_propinas
    setCambiandoPropinas(user.id)
    setStatusError(null)
    const res = await setCargaPropinasAction(user.id, destino)
    setCambiandoPropinas(null)
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, carga_propinas: destino } : u))
      )
    } else {
      setStatusError(res.error)
    }
  }

  async function loadResults(userId: string) {
    const { data: results } = await supabase
      .from('exam_results')
      .select('id, user_id, score, passed, completed_at, exam_id, signature_data')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    const rows = results ?? []
    const examIds = rows
      .map((r) => r.exam_id as string)
      .filter((id, i, a) => Boolean(id) && a.indexOf(id) === i)

    const titles: Record<string, string> = {}
    if (examIds.length > 0) {
      const { data: exams } = await supabase
        .from('exams')
        .select('id, title, guide_id')
        .in('id', examIds)

      const guideIds = (exams ?? [])
        .map((e) => e.guide_id as string)
        .filter((id, i, a) => Boolean(id) && a.indexOf(id) === i)

      const guideTitles: Record<string, string> = {}
      if (guideIds.length > 0) {
        const { data: guides } = await supabase.from('guides').select('id, title').in('id', guideIds)
        for (const g of guides ?? []) guideTitles[g.id] = g.title
      }

      for (const e of exams ?? []) {
        titles[e.id] = guideTitles[e.guide_id as string] ?? e.title ?? '—'
      }
    }

    const mapped = rows.map((r) => ({ ...r, guide_title: titles[r.exam_id as string] ?? '—' }))

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

  async function decide(userId: string, status: 'approved' | 'rejected') {
    setStatusChanging(userId)
    setStatusError(null)
    const result = await setUserStatusAction(userId, status)
    setStatusChanging(null)
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)))
    } else {
      setStatusError(result.error)
    }
  }

  async function deactivate(userId: string, status: 'inactive' | 'approved') {
    setStatusChanging(userId)
    setStatusError(null)
    const result = await setUserStatusAction(userId, status)
    setStatusChanging(null)
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)))
    } else {
      setStatusError(result.error)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setStatusError(null)
    const result = await deleteUserAction(deleteTarget.id)
    setDeleting(false)
    if (result.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirm('')
    } else {
      setStatusError(result.error)
      setDeleteTarget(null)
      setDeleteConfirm('')
    }
  }

  const pending = users.filter((u) => u.status === 'pending')

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

      {/* Solicitudes pendientes */}
      {pending.length > 0 && (
        <div className="bg-brand-card border-2 border-brand-error/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand-error" />
            <h2 className="text-sm font-semibold text-brand-text">
              {pending.length} {pending.length === 1 ? 'persona espera' : 'personas esperan'} aprobación
            </h2>
          </div>
          <p className="text-xs text-brand-muted">
            Cualquiera con el link puede registrarse. Aprobá solo a quien trabaje acá.
          </p>

          {statusError && (
            <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{statusError}</span>
            </div>
          )}

          <div className="divide-y divide-brand-border">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-text truncate">{u.full_name}</p>
                  <p className="text-xs text-brand-muted">
                    {u.puesto} · se registró {formatDate(u.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => decide(u.id, 'rejected')}
                    disabled={statusChanging === u.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-card-hover text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-h-[36px] disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => decide(u.id, 'approved')}
                    disabled={statusChanging === u.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[36px] disabled:opacity-50"
                  >
                    {statusChanging === u.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {statusError && pending.length === 0 && (
        <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{statusError}</span>
        </div>
      )}

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
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                  {user.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-brand-accent" />
                  ) : (
                    <User className="w-4 h-4 text-brand-muted" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {editandoNombre === user.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={borradorNombre}
                        onChange={(e) => setBorradorNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') guardarNombre(user.id)
                          if (e.key === 'Escape') cerrarEdicion()
                        }}
                        autoFocus
                        aria-label="Nombre de la persona"
                        className="w-full px-3 py-2 text-sm bg-brand-dark/40 border border-brand-accent rounded-lg text-brand-text focus:outline-none"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => guardarNombre(user.id)}
                          disabled={guardandoNombre}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[36px] disabled:opacity-50"
                        >
                          {guardandoNombre ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Guardar
                        </button>
                        {necesitaFormato(borradorNombre) && (
                          <button
                            type="button"
                            onClick={() => setBorradorNombre(formatearNombre(borradorNombre))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-card-hover text-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer min-h-[36px]"
                            title={'Quedaría: ' + formatearNombre(borradorNombre)}
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Acomodar mayúsculas
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={cerrarEdicion}
                          disabled={guardandoNombre}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-brand-muted hover:bg-brand-card-hover transition-colors cursor-pointer min-h-[36px] disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                      {errorNombre && (
                        <p className="flex items-start gap-1.5 text-xs text-brand-error">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          {errorNombre}
                        </p>
                      )}
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-brand-text">{user.full_name}</span>
                    <button
                      type="button"
                      onClick={() => abrirEdicion(user)}
                      aria-label={'Corregir el nombre de ' + user.full_name}
                      title="Corregir el nombre"
                      className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {necesitaFormato(user.full_name) && (
                      <span
                        className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700"
                        title={'Quedaría mejor como: ' + formatearNombre(user.full_name)}
                      >
                        revisar
                      </span>
                    )}
                    {user.experience === 'nuevo' && (
                      <span
                        className="px-1.5 py-0.5 text-xs font-medium rounded bg-brand-accent/15 text-brand-accent"
                        title="Solo ve las guías de su puesto"
                      >
                        en prueba
                      </span>
                    )}
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
                    {user.status !== 'approved' && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs font-medium rounded',
                          user.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-brand-error/10 text-brand-error'
                        )}
                      >
                        {user.status === 'pending'
                          ? 'pendiente'
                          : user.status === 'inactive'
                            ? 'dado de baja'
                            : 'rechazado'}
                      </span>
                    )}
                  </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <label className="relative flex items-center flex-shrink-0" title="Cambiar el puesto">
                      <span className="sr-only">Puesto de {user.full_name}</span>
                      <select
                        value={user.puesto}
                        onChange={(e) => cambiarPuesto(user, e.target.value)}
                        disabled={cambiandoPuesto === user.id}
                        className="appearance-none max-w-[11rem] truncate pl-1.5 pr-5 py-0.5 -ml-1.5 rounded text-xs text-brand-muted bg-transparent hover:bg-brand-accent/10 hover:text-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer disabled:opacity-50"
                      >
                        {!(PUESTOS as readonly string[]).includes(user.puesto) && (
                          <option value={user.puesto}>{user.puesto || 'Sin puesto'}</option>
                        )}
                        {PUESTOS.map((p) => (
                          <option key={p} value={p}>
                            {buscarPuesto(p)?.nombre ?? p}
                          </option>
                        ))}
                      </select>
                      {cambiandoPuesto === user.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-brand-muted absolute right-1 pointer-events-none" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-brand-muted absolute right-1 pointer-events-none" />
                      )}
                    </label>
                    <span className="text-brand-border text-xs">·</span>
                    <span className="text-xs text-brand-muted truncate min-w-0">{formatDate(user.created_at)}</span>
                  </div>
                </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:flex-shrink-0">
                  <button
                    onClick={() => setClaveDe(user)}
                    title="Ponerle una contraseña nueva si se olvidó la suya"
                    aria-label={'Cambiar la contraseña de ' + user.full_name}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer min-h-[36px] whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Clave
                  </button>
                  {/* Los admin cargan propinas siempre: el permiso es para cajeros. */}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => cambiarPropinas(user)}
                      disabled={cambiandoPropinas === user.id}
                      aria-pressed={Boolean(user.carga_propinas)}
                      title={
                        user.carga_propinas
                          ? 'Carga las propinas del salón. Tocá para sacarle el permiso.'
                          : 'Darle permiso para cargar las propinas del salón (cajeros).'
                      }
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[36px] whitespace-nowrap disabled:opacity-50',
                        user.carga_propinas
                          ? 'bg-brand-accent text-white hover:bg-brand-accent-hover'
                          : 'bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10'
                      )}
                    >
                      {cambiandoPropinas === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : (
                        <>
                          <Banknote className="w-3.5 h-3.5" />
                          {user.carga_propinas ? 'Carga propinas' : 'Propinas'}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => cambiarNivel(user)}
                    disabled={cambiandoNivel === user.id}
                    title={
                      user.experience === 'nuevo'
                        ? 'Pasarlo al equipo: va a ver las guías de todos los puestos'
                        : 'Ponerlo en prueba: solo va a ver las guías de su puesto'
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer min-h-[36px] whitespace-nowrap disabled:opacity-50"
                  >
                    {cambiandoNivel === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : user.experience === 'nuevo' ? (
                      <>
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Pasar al equipo</span>
                        <span className="sm:hidden">Al equipo</span>
                      </>
                    ) : (
                      <>
                        <Sprout className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Poner en prueba</span>
                        <span className="sm:hidden">En prueba</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRole(user)}
                    disabled={roleChanging === user.id}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer min-h-[36px] disabled:opacity-50',
                      'whitespace-nowrap',
                      user.role === 'admin'
                        ? 'bg-brand-card-hover text-brand-muted hover:text-brand-error hover:bg-brand-error/10'
                        : 'bg-brand-card-hover text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10'
                    )}
                  >
                    {roleChanging === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : (
                      <>
                        <span className="hidden sm:inline">
                          {user.role === 'admin' ? 'Cambiar a staff' : 'Cambiar a admin'}
                        </span>
                        <span className="sm:hidden">
                          {user.role === 'admin' ? 'A staff' : 'A admin'}
                        </span>
                      </>
                    )}
                  </button>

                  {user.status === 'inactive' ? (
                    <button
                      onClick={() => deactivate(user.id, 'approved')}
                      disabled={statusChanging === user.id}
                      title="Reactivar"
                      className="p-2 rounded-lg text-brand-muted hover:text-brand-success hover:bg-brand-success/10 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
                    >
                      {statusChanging === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    user.status === 'approved' && (
                      <button
                        onClick={() => deactivate(user.id, 'inactive')}
                        disabled={statusChanging === user.id}
                        title="Dar de baja"
                        className="p-2 rounded-lg text-brand-muted hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
                      >
                        {statusChanging === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => {
                      setDeleteTarget(user)
                      setDeleteConfirm('')
                      setStatusError(null)
                    }}
                    title="Borrar del todo"
                    className="p-2 rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleExpand(user.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-card-hover text-brand-muted hover:text-brand-text rounded-lg transition-colors duration-200 cursor-pointer min-h-[36px] whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Ver resultados</span>
                    <span className="sm:hidden">Resultados</span>
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-brand-text truncate">{r.guide_title}</p>
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

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-brand-card border border-brand-error/40 rounded-xl p-5 max-w-md w-full space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-error/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-brand-error" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-brand-text">Borrar del todo</h2>
                <p className="text-xs text-brand-muted mt-0.5">{deleteTarget.full_name}</p>
              </div>
            </div>

            <p className="text-sm text-brand-text leading-relaxed">
              Se elimina la cuenta y con ella <strong>todo su historial</strong>: exámenes
              rendidos, firmas e inscripciones de comida. Esto no se puede deshacer.
            </p>

            <p className="text-xs text-brand-muted">
              Si la persona simplemente dejó de trabajar, conviene darla de baja en vez de
              borrarla: pierde el acceso pero se conservan sus registros.
            </p>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1.5">
                Escribí <span className="text-brand-text font-semibold">{deleteTarget.full_name}</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-error focus:border-transparent transition-colors min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-card-hover text-brand-muted hover:text-brand-text transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteConfirm.trim() !== deleteTarget.full_name.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-semibold bg-brand-error text-white hover:opacity-90 transition-opacity cursor-pointer min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {claveDe && (
        <CambiarClaveUsuario
          userId={claveDe.id}
          nombre={claveDe.full_name}
          onCerrar={() => setClaveDe(null)}
        />
      )}
    </div>
  )
}
