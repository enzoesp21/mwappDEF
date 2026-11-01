'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { INICIO_JORNADA, hhmm, ubicarEnJornada } from '@/lib/planilla'
import { recalcularPlanilla } from '@/lib/planilla-proceso'
import { textoHorasDeCelda } from '@/lib/planilla-vista'

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }
type Cliente = Awaited<ReturnType<typeof createClient>>

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DIA = 86_400_000
const SIN_PERMISO: Resultado = { ok: false, error: 'No tenés permiso para hacer esto.' }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

function diaMes(fecha: string): string {
  return `${fecha.slice(8)}/${fecha.slice(5, 7)}`
}

/**
 * Recalcula esas jornadas rehaciendo lo de papel (de a 31 días: el proceso
 * acepta hasta 2 meses por vez). Devuelve un texto si algo falló.
 */
async function recalcularRango(supabase: Cliente, desde: string, hasta: string): Promise<string> {
  for (let inicio = desde; inicio <= hasta; inicio = sumarDias(inicio, 31)) {
    const fin = sumarDias(inicio, 30) < hasta ? sumarDias(inicio, 30) : hasta
    const r = await recalcularPlanilla(supabase, { clave: null, desde: inicio, hasta: fin, ahora: Date.now(), forzarPapel: true })
    if (!r.ok) return ` Ojo: no se pudo recalcular la planilla (${r.error}).`
  }
  return ''
}

/**
 * Cargar a mano las horas de la planilla en papel de un día. Una hora antes de
 * las 07:00 es de madrugada: cuenta para esa jornada (una salida a la 01:30).
 */
export async function cargarPapelAction(empleadoId: string, fecha: string, horas: string[], nota: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  if (!FECHA.test(fecha)) return { ok: false, error: 'Elegí el día.' }
  const limpias = Array.from(new Set(horas.map((h) => h.trim()).filter(Boolean)))
  if (limpias.length === 0) return { ok: false, error: 'Escribí al menos una hora.' }
  if (limpias.length > 6 || limpias.some((h) => !HORA.test(h))) return { ok: false, error: 'Las horas van así: 07:30 (hasta 6).' }

  const { data: empleado, error: errorEmpleado } = await supabase
    .from('planilla_empleados')
    .select('nombre, jornada_calendario')
    .eq('id', empleadoId)
    .single()
  if (errorEmpleado) return { ok: false, error: errorEmpleado.message }

  const filas = limpias.map((h) => {
    const minutos = Number(h.slice(0, 2)) * 60 + Number(h.slice(3))
    const madrugada = !empleado.jornada_calendario && minutos < INICIO_JORNADA
    return {
      empleado_id: empleadoId,
      fecha_hora: new Date(Date.parse(`${fecha}T${h}:00-03:00`) + (madrugada ? DIA : 0)).toISOString(),
      fuente: 'papel',
      nota: nota.trim().slice(0, 200) || null,
      created_by: session.user.id,
    }
  })
  const { error } = await supabase
    .from('fichadas_manuales')
    .upsert(filas, { onConflict: 'empleado_id,fecha_hora', ignoreDuplicates: true })
  if (error) return { ok: false, error: error.message }

  const aviso = await recalcularRango(supabase, fecha, fecha)
  revalidatePath('/admin/fichadas', 'layout')

  const { data: celda } = await supabase
    .from('planilla_celdas')
    .select('horas, estado, entrada, salida, bloqueada, origen, codigo')
    .eq('periodo', `${fecha.slice(0, 7)}-01`)
    .eq('empleado_id', empleadoId)
    .eq('dia', Number(fecha.slice(8)))
    .maybeSingle()
  const quien = `${empleado.nombre}, ${diaMes(fecha)}`
  if (celda && (celda.bloqueada || celda.origen === 'manual' || celda.origen === 'codigo')) {
    return {
      ok: true,
      mensaje: `Papel guardado (${quien}), pero ese día está cargado a mano y no cambió. Si querés que cuente el papel, abrí el día en la planilla y tocá "Volver a lo que dice el reloj".${aviso}`,
    }
  }
  return { ok: true, mensaje: `Papel guardado. ${quien}: ${textoHorasDeCelda(celda)}.${aviso}` }
}

/** Borrar una fichada cargada a mano (y recalcular su día). */
export async function borrarPapelAction(id: number): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  const { data: fila, error } = await supabase.from('fichadas_manuales').select('empleado_id, fecha_hora').eq('id', id).maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!fila) return { ok: false, error: 'Esa fichada ya no está: recargá la página.' }
  const { data: empleado } = await supabase.from('planilla_empleados').select('jornada_calendario').eq('id', fila.empleado_id).single()

  const { error: errorBorrar } = await supabase.from('fichadas_manuales').delete().eq('id', id)
  if (errorBorrar) return { ok: false, error: errorBorrar.message }
  const { fecha, min } = ubicarEnJornada(Date.parse(fila.fecha_hora), Boolean(empleado?.jornada_calendario))
  const aviso = await recalcularRango(supabase, fecha, fecha)
  revalidatePath('/admin/fichadas', 'layout')
  return { ok: true, mensaje: `Borrada la de las ${hhmm(min)} del ${diaMes(fecha)}.${aviso}` }
}

/**
 * Importar las fichadas leídas del Excel de CrossChex (para cuando el programa
 * de la caja no anduvo). Se saltean las que el reloj ya tiene (misma persona,
 * menos de un minuto de diferencia) y las repetidas; el resto entra como
 * fuente 'manual', sin duplicar aunque se importe dos veces el mismo archivo.
 */
export async function importarFichadasAction(filas: { empleadoId: string; ms: number }[]): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return SIN_PERMISO
  if (!Array.isArray(filas) || filas.length === 0) return { ok: false, error: 'No hay fichadas para importar.' }
  if (filas.length > 6000) return { ok: false, error: 'Son demasiadas fichadas juntas: importá de a un mes.' }
  if (filas.some((f) => typeof f.empleadoId !== 'string' || !Number.isFinite(f.ms))) return { ok: false, error: 'El archivo trajo datos raros.' }

  const ids = Array.from(new Set(filas.map((f) => f.empleadoId)))
  const [empleadosRes, aliasRes] = await Promise.all([
    supabase.from('planilla_empleados').select('id, jornada_calendario').in('id', ids),
    supabase.from('planilla_reloj_alias').select('userid, empleado_id').in('empleado_id', ids).eq('ignorar', false),
  ])
  if (empleadosRes.error) return { ok: false, error: empleadosRes.error.message }
  if (aliasRes.error) return { ok: false, error: aliasRes.error.message }
  const calendario = new Map((empleadosRes.data ?? []).map((e) => [e.id as string, Boolean(e.jornada_calendario)]))
  if (calendario.size !== ids.length) return { ok: false, error: 'Algún empleado ya no existe: recargá la página.' }

  // Lo que ya tiene el reloj en ese rango, por empleado.
  const empleadoDe = new Map((aliasRes.data ?? []).map((a) => [a.userid as string, a.empleado_id as string]))
  const desde = new Date(Math.min(...filas.map((f) => f.ms)) - 3600_000).toISOString()
  const hasta = new Date(Math.max(...filas.map((f) => f.ms)) + 3600_000).toISOString()
  const delReloj = new Map<string, number[]>()
  if (empleadoDe.size > 0) {
    for (let fila = 0; ; fila += 1000) {
      const { data, error } = await supabase
        .from('fichadas')
        .select('userid, fecha_hora')
        .in('userid', Array.from(empleadoDe.keys()))
        .gte('fecha_hora', desde)
        .lte('fecha_hora', hasta)
        .order('logid')
        .range(fila, fila + 999)
      if (error) return { ok: false, error: error.message }
      for (const f of data ?? []) {
        const emp = empleadoDe.get(f.userid as string)!
        delReloj.set(emp, [...(delReloj.get(emp) ?? []), Date.parse(f.fecha_hora as string)])
      }
      if (!data || data.length < 1000) break
    }
  }

  const vistas = new Set<string>()
  let enReloj = 0
  let repetidas = 0
  const nuevas: { empleado_id: string; fecha_hora: string; fuente: string; nota: string; created_by: string }[] = []
  for (const f of filas) {
    const clave = `${f.empleadoId}|${Math.floor(f.ms / 60_000)}`
    if (vistas.has(clave)) {
      repetidas++
      continue
    }
    vistas.add(clave)
    if ((delReloj.get(f.empleadoId) ?? []).some((r) => Math.abs(r - f.ms) < 60_000)) {
      enReloj++
      continue
    }
    nuevas.push({
      empleado_id: f.empleadoId,
      fecha_hora: new Date(f.ms).toISOString(),
      fuente: 'manual',
      nota: 'Importado de CrossChex',
      created_by: session.user.id,
    })
  }

  let insertadas = 0
  for (let i = 0; i < nuevas.length; i += 1000) {
    const { data, error } = await supabase
      .from('fichadas_manuales')
      .upsert(nuevas.slice(i, i + 1000), { onConflict: 'empleado_id,fecha_hora', ignoreDuplicates: true })
      .select('id')
    if (error) return { ok: false, error: `Se cargaron ${insertadas} y después falló: ${error.message}` }
    insertadas += data?.length ?? 0
  }

  const saltadas = [
    enReloj > 0 && `${enReloj} ya estaban en el reloj`,
    repetidas > 0 && `${repetidas} repetidas en el archivo`,
    nuevas.length - insertadas > 0 && `${nuevas.length - insertadas} ya estaban importadas`,
  ].filter(Boolean)
  const detalle = saltadas.length > 0 ? ` (se saltearon: ${saltadas.join(', ')})` : ''
  if (insertadas === 0) return { ok: true, mensaje: `No había nada nuevo para cargar${detalle}.` }

  const fechas = nuevas.map((n) => ubicarEnJornada(Date.parse(n.fecha_hora), calendario.get(n.empleado_id) ?? false).fecha).sort()
  const aviso = await recalcularRango(supabase, fechas[0], fechas[fechas.length - 1])
  revalidatePath('/admin/fichadas', 'layout')
  return {
    ok: true,
    mensaje: `Listo: se cargaron ${insertadas} fichadas${detalle} y se recalculó del ${diaMes(fechas[0])} al ${diaMes(fechas[fechas.length - 1])}.${aviso}`,
  }
}
