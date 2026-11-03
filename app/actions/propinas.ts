'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcularReparto, validarCarga, vincularUsuario, type PersonaPropina } from '@/lib/propinas'
import { esGrupoGuardado, type GrupoGuardado } from '@/lib/propinas-grupos'
import { leerDatosReloj, type DatosRelojPropinas } from '@/lib/propinas-reloj'

/** El grupo al 25 % y "no es mozo" necesitan add_propina_25.sql: antes, la base los rechaza. */
const FALTA_SQL_25 = 'Falta correr el SQL nuevo de propinas (supabase/add_propina_25.sql) en Supabase.'
const faltaSql25 = (mensaje: string) => /tip_entries_grupo_check|propina_grupos_grupo_check/i.test(mensaje)

type Resultado<T = undefined> = { ok: true; value?: T } | { ok: false; error: string }

/** Deja pasar a los admin y a quien tenga tildado "Carga propinas". */
async function requireCargador() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }

  // '*' y no la columna suelta: si todavía no se corrió el SQL, pedir
  // carga_propinas haría fallar la consulta entera.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const puede =
    profile?.role === 'admin' || (profile?.carga_propinas === true && profile?.status === 'approved')
  return { supabase, session: puede ? session : null }
}

/** Solo los admin (encargados). */
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

function revalidarTodo(fecha?: string) {
  for (const base of ['/admin/propinas', '/dashboard/propinas']) {
    revalidatePath(base)
    if (fecha) revalidatePath(base + '/' + fecha)
  }
  revalidatePath('/dashboard')
}

export interface CargaPropinas {
  fecha: string
  total: number
  general: number
  personas: PersonaPropina[]
}

/**
 * Guarda un día entero. `version` es el updated_at que se leyó al abrirlo,
 * tal cual vino de la base (null si el día es nuevo). Devuelve la versión
 * nueva para seguir editando sin recargar.
 */
export async function guardarPropinasAction(
  carga: CargaPropinas,
  version: string | null
): Promise<Resultado<string>> {
  const { supabase, session } = await requireCargador()
  if (!session) return { ok: false, error: 'No tenés permiso para cargar propinas.' }

  const personas = carga.personas
    .map((p) => ({ ...p, nombre: p.nombre.replace(/\s+/g, ' ').trim() }))
    .filter((p) => p.horas > 0)

  const error = validarCarga(carga.fecha, carga.total, carga.general, personas)
  if (error) return { ok: false, error }

  // Para vincular cada nombre con su usuario y que esa persona vea lo suyo.
  const { data: usuarios, error: errorUsuarios } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'approved')
  if (errorUsuarios) {
    return { ok: false, error: 'No se pudo leer la lista de usuarios: ' + errorUsuarios.message }
  }

  const { porHora, montos } = calcularReparto(carga.total, carga.general, personas)

  const filas = personas.map((p, i) => ({
    nombre: p.nombre,
    user_id: vincularUsuario(p.nombre, (usuarios ?? []) as { id: string; full_name: string }[]),
    grupo: p.grupo,
    horas: p.horas,
    monto: montos[i],
    pago: p.pago,
    efectivo: p.pago === 'tr_ef' ? p.efectivo : null,
  }))

  const { data: nuevaVersion, error: errorGuardar } = await supabase.rpc('guardar_propinas', {
    p_fecha: carga.fecha,
    p_total: carga.total,
    p_general: carga.general,
    p_por_hora: Math.round(porHora * 100) / 100,
    p_personas: filas,
    p_version: version,
  })
  if (errorGuardar) {
    if (faltaSql25(errorGuardar.message)) return { ok: false, error: FALTA_SQL_25 }
    const falta = /guardar_propinas|schema cache/i.test(errorGuardar.message)
    return {
      ok: false,
      error: falta
        ? 'Falta correr el SQL de propinas (supabase/add_propinas.sql) en Supabase.'
        : errorGuardar.message,
    }
  }

  revalidarTodo(carga.fecha)
  return { ok: true, value: nuevaVersion as string }
}

export async function borrarDiaPropinasAction(fecha: string): Promise<Resultado> {
  const { supabase, session } = await requireCargador()
  if (!session) return { ok: false, error: 'No tenés permiso para borrar propinas.' }

  const { data, error } = await supabase.from('tip_days').delete().eq('fecha', fecha).select('id')
  if (error) return { ok: false, error: 'No se pudo borrar: ' + error.message }
  // Sin error pero sin filas: RLS no lo dejó borrar o ya no existía.
  if (!data || data.length === 0) return { ok: false, error: 'No se borró: ese día ya no existe.' }

  revalidarTodo(fecha)
  return { ok: true }
}

const FALTA_SQL_GRUPOS = 'Falta correr el SQL de grupos de propina (supabase/add_propina_grupos.sql) en Supabase.'

/**
 * El porcentaje de uno o varios empleados de la planilla (al 100, 75, 50 o
 * 25 %), o 'afuera': no es mozo. Solo un encargado. Las cajeras lo ven en el
 * editor: cada uno cae solo en su sección, y el reloj no suma a los que no
 * son mozos.
 */
export async function guardarGrupoPropinaAction(empleadoIds: string[], grupo: GrupoGuardado): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'Solo un encargado puede cambiar el porcentaje.' }
  const ids = Array.from(new Set(empleadoIds))
  if (ids.length === 0 || ids.length > 300 || !ids.every((id) => /^[0-9a-f-]{36}$/i.test(id))) {
    return { ok: false, error: 'No se encontró a esa persona.' }
  }
  if (!esGrupoGuardado(grupo)) return { ok: false, error: 'Ese porcentaje no existe.' }
  const falta = (m: string) => /propina_grupos/i.test(m) && /does not exist|schema cache|could not find/i.test(m)

  const ahora = new Date().toISOString()
  const { data, error } = await supabase
    .from('propina_grupos')
    .upsert(
      ids.map((id) => ({ empleado_id: id, grupo, updated_by: session.user.id, updated_at: ahora })),
      { onConflict: 'empleado_id' }
    )
    .select('empleado_id')
  if (error) {
    if (faltaSql25(error.message)) return { ok: false, error: FALTA_SQL_25 }
    return { ok: false, error: falta(error.message) ? FALTA_SQL_GRUPOS : error.message }
  }
  // Sin error pero sin todas las filas: la base no dejó guardar alguna.
  if (!data || data.length !== ids.length) return { ok: false, error: 'No se guardó: recargá la página y probá de nuevo.' }
  revalidatePath('/admin/propinas/grupos')
  return { ok: true }
}

/**
 * "Traer horas del reloj": quién trabajó ese día según la planilla maestra
 * (con sus horas, o incompleto) y en qué sector de Horarios figura, para que
 * la lista de propinas sume sola a los mozos. Pueden usarlo los admin y quien
 * carga propinas (la función de la base se fija).
 */
export async function relojParaPropinasAction(fecha: string): Promise<Resultado<DatosRelojPropinas>> {
  const { supabase, session } = await requireCargador()
  if (!session) return { ok: false, error: 'No tenés permiso para cargar propinas.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Elegí la fecha del día.' }
  const { data, error } = await supabase.rpc('reloj_para_propinas', { p_fecha: fecha })
  if (error) {
    if (/reloj_para_propinas|schema cache/i.test(error.message)) {
      return { ok: false, error: 'Falta correr el SQL nuevo de propinas (supabase/add_propinas_mozos_reloj.sql) en Supabase.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, value: leerDatosReloj(data) }
}
