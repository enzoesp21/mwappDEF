'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ubicarEnJornada } from '@/lib/planilla'
import { recalcularPlanilla } from '@/lib/planilla-proceso'
import { moverMes } from '@/lib/planilla-vista'

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }
type Cliente = Awaited<ReturnType<typeof createClient>>

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

const SIN_PERMISO: Resultado = { ok: false, error: 'No tenés permiso para hacer esto.' }

/** Mayúsculas y un solo espacio, como en la planilla de Excel. */
function limpiar(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toUpperCase()
}

function traducir(error: { message: string; code?: string }): string {
  if (error.code === '23505' || /duplicate key/i.test(error.message)) return 'Ya hay un empleado con ese nombre en la planilla.'
  return error.message
}

/**
 * Recalcula los meses abiertos (el de hoy y el anterior si sigue abierto),
 * para que un cambio de asociación o de nombre en Horarios se vea enseguida.
 * Devuelve un texto para sumar al mensaje si algo falló.
 */
async function recalcularAbiertos(supabase: Cliente): Promise<string> {
  const ahora = Date.now()
  const hoy = ubicarEnJornada(ahora, false).fecha
  const anterior = `${moverMes(hoy.slice(0, 7), -1)}-01`
  const { data } = await supabase.from('planilla_meses').select('estado').eq('periodo', anterior).maybeSingle()
  const desde = data?.estado === 'abierto' ? anterior : `${hoy.slice(0, 7)}-01`
  const r = await recalcularPlanilla(supabase, { clave: null, desde, hasta: hoy, ahora })
  return r.ok ? '' : ` Ojo: no se pudo recalcular la planilla (${r.error}).`
}

function revalidar() {
  revalidatePath('/admin/fichadas', 'layout')
}

/** Empleado nuevo: siempre al final de la hoja, nunca en orden alfabético. */
export async function agregarEmpleadoAction(nombre: string, cargo: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const limpio = limpiar(nombre)
  if (limpio.length < 2) return { ok: false, error: 'Escribí el nombre como va en la planilla.' }

  const { data: ultimo, error: errorOrden } = await supabase
    .from('planilla_empleados')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errorOrden) return { ok: false, error: errorOrden.message }

  const { error } = await supabase
    .from('planilla_empleados')
    .insert({ nombre: limpio, cargo: limpiar(cargo) || null, orden: (ultimo?.orden ?? 0) + 1 })
  if (error) return { ok: false, error: traducir(error) }
  const aviso = await recalcularAbiertos(supabase)
  revalidar()
  return { ok: true, mensaje: `${limpio} quedó al final de la planilla.${aviso}` }
}

export interface DatosEmpleado {
  nombre: string
  cargo: string
  activo: boolean
  jornada_calendario: boolean
  profile_id: string | null
  nombres_horario: string[]
}

/** Nombre, cargo, baja, día calendario, usuario de la app y nombres en Horarios. */
export async function guardarEmpleadoAction(id: string, d: DatosEmpleado): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const nombre = limpiar(d.nombre)
  if (nombre.length < 2) return { ok: false, error: 'El nombre no puede quedar vacío.' }
  const horario = Array.from(new Set(d.nombres_horario.map((n) => n.trim().replace(/\s+/g, ' ')).filter(Boolean))).slice(0, 6)

  const { data: antes, error: errorAntes } = await supabase
    .from('planilla_empleados')
    .select('jornada_calendario, nombres_horario')
    .eq('id', id)
    .single()
  if (errorAntes) return { ok: false, error: errorAntes.message }

  const { data, error } = await supabase
    .from('planilla_empleados')
    .update({
      nombre,
      cargo: limpiar(d.cargo) || null,
      activo: d.activo,
      jornada_calendario: d.jornada_calendario,
      profile_id: d.profile_id || null,
      nombres_horario: horario,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: traducir(error) }
  if (!data || data.length === 0) return { ok: false, error: 'No se encontró ese empleado: recargá la página.' }

  // El día calendario y los nombres en Horarios cambian la cuenta: se recalcula.
  const cambiaCuenta =
    antes.jornada_calendario !== d.jornada_calendario ||
    JSON.stringify([...(antes.nombres_horario ?? [])].sort()) !== JSON.stringify([...horario].sort())
  const aviso = cambiaCuenta ? await recalcularAbiertos(supabase) : ''
  revalidar()
  return { ok: true, mensaje: `Guardado${cambiaCuenta && !aviso ? ' y planilla recalculada' : ''}.${aviso}` }
}

/** Nuevo orden de la hoja (todos los empleados, en el orden en que quedaron). */
export async function reordenarEmpleadosAction(ids: string[]): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const { data: todos, error } = await supabase.from('planilla_empleados').select('id, orden')
  if (error) return { ok: false, error: error.message }
  const actuales = new Map((todos ?? []).map((e) => [e.id as string, e.orden as number]))
  if (ids.length !== actuales.size || ids.some((id) => !actuales.has(id)) || new Set(ids).size !== ids.length) {
    return { ok: false, error: 'La lista cambió mientras tanto: recargá la página y volvé a ordenar.' }
  }
  const cambios = ids.map((id, i) => ({ id, orden: i + 1 })).filter((c) => actuales.get(c.id) !== c.orden)
  const resultados = await Promise.all(
    cambios.map((c) => supabase.from('planilla_empleados').update({ orden: c.orden }).eq('id', c.id).select('id'))
  )
  const fallo = resultados.find((r) => r.error || !r.data || r.data.length === 0)
  revalidar()
  if (fallo) return { ok: false, error: `No se pudo guardar todo el orden${fallo.error ? `: ${fallo.error.message}` : ''}. Recargá y revisalo.` }
  return { ok: true, mensaje: 'Orden guardado.' }
}

/** Este número del reloj es de este empleado. */
export async function asociarRelojAction(userid: string, empleadoId: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const { data, error } = await supabase
    .from('planilla_reloj_alias')
    .upsert({ userid, empleado_id: empleadoId, ignorar: false }, { onConflict: 'userid' })
    .select('userid')
  if (error) return { ok: false, error: error.message }
  if (!data || data.length === 0) return { ok: false, error: 'No se pudo asociar.' }
  const aviso = await recalcularAbiertos(supabase)
  revalidar()
  return { ok: true, mensaje: `Listo: el ${userid} del reloj quedó asociado.${aviso}` }
}

/** No está en la planilla todavía: se agrega al final con este nombre y se le asocia el número. */
export async function nuevoDesdeRelojAction(userid: string, nombre: string, cargo: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const limpio = limpiar(nombre)
  if (limpio.length < 2) return { ok: false, error: 'Escribí el nombre como va en la planilla.' }

  const { data: ultimo, error: errorOrden } = await supabase
    .from('planilla_empleados')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errorOrden) return { ok: false, error: errorOrden.message }

  const { data: nuevo, error } = await supabase
    .from('planilla_empleados')
    .insert({ nombre: limpio, cargo: limpiar(cargo) || null, orden: (ultimo?.orden ?? 0) + 1 })
    .select('id')
    .single()
  if (error) return { ok: false, error: traducir(error) }

  const { error: errorAlias } = await supabase
    .from('planilla_reloj_alias')
    .upsert({ userid, empleado_id: nuevo.id, ignorar: false }, { onConflict: 'userid' })
  if (errorAlias) {
    revalidar()
    return { ok: false, error: `${limpio} se agregó, pero no se le pudo asociar el ${userid}: ${errorAlias.message}` }
  }
  const aviso = await recalcularAbiertos(supabase)
  revalidar()
  return { ok: true, mensaje: `${limpio} quedó al final de la planilla con el ${userid} del reloj.${aviso}` }
}

/** No es empleado de la planilla (o ya es baja): sus fichadas no cuentan para nadie. */
export async function ignorarRelojAction(userid: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const { error } = await supabase
    .from('planilla_reloj_alias')
    .upsert({ userid, empleado_id: null, ignorar: true }, { onConflict: 'userid' })
  if (error) return { ok: false, error: error.message }
  const aviso = await recalcularAbiertos(supabase)
  revalidar()
  return { ok: true, mensaje: `El ${userid} del reloj queda ignorado.${aviso}` }
}

/** Deshacer: el número vuelve a "sin asociar" y sus horas salen de la planilla. */
export async function desasociarRelojAction(userid: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const { data, error } = await supabase.from('planilla_reloj_alias').delete().eq('userid', userid).select('userid')
  if (error) return { ok: false, error: error.message }
  if (!data || data.length === 0) return { ok: false, error: 'Ese número ya no estaba asociado.' }
  const aviso = await recalcularAbiertos(supabase)
  revalidar()
  return { ok: true, mensaje: `El ${userid} del reloj volvió a "sin asociar".${aviso}` }
}

/**
 * Propina del resto del personal: fijar a mano en qué parte va alguien
 * ('salon', 'cocina' o 'afuera'), o volver a lo automático (null: por su
 * sector de Horarios o su cargo).
 */
export async function guardarGrupoGeneralAction(
  empleadoId: string,
  grupo: 'salon' | 'cocina' | 'afuera' | null
): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  if (!/^[0-9a-f-]{36}$/i.test(empleadoId)) return { ok: false, error: 'No se encontró a esa persona.' }
  if (grupo !== null && !['salon', 'cocina', 'afuera'].includes(grupo)) return { ok: false, error: 'Esa parte no existe.' }
  const { data, error } = await supabase
    .from('planilla_empleados')
    .update({ grupo_propina_general: grupo })
    .eq('id', empleadoId)
    .select('id')
  if (error) {
    const falta = /grupo_propina_general/i.test(error.message) && /column|schema cache|does not exist|could not find/i.test(error.message)
    return {
      ok: false,
      error: falta
        ? 'Falta correr el SQL de la propina del resto del personal (supabase/add_propina_general.sql) en Supabase.'
        : error.message,
    }
  }
  if (!data || data.length === 0) return { ok: false, error: 'No se guardó: recargá la página y probá de nuevo.' }
  revalidatePath('/admin/fichadas/planilla/propina')
  return { ok: true, mensaje: 'Guardado.' }
}
