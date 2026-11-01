'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { completarConSugerencia, hhmm, ubicarEnJornada } from '@/lib/planilla'
import { rangoPorDefecto, recalcularPlanilla } from '@/lib/planilla-proceso'
import { CODIGOS, diasDelMes, fechaDelDia, textoHoras, type CodigoCelda, type CeldaPlanilla } from '@/lib/planilla-vista'

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const PERIODO = /^\d{4}-(0[1-9]|1[0-2])-01$/
const TECLAS: Record<number, string> = { 0: 'Entrada', 1: 'Salida', 2: 'Break', 3: 'Fin de break' }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

function mesSiguiente(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  return numero === 12 ? `${anio + 1}-01` : `${anio}-${String(numero + 1).padStart(2, '0')}`
}

function revalidar() {
  revalidatePath('/admin/fichadas', 'layout')
}

/** "2026-10-01" y un día que exista en ese mes. */
function celdaValida(periodo: string, dia: number): boolean {
  return PERIODO.test(periodo) && Number.isInteger(dia) && dia >= 1 && dia <= diasDelMes(periodo.slice(0, 7))
}

/**
 * "Actualizar ahora": el mismo proceso que corre solo cada 2 horas. Con un mes
 * ("2026-10") lo recalcula entero, siempre respetando lo que cargó un admin.
 */
export async function actualizarPlanillaAction(mes?: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const ahora = Date.now()
  let rango = rangoPorDefecto(ahora)
  if (mes !== undefined) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, error: 'El mes no es válido.' }
    const hoy = ubicarEnJornada(ahora, false).fecha
    const fin = sumarDias(`${mesSiguiente(mes)}-01`, -1)
    rango = { desde: `${mes}-01`, hasta: fin < hoy ? fin : hoy }
    if (rango.hasta < rango.desde) return { ok: false, error: 'Ese mes todavía no empezó.' }
  }

  const r = await recalcularPlanilla(supabase, { clave: null, ...rango, ahora })
  if (!r.ok) return { ok: false, error: r.error }
  revalidar()
  const cerrados = r.mesesCerrados.length > 0 ? ` ${r.mesesCerrados.join(' y ')} está cerrado: no se tocó.` : ''
  return { ok: true, mensaje: `Planilla al día: ${r.guardadas} celdas recalculadas.${cerrados}` }
}

export interface FichadaDelDia {
  /** "07:28"; las de madrugada del día siguiente llevan "(+1)". */
  hora: string
  fuente: 'reloj' | 'papel' | 'manual'
  /** El número del reloj, si vino del reloj. */
  numero: string | null
  /** La tecla que apretó. Es dato secundario: no se le cree. */
  tecla: string | null
}

/** Todas las fichadas de una jornada de alguien, del reloj y de papel, para el panel de la celda. */
export async function fichadasDelDiaAction(
  empleadoId: string,
  fecha: string
): Promise<{ ok: true; fichadas: FichadaDelDia[] } | { ok: false; error: string }> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!FECHA.test(fecha)) return { ok: false, error: 'La fecha no es válida.' }

  const [empleado, alias] = await Promise.all([
    supabase.from('planilla_empleados').select('jornada_calendario').eq('id', empleadoId).single(),
    supabase.from('planilla_reloj_alias').select('userid').eq('empleado_id', empleadoId).eq('ignorar', false),
  ])
  if (empleado.error) return { ok: false, error: empleado.error.message }
  if (alias.error) return { ok: false, error: alias.error.message }

  const calendario = Boolean(empleado.data.jornada_calendario)
  const desde = new Date(Date.parse(`${fecha}T${calendario ? '00:00' : '07:00'}:00-03:00`)).toISOString()
  const hasta = new Date(Date.parse(desde) + 24 * 3600 * 1000).toISOString()
  const numeros = (alias.data ?? []).map((a) => a.userid as string)

  const [reloj, papel] = await Promise.all([
    numeros.length > 0
      ? supabase
          .from('fichadas')
          .select('userid, fecha_hora, tipo')
          .in('userid', numeros)
          .gte('fecha_hora', desde)
          .lt('fecha_hora', hasta)
          .order('fecha_hora')
      : null,
    supabase
      .from('fichadas_manuales')
      .select('fecha_hora, fuente')
      .eq('empleado_id', empleadoId)
      .gte('fecha_hora', desde)
      .lt('fecha_hora', hasta)
      .order('fecha_hora'),
  ])
  if (reloj?.error) return { ok: false, error: reloj.error.message }
  if (papel.error) return { ok: false, error: papel.error.message }

  const todas = [
    ...(reloj?.data ?? []).map((f) => ({
      ms: Date.parse(f.fecha_hora as string),
      fuente: 'reloj' as const,
      numero: f.userid as string,
      tecla: TECLAS[f.tipo as number] ?? null,
    })),
    ...(papel.data ?? []).map((f) => ({
      ms: Date.parse(f.fecha_hora as string),
      fuente: f.fuente as 'papel' | 'manual',
      numero: null,
      tecla: null,
    })),
  ].sort((a, b) => a.ms - b.ms)

  return {
    ok: true,
    fichadas: todas.map((f) => {
      const { min } = ubicarEnJornada(f.ms, calendario)
      return { hora: hhmm(min) + (min >= 24 * 60 ? ' (+1)' : ''), fuente: f.fuente, numero: f.numero, tecla: f.tecla }
    }),
  }
}

/**
 * Tocar una sugerencia: completa la hora que falta, recalcula las horas y la
 * celda queda manual y bloqueada, con la nota "entrada según horario" o
 * "salida habitual".
 */
export async function aplicarSugerenciaAction(
  periodo: string,
  empleadoId: string,
  dia: number,
  cual: 'habitual' | 'segunHorario'
): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!celdaValida(periodo, dia)) return { ok: false, error: 'La celda no es válida.' }

  const { data: celda, error } = await supabase
    .from('planilla_celdas')
    .select('estado, sugerencia')
    .eq('periodo', periodo)
    .eq('empleado_id', empleadoId)
    .eq('dia', dia)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  const s = celda?.sugerencia as CeldaPlanilla['sugerencia'] | undefined
  if (!s || celda?.estado !== 'incompleto') return { ok: false, error: 'Esa celda ya no está incompleta: recargá la planilla.' }

  const completo = completarConSugerencia(
    { falta: s.falta, fichada: s.fichada, habitual: s.habitual, segunHorario: s.segun_horario },
    cual
  )
  if (!completo) return { ok: false, error: 'Esa sugerencia no sirve para este día.' }

  const { data: cambiadas, error: errorGuardar } = await supabase
    .from('planilla_celdas')
    .update({
      horas: completo.horas,
      minutos: completo.minutos,
      entrada: hhmm(completo.entrada),
      salida: hhmm(completo.salida),
      tramos: [{ desde: completo.entrada, hasta: completo.salida }],
      estado: 'ok',
      origen: 'manual',
      bloqueada: true,
      nota: completo.nota,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('periodo', periodo)
    .eq('empleado_id', empleadoId)
    .eq('dia', dia)
    .eq('estado', 'incompleto')
    .select('dia')
  if (errorGuardar) return { ok: false, error: errorGuardar.message }
  if (!cambiadas || cambiadas.length === 0) return { ok: false, error: 'Esa celda cambió mientras tanto: recargá la planilla.' }
  revalidar()
  return { ok: true, mensaje: `Listo: ${textoHoras(completo.horas)} h, con la ${completo.nota}.` }
}

export type CambioCelda =
  | { tipo: 'horas'; horas: number; nota?: string }
  | { tipo: 'codigo'; codigo: CodigoCelda; nota?: string }
  | { tipo: 'nota'; nota: string }
  | { tipo: 'reloj' }

/**
 * Lo que un admin cambia a mano en una celda. Horas o código la dejan
 * bloqueada: el proceso automático ya no la toca. "Volver al reloj" la borra
 * y la recalcula desde las fichadas.
 */
export async function editarCeldaAction(
  periodo: string,
  empleadoId: string,
  dia: number,
  cambio: CambioCelda
): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!celdaValida(periodo, dia)) return { ok: false, error: 'La celda no es válida.' }

  const donde = { periodo, empleado_id: empleadoId, dia }
  const firma = { updated_by: session.user.id, updated_at: new Date().toISOString() }
  const nota = 'nota' in cambio && cambio.nota !== undefined ? cambio.nota.trim().slice(0, 300) || null : undefined

  if (cambio.tipo === 'horas' || cambio.tipo === 'codigo') {
    let valores: Record<string, unknown>
    if (cambio.tipo === 'horas') {
      const h = cambio.horas
      if (!Number.isFinite(h) || h < 0 || h > 24 || Math.round(h * 2) !== h * 2) {
        return { ok: false, error: 'Las horas van de 0 a 24, de media en media hora (8 o 8,5).' }
      }
      valores = { horas: h, codigo: null, origen: 'manual' }
    } else {
      if (!CODIGOS.includes(cambio.codigo)) return { ok: false, error: 'Ese código no existe.' }
      valores = { horas: null, codigo: cambio.codigo, origen: 'codigo' }
    }
    const { data, error } = await supabase
      .from('planilla_celdas')
      .upsert(
        { ...donde, ...valores, estado: 'ok', bloqueada: true, ...(nota !== undefined ? { nota } : {}), ...firma },
        { onConflict: 'periodo,empleado_id,dia' }
      )
      .select('dia')
    if (error) return { ok: false, error: error.message }
    if (!data || data.length === 0) return { ok: false, error: 'No se pudo guardar la celda.' }
    revalidar()
    return { ok: true, mensaje: cambio.tipo === 'horas' ? `Guardado: ${textoHoras(cambio.horas)} h.` : `Guardado: ${cambio.codigo}.` }
  }

  if (cambio.tipo === 'nota') {
    const { data, error } = await supabase
      .from('planilla_celdas')
      .update({ nota: nota ?? null, ...firma })
      .match(donde)
      .select('dia')
    if (error) return { ok: false, error: error.message }
    if (!data || data.length === 0) return { ok: false, error: 'Ese día está vacío: primero cargale horas o un código.' }
    revalidar()
    return { ok: true, mensaje: 'Nota guardada.' }
  }

  // Volver a lo que dice el reloj: se borra lo cargado a mano y se recalcula ese día.
  const { error } = await supabase.from('planilla_celdas').delete().match(donde)
  if (error) return { ok: false, error: error.message }
  const fecha = fechaDelDia(periodo.slice(0, 7), dia)
  const r = await recalcularPlanilla(supabase, { clave: null, desde: fecha, hasta: fecha, ahora: Date.now(), forzarPapel: true })
  revalidar()
  if (!r.ok) return { ok: false, error: `Se borró lo cargado a mano, pero no se pudo recalcular: ${r.error}` }
  return { ok: true, mensaje: 'Listo: el día volvió a lo que dicen las fichadas.' }
}
