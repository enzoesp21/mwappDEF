/**
 * Lecturas de propinas que comparten las pantallas del admin y las del
 * personal. Consultas sueltas y mapas en código: nada de joins anidados.
 */

import type { createClient } from '@/lib/supabase/server'
import type { Grupo, Pago, PersonaPropina } from '@/lib/propinas'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface DiaResumen {
  fecha: string
  total: number
  general: number
  porHora: number
  personas: number
  pagados: number
}

export interface DiaCompleto {
  fecha: string
  total: number
  general: number
  version: string
  personas: (PersonaPropina & { user_id: string | null })[]
}

export interface MiPropina {
  fecha: string
  horas: number
  grupo: Grupo
  monto: number
  pago: Pago | null
  efectivo: number | null
  porHora: number
}

/**
 * Si la persona puede cargar propinas. '*' y no la columna suelta: antes de
 * correr el SQL, pedir carga_propinas anularía la consulta entera.
 */
export async function puedeCargarPropinas(supabase: Supabase, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data?.role === 'admin' || (data?.carga_propinas === true && data?.status === 'approved')
}

/** Los últimos días cargados, del más nuevo al más viejo. */
export async function listarDias(
  supabase: Supabase,
  limite = 45
): Promise<{ dias: DiaResumen[]; error: string | null }> {
  const { data: dias, error } = await supabase
    .from('tip_days')
    .select('id, fecha, total, general, por_hora')
    .order('fecha', { ascending: false })
    .limit(limite)
  if (error) return { dias: [], error: error.message }

  const ids = (dias ?? []).map((d) => d.id as string)
  const conteo = new Map<string, { personas: number; pagados: number }>()
  if (ids.length > 0) {
    const { data: filas, error: errorFilas } = await supabase
      .from('tip_entries')
      .select('day_id, pago')
      .in('day_id', ids)
    if (errorFilas) return { dias: [], error: errorFilas.message }
    for (const f of filas ?? []) {
      const c = conteo.get(f.day_id as string) ?? { personas: 0, pagados: 0 }
      c.personas++
      if (f.pago) c.pagados++
      conteo.set(f.day_id as string, c)
    }
  }

  return {
    dias: (dias ?? []).map((d) => ({
      fecha: d.fecha as string,
      total: d.total as number,
      general: d.general as number,
      porHora: Number(d.por_hora),
      personas: conteo.get(d.id as string)?.personas ?? 0,
      pagados: conteo.get(d.id as string)?.pagados ?? 0,
    })),
    error: null,
  }
}

export async function cargarDia(
  supabase: Supabase,
  fecha: string
): Promise<{ dia: DiaCompleto | null; error: string | null }> {
  const { data: dia, error } = await supabase
    .from('tip_days')
    .select('id, fecha, total, general, updated_at')
    .eq('fecha', fecha)
    .maybeSingle()
  if (error) return { dia: null, error: error.message }
  if (!dia) return { dia: null, error: null }

  const { data: filas, error: errorFilas } = await supabase
    .from('tip_entries')
    .select('nombre, user_id, grupo, horas, pago, efectivo, orden')
    .eq('day_id', dia.id as string)
    .order('orden', { ascending: true })
  if (errorFilas) return { dia: null, error: errorFilas.message }

  return {
    dia: {
      fecha: dia.fecha as string,
      total: dia.total as number,
      general: dia.general as number,
      // Tal cual viene de la base: pasarla por Date perdería los microsegundos.
      version: dia.updated_at as string,
      personas: (filas ?? []).map((f) => ({
        nombre: f.nombre as string,
        user_id: (f.user_id as string) ?? null,
        grupo: f.grupo as Grupo,
        horas: Number(f.horas),
        pago: (f.pago as Pago) ?? null,
        efectivo: (f.efectivo as number) ?? null,
      })),
    },
    error: null,
  }
}

/**
 * La gente con la que arranca un día nuevo: la del último día cargado, sin
 * horas ni pagos. Si todavía no hay ninguno, los camareros del último horario.
 */
export async function plantillaDiaNuevo(supabase: Supabase): Promise<PersonaPropina[]> {
  const { data: ultimo } = await supabase
    .from('tip_days')
    .select('id')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultimo) {
    const { data: filas } = await supabase
      .from('tip_entries')
      .select('nombre, grupo, orden')
      .eq('day_id', ultimo.id as string)
      .order('orden', { ascending: true })
    if (filas && filas.length > 0) {
      return filas.map((f) => ({
        nombre: f.nombre as string,
        grupo: f.grupo as Grupo,
        horas: 0,
        pago: null,
        efectivo: null,
      }))
    }
  }

  const { data: semana } = await supabase
    .from('schedule_weeks')
    .select('data')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sectores = (semana?.data as { sectores?: { nombre: string; personas: { nombre: string }[] }[] })
    ?.sectores
  const camareros = sectores?.find((s) => /CAMARER|MOZO/i.test(s.nombre))
  return (camareros?.personas ?? [])
    .map((p) => p.nombre.trim())
    .filter(Boolean)
    .map((nombre) => ({ nombre, grupo: 'camarero' as const, horas: 0, pago: null, efectivo: null }))
}

/** Usuarios aprobados, para mostrar quién va a ver lo suyo. */
export async function usuariosParaVincular(
  supabase: Supabase
): Promise<{ id: string; full_name: string }[]> {
  const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'approved')
  return (data ?? []).map((u) => ({ id: u.id as string, full_name: (u.full_name as string) ?? '' }))
}

/** Nombres usados en los últimos días, para sugerir al escribir. */
export async function nombresUsados(supabase: Supabase): Promise<string[]> {
  const { data } = await supabase.from('tip_entries').select('nombre').limit(2000)
  return Array.from(new Set((data ?? []).map((f) => (f.nombre as string).trim()))).sort((a, b) =>
    a.localeCompare(b, 'es')
  )
}

/** Lo de la persona logueada. La base solo le devuelve sus propias filas. */
export async function misPropinas(
  supabase: Supabase,
  userId: string
): Promise<{ propinas: MiPropina[]; error: string | null }> {
  const { data: filas, error } = await supabase
    .from('tip_entries')
    .select('day_id, horas, grupo, monto, pago, efectivo')
    .eq('user_id', userId)
  if (error) return { propinas: [], error: error.message }
  if (!filas || filas.length === 0) return { propinas: [], error: null }

  const ids = Array.from(new Set(filas.map((f) => f.day_id as string)))
  const { data: dias, error: errorDias } = await supabase
    .from('tip_days')
    .select('id, fecha, por_hora')
    .in('id', ids)
  if (errorDias) return { propinas: [], error: errorDias.message }
  const porId = new Map((dias ?? []).map((d) => [d.id as string, d]))

  const propinas = filas
    .filter((f) => porId.has(f.day_id as string))
    .map((f) => {
      const d = porId.get(f.day_id as string)!
      return {
        fecha: d.fecha as string,
        horas: Number(f.horas),
        grupo: f.grupo as Grupo,
        monto: f.monto as number,
        pago: (f.pago as Pago) ?? null,
        efectivo: (f.efectivo as number) ?? null,
        porHora: Number(d.por_hora),
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  return { propinas, error: null }
}
