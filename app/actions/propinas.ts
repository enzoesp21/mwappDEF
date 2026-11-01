'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  calcularReparto,
  validarCarga,
  vincularUsuario,
  type PersonaPropina,
} from '@/lib/propinas'

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

export interface HorasDelRelojDia {
  nombre: string
  profileId: string | null
  nombresHorario: string[]
  horas: number
}

/**
 * "Traer horas del reloj": las horas de ese día según la planilla maestra,
 * para completar la lista de propinas sin copiarlas a mano. Pueden usarlo los
 * admin y quien carga propinas (la función de la base se fija).
 */
export async function horasDelRelojAction(fecha: string): Promise<Resultado<HorasDelRelojDia[]>> {
  const { supabase, session } = await requireCargador()
  if (!session) return { ok: false, error: 'No tenés permiso para cargar propinas.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Elegí la fecha del día.' }
  const { data, error } = await supabase.rpc('horas_para_propinas', { p_fecha: fecha })
  if (error) {
    if (/horas_para_propinas|schema cache/i.test(error.message)) {
      return { ok: false, error: 'Falta correr el SQL de propinas y reloj (supabase/add_planilla_propinas.sql) en Supabase.' }
    }
    return { ok: false, error: error.message }
  }
  return {
    ok: true,
    value: ((data ?? []) as { nombre: string; profile_id: string | null; nombres_horario: string[] | null; horas: number }[]).map(
      (r) => ({ nombre: r.nombre, profileId: r.profile_id, nombresHorario: r.nombres_horario ?? [], horas: Number(r.horas) })
    ),
  }
}
