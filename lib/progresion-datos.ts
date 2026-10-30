/**
 * Lecturas de la progresión de los mozos. Consultas sueltas y mapas en
 * código: nada de joins anidados.
 */

import type { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina } from '@/lib/horarios'
import { calcularProgresion, claveDeGuia, type EstadoProgresion, type FilaNivel, type GuiaClave } from '@/lib/progresion'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface MozoProgresion {
  id: string
  nombre: string
  estado: EstadoProgresion
}

export interface CambioNivel {
  nivel_anterior: number | null
  nivel_nuevo: number
  motivo: string | null
  created_at: string
}

/** Qué guía de los requisitos es cada examen, y cuáles existen. */
async function examenesPorGuia(supabase: Supabase) {
  const [{ data: guias, error: e1 }, { data: examenes, error: e2 }] = await Promise.all([
    supabase.from('guides').select('id, title, is_primary'),
    supabase.from('exams').select('id, guide_id'),
  ])
  if (e1 || e2) throw new Error((e1 ?? e2)!.message)

  const claveDeGuiaId = new Map<string, GuiaClave>()
  for (const g of guias ?? []) {
    const clave = claveDeGuia((g.title as string) ?? '', g.is_primary === true)
    if (clave) claveDeGuiaId.set(g.id as string, clave)
  }
  const claveDeExamen = new Map<string, GuiaClave>()
  for (const e of examenes ?? []) {
    const clave = claveDeGuiaId.get(e.guide_id as string)
    if (clave) claveDeExamen.set(e.id as string, clave)
  }
  // Solo cuentan las guías que tienen examen: sin examen no hay cómo aprobar.
  return { claveDeExamen, existentes: new Set(claveDeExamen.values()) }
}

async function aprobadasPorUsuario(
  supabase: Supabase,
  ids: string[],
  claveDeExamen: Map<string, GuiaClave>
): Promise<Map<string, Set<GuiaClave>>> {
  const porUsuario = new Map<string, Set<GuiaClave>>()
  if (ids.length === 0) return porUsuario
  const { data, error } = await supabase
    .from('exam_results')
    .select('user_id, exam_id')
    .eq('passed', true)
    .in('user_id', ids)
  if (error) throw new Error(error.message)
  for (const r of data ?? []) {
    const clave = claveDeExamen.get(r.exam_id as string)
    if (!clave) continue
    const set = porUsuario.get(r.user_id as string) ?? new Set<GuiaClave>()
    set.add(clave)
    porUsuario.set(r.user_id as string, set)
  }
  return porUsuario
}

function aFila(r: Record<string, unknown> | undefined): FilaNivel | null {
  if (!r) return null
  return {
    nivel: r.nivel as number,
    desde: r.desde as string,
    requisitos: (r.requisitos as FilaNivel['requisitos']) ?? {},
    revisado_at: (r.revisado_at as string) ?? null,
  }
}

/** Todos los mozos con usuario (sin los admin), con su progresión. */
export async function listarMozos(supabase: Supabase): Promise<{ mozos: MozoProgresion[]; error: string | null }> {
  try {
    const { data: perfiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, puesto')
      .eq('puesto', 'Mozos')
      .eq('status', 'approved')
      .neq('role', 'admin')
      .order('full_name')
    if (error) throw new Error(error.message)
    const ids = (perfiles ?? []).map((p) => p.id as string)

    const [{ data: filas, error: errorFilas }, guias] = await Promise.all([
      ids.length ? supabase.from('mozo_niveles').select('*').in('user_id', ids) : Promise.resolve({ data: [], error: null }),
      examenesPorGuia(supabase),
    ])
    if (errorFilas) throw new Error(errorFilas.message)
    const aprobadas = await aprobadasPorUsuario(supabase, ids, guias.claveDeExamen)
    const filaDe = new Map((filas ?? []).map((f) => [f.user_id as string, f as Record<string, unknown>]))
    const hoy = hoyEnArgentina()

    return {
      mozos: (perfiles ?? []).map((p) => ({
        id: p.id as string,
        nombre: ((p.full_name as string) ?? '').trim(),
        estado: calcularProgresion(
          aFila(filaDe.get(p.id as string)),
          aprobadas.get(p.id as string) ?? new Set(),
          guias.existentes,
          hoy
        ),
      })),
      error: null,
    }
  } catch (e) {
    return { mozos: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/** La progresión de una persona, con su historial de cambios. */
export async function cargarProgresion(
  supabase: Supabase,
  userId: string
): Promise<{ nombre: string; puesto: string; estado: EstadoProgresion | null; historial: CambioNivel[]; error: string | null }> {
  try {
    const [{ data: perfil, error: e1 }, { data: fila, error: e2 }, { data: historial, error: e3 }, guias] =
      await Promise.all([
        supabase.from('profiles').select('full_name, puesto').eq('id', userId).maybeSingle(),
        supabase.from('mozo_niveles').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('mozo_niveles_historial')
          .select('nivel_anterior, nivel_nuevo, motivo, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        examenesPorGuia(supabase),
      ])
    const error = e1 ?? e2 ?? e3
    if (error) throw new Error(error.message)
    const aprobadas = await aprobadasPorUsuario(supabase, [userId], guias.claveDeExamen)
    return {
      nombre: ((perfil?.full_name as string) ?? '').trim(),
      puesto: (perfil?.puesto as string) ?? '',
      estado: calcularProgresion(
        aFila(fila ?? undefined),
        aprobadas.get(userId) ?? new Set(),
        guias.existentes,
        hoyEnArgentina()
      ),
      historial: (historial ?? []) as CambioNivel[],
      error: null,
    }
  } catch (e) {
    return { nombre: '', puesto: '', estado: null, historial: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/** El nivel de cada mozo, para que la calculadora de propinas ponga el grupo. */
export async function nivelesPorUsuario(supabase: Supabase): Promise<Record<string, number>> {
  const { data } = await supabase.from('mozo_niveles').select('user_id, nivel')
  return Object.fromEntries((data ?? []).map((f) => [f.user_id as string, f.nivel as number]))
}
