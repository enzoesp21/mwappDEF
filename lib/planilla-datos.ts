// Leer la planilla de la base (del lado del servidor): las celdas de un mes de a
// 1000 (Supabase no devuelve más por consulta y un mes son más de 2000) y las
// filas en el orden de la hoja. Lo usan la pantalla y las descargas de Excel.

import type { createClient } from '@/lib/supabase/server'
import { armarFilas, type CeldaPlanilla, type EmpleadoDeHoja, type FilaPlanilla } from '@/lib/planilla-vista'

type Cliente = Awaited<ReturnType<typeof createClient>>

export const COLUMNAS_CELDA =
  'empleado_id, dia, horas, codigo, origen, estado, entrada, salida, tramos, minutos, horario, sugerencia, avisos, nota, bloqueada'

/** Todas las celdas de un mes ("2026-10-01"), de a 1000. */
export async function traerCeldas(
  supabase: Cliente,
  periodo: string
): Promise<{ data: CeldaPlanilla[]; error: null } | { data: null; error: { message: string } }> {
  const todas: CeldaPlanilla[] = []
  for (let fila = 0; ; fila += 1000) {
    const { data, error } = await supabase
      .from('planilla_celdas')
      .select(COLUMNAS_CELDA)
      .eq('periodo', periodo)
      .order('empleado_id')
      .order('dia')
      .range(fila, fila + 999)
    if (error) return { data: null, error }
    todas.push(...((data ?? []) as CeldaPlanilla[]))
    if (!data || data.length < 1000) return { data: todas, error: null }
  }
}

export interface MesLeido {
  estado: 'abierto' | 'cerrado'
  filas: FilaPlanilla[]
}

/** La planilla de un mes ("2026-10") lista para mostrar o exportar; null si ese mes no existe. */
export async function leerMes(
  supabase: Cliente,
  mes: string
): Promise<{ data: MesLeido | null; error: null } | { data: null; error: { message: string } }> {
  const periodo = `${mes}-01`
  const [mesRes, empleadosRes, celdasRes] = await Promise.all([
    supabase.from('planilla_meses').select('estado, empleados').eq('periodo', periodo).maybeSingle(),
    supabase.from('planilla_empleados').select('id, nombre, cargo, activo'),
    traerCeldas(supabase, periodo),
  ])
  const error = mesRes.error ?? empleadosRes.error ?? celdasRes.error
  if (error) return { data: null, error }
  if (!mesRes.data) return { data: null, error: null }
  const actuales = new Map(
    (empleadosRes.data ?? []).map((e) => [
      e.id as string,
      { nombre: e.nombre as string, cargo: e.cargo as string | null, activo: e.activo !== false },
    ])
  )
  return {
    data: {
      estado: mesRes.data.estado as MesLeido['estado'],
      filas: armarFilas((mesRes.data.empleados ?? []) as EmpleadoDeHoja[], actuales, celdasRes.data ?? []),
    },
    error: null,
  }
}
