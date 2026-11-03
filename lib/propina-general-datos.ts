// Leer de la base lo que hace falta para la propina del resto del personal de
// una quincena (del lado del servidor, como admin): las horas de la planilla,
// en qué sector de Horarios trabajó cada uno y la General de los días cargados
// en Propinas. Lo usan la pantalla y el Excel.

import type { createClient } from '@/lib/supabase/server'
import { sumarDias, type SectorHorario } from '@/lib/horarios'
import { traerCeldas } from '@/lib/planilla-datos'
import { diasDelMes } from '@/lib/planilla-vista'
import {
  fechasDeQuincena,
  sectorDeLaQuincena,
  ubicar,
  type GrupoGeneral,
  type Ubicado,
  type Ubicacion,
} from '@/lib/propina-general'

type Cliente = Awaited<ReturnType<typeof createClient>>

export interface PersonaPropinaGeneral {
  id: string
  /** Como figura en la planilla: "CABO MARIA SOFIA". */
  nombre: string
  cargo: string | null
  /** El puesto de su usuario de la app, si tiene. */
  puesto: string | null
  /** Su sector de Horarios en la quincena. */
  sector: string | null
  /** Lo que fijó un encargado a mano, si fijó algo. */
  manual: GrupoGeneral | null
  ubicacion: Ubicacion
  por: Ubicado['por']
  horas: number
  /** Celdas incompletas en la quincena (no suman horas hasta que se corrijan). */
  incompletas: number
}

export interface DatosPropinaGeneral {
  mes: string
  q: 1 | 2
  desde: string
  hasta: string
  /** Si ese mes tiene planilla. */
  hayPlanilla: boolean
  personas: PersonaPropinaGeneral[]
  /** La suma de la General de los días cargados en Propinas en la quincena. */
  sumaGeneral: number
  diasConPropina: number
  /** Si todavía no se corrió add_propina_general.sql (no se puede fijar a mano). */
  faltaColumna: boolean
}

const GRUPOS_FIJABLES = new Set(['salon', 'cocina', 'afuera'])

export async function leerPropinaGeneral(
  supabase: Cliente,
  mes: string,
  q: 1 | 2
): Promise<{ data: DatosPropinaGeneral; error: null } | { data: null; error: { message: string } }> {
  const { desde, hasta } = fechasDeQuincena(mes, q, diasDelMes(mes))
  const [mesRes, empleadosRes, celdasRes, semanasRes, propinasRes, perfilesRes] = await Promise.all([
    supabase.from('planilla_meses').select('periodo').eq('periodo', `${mes}-01`).maybeSingle(),
    // '*' y no las columnas sueltas: antes de correr el SQL, pedir la columna
    // nueva anularía la consulta entera.
    supabase.from('planilla_empleados').select('*').order('orden'),
    traerCeldas(supabase, `${mes}-01`),
    supabase.from('schedule_weeks').select('week_start, data').gte('week_start', sumarDias(desde, -6)).lte('week_start', hasta),
    supabase.from('tip_days').select('fecha, general').gte('fecha', desde).lte('fecha', hasta),
    supabase.from('profiles').select('id, puesto'),
  ])
  const error = mesRes.error ?? empleadosRes.error ?? celdasRes.error ?? semanasRes.error ?? propinasRes.error ?? perfilesRes.error
  if (error) return { data: null, error }

  const primerDia = Number(desde.slice(8))
  const ultimoDia = Number(hasta.slice(8))
  const horas = new Map<string, number>()
  const incompletas = new Map<string, number>()
  for (const c of celdasRes.data ?? []) {
    if (c.dia < primerDia || c.dia > ultimoDia) continue
    if (c.horas !== null && Number(c.horas) > 0) horas.set(c.empleado_id, (horas.get(c.empleado_id) ?? 0) + Number(c.horas))
    if (c.estado === 'incompleto') incompletas.set(c.empleado_id, (incompletas.get(c.empleado_id) ?? 0) + 1)
  }

  const semanas = (semanasRes.data ?? []).map((s) => ({
    week_start: s.week_start as string,
    sectores: ((s.data as { sectores?: SectorHorario[] } | null)?.sectores ?? []) as SectorHorario[],
  }))
  const empleados = (empleadosRes.data ?? []) as Record<string, unknown>[]
  const puestoDe = new Map((perfilesRes.data ?? []).map((p) => [p.id as string, (p.puesto as string | null) ?? null]))
  const faltaColumna = empleados.length > 0 && !('grupo_propina_general' in empleados[0])

  const personas: PersonaPropinaGeneral[] = empleados
    .filter((e) => (horas.get(e.id as string) ?? 0) > 0 || (incompletas.get(e.id as string) ?? 0) > 0)
    .map((e) => {
      const id = e.id as string
      const manual = GRUPOS_FIJABLES.has(e.grupo_propina_general as string) ? (e.grupo_propina_general as GrupoGeneral) : null
      const cargo = ((e.cargo as string | null) ?? '').trim() || null
      const sector = sectorDeLaQuincena((e.nombres_horario as string[] | null) ?? [], semanas, desde, hasta)
      const puesto = e.profile_id ? puestoDe.get(e.profile_id as string) ?? null : null
      const { ubicacion, por } = ubicar({ manual, sector, cargo, puesto })
      return {
        id,
        nombre: e.nombre as string,
        cargo,
        puesto,
        sector,
        manual,
        ubicacion,
        por,
        horas: horas.get(id) ?? 0,
        incompletas: incompletas.get(id) ?? 0,
      }
    })

  const propinas = propinasRes.data ?? []
  return {
    data: {
      mes,
      q,
      desde,
      hasta,
      hayPlanilla: Boolean(mesRes.data),
      personas,
      sumaGeneral: propinas.reduce((s, p) => s + Number(p.general ?? 0), 0),
      diasConPropina: propinas.length,
      faltaColumna,
    },
    error: null,
  }
}
