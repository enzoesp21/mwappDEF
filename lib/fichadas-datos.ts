// Lo que se lee de la base para saber quién está adentro (Fichadas y el panel
// de inicio de los encargados). La lógica está en lib/fichadas.ts.

import type { SupabaseClient } from '@supabase/supabase-js'
import { desdeParaPedir, type CierreAMano, type EstadoFichero, type Fichada, type PersonaFichero } from '@/lib/fichadas'
import { hoyEnArgentina, lunesDe, sumarDias } from '@/lib/horarios'
import type { SemanaConDatos } from '@/lib/fichadas-reporte'

const COLUMNAS = 'logid, userid, fecha_hora, tipo, dispositivo'
const POR_PAGINA = 1000 // Supabase no devuelve más de 1000 filas por consulta

/** Todas las fichadas entre dos horas, de a 1000. */
export async function traerFichadas(supabase: SupabaseClient, desde: string, hasta: string) {
  const todas: Fichada[] = []
  for (let fila = 0; ; fila += POR_PAGINA) {
    const { data, error } = await supabase
      .from('fichadas')
      .select(COLUMNAS)
      .gte('fecha_hora', desde)
      .lte('fecha_hora', hasta)
      .order('fecha_hora', { ascending: true })
      .order('logid', { ascending: true })
      .range(fila, fila + POR_PAGINA - 1)
    if (error) return { data: null, error }
    todas.push(...((data ?? []) as Fichada[]))
    if (!data || data.length < POR_PAGINA) return { data: todas, error: null }
  }
}

/**
 * Los días que un encargado resolvió a mano en la planilla (horas, la salida
 * que faltaba o un código), para cada número del reloj de esa persona: esa
 * gente ya no está adentro (ver `presentes`).
 */
export function armarCierres(
  celdas: { empleado_id: unknown; periodo: unknown; dia: unknown; horas: unknown; codigo: unknown; updated_at: unknown }[],
  alias: { userid: unknown; empleado_id: unknown }[]
): CierreAMano[] {
  const relojesDe = new Map<string, string[]>()
  for (const a of alias) {
    if (!a.empleado_id) continue
    relojesDe.set(a.empleado_id as string, [...(relojesDe.get(a.empleado_id as string) ?? []), a.userid as string])
  }
  return celdas
    .filter((c) => (c.horas !== null && Number(c.horas) > 0) || c.codigo)
    .flatMap((c) =>
      (relojesDe.get(c.empleado_id as string) ?? []).map((userid) => ({
        userid,
        fecha: `${(c.periodo as string).slice(0, 8)}${String(c.dia).padStart(2, '0')}`,
        cuando: c.updated_at as string,
      }))
    )
}

export interface DatosAdentro {
  fichadas: Fichada[]
  inicios: string[]
  cierres: CierreAMano[]
  personas: PersonaFichero[]
  estado: EstadoFichero | null
  semanas: SemanaConDatos[]
}

/**
 * Lo justo para "quién está adentro ahora": las fichadas de las últimas 48 h,
 * las personas del reloj, el estado de la caja, el horario de esta semana y la
 * anterior (para los sectores) y lo resuelto a mano.
 */
export async function traerAdentroAhora(
  supabase: SupabaseClient,
  ahora: number
): Promise<{ datos: DatosAdentro | null; error: string | null }> {
  const desde = desdeParaPedir(ahora)
  const lunes = lunesDe(hoyEnArgentina())
  const [fichadasRes, personasRes, estadoRes, semanasRes, celdasRes, aliasRes] = await Promise.all([
    traerFichadas(supabase, desde, new Date(ahora).toISOString()),
    supabase.from('fichero_personas').select('userid, nombre, sector'),
    supabase.from('fichero_estado').select('ultima_conexion, ultima_fichada_crosschex, error').maybeSingle(),
    supabase
      .from('schedule_weeks')
      .select('week_start, data')
      .gte('week_start', sumarDias(lunes, -7))
      .lte('week_start', lunes)
      .order('week_start', { ascending: true }),
    supabase
      .from('planilla_celdas')
      .select('empleado_id, periodo, dia, horas, codigo, updated_at')
      .in('origen', ['manual', 'papel', 'codigo'])
      .gte('updated_at', desde),
    supabase.from('planilla_reloj_alias').select('userid, empleado_id').eq('ignorar', false),
  ])
  const error =
    fichadasRes.error ?? personasRes.error ?? estadoRes.error ?? semanasRes.error ?? celdasRes.error ?? aliasRes.error
  if (error) return { datos: null, error: error.message }
  return {
    datos: {
      fichadas: fichadasRes.data ?? [],
      inicios: [desde],
      cierres: armarCierres(celdasRes.data ?? [], aliasRes.data ?? []),
      personas: (personasRes.data ?? []) as PersonaFichero[],
      estado: estadoRes.data as EstadoFichero | null,
      semanas: (semanasRes.data ?? []) as SemanaConDatos[],
    },
    error: null,
  }
}
