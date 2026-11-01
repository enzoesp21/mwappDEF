import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { ubicarEnJornada } from '@/lib/planilla'
import type { CeldaPlanilla, EmpleadoDeHoja } from '@/lib/planilla-vista'
import FichadasDelDia, { type FilaDelDia } from '@/components/planilla/FichadasDelDia'

export const dynamic = 'force-dynamic'

const COLUMNAS =
  'empleado_id, dia, horas, codigo, origen, estado, entrada, salida, tramos, minutos, horario, sugerencia, avisos, nota, bloqueada'

/** Lo de un día, para controlar cada mañana: por defecto, la jornada anterior. */
export default async function DelDiaPage({ searchParams }: { searchParams: { fecha?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = ubicarEnJornada(Date.now(), false).fecha
  const pedida = searchParams.fecha ?? ''
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(pedida) && pedida <= hoy ? pedida : sumarDias(hoy, -1)
  const periodo = `${fecha.slice(0, 7)}-01`

  const [mesRes, celdasRes, empleadosRes] = await Promise.all([
    supabase.from('planilla_meses').select('estado, empleados').eq('periodo', periodo).maybeSingle(),
    supabase.from('planilla_celdas').select(COLUMNAS).eq('periodo', periodo).eq('dia', Number(fecha.slice(8))),
    supabase.from('planilla_empleados').select('id, nombre, cargo, orden'),
  ])
  const error = mesRes.error ?? celdasRes.error ?? empleadosRes.error
  if (error) {
    return (
      <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
        <p className="font-semibold">No se pudo leer el día.</p>
        <p className="mt-1">Detalle: {error.message}</p>
      </div>
    )
  }

  // El orden de la hoja de ese mes; quien no esté en la foto, por su orden de hoy.
  const foto = new Map(((mesRes.data?.empleados ?? []) as EmpleadoDeHoja[]).map((e) => [e.empleado_id, e.orden]))
  const empleados = new Map((empleadosRes.data ?? []).map((e) => [e.id as string, e]))
  const filas: FilaDelDia[] = ((celdasRes.data ?? []) as CeldaPlanilla[])
    .map((c) => {
      const e = empleados.get(c.empleado_id)
      return {
        empleadoId: c.empleado_id,
        nombre: (e?.nombre as string | undefined) ?? 'Empleado borrado',
        cargo: (e?.cargo as string | null | undefined) ?? null,
        orden: foto.get(c.empleado_id) ?? 1000 + ((e?.orden as number | undefined) ?? 0),
        celda: c,
      }
    })
    .sort((a, b) => a.orden - b.orden)

  return <FichadasDelDia fecha={fecha} hoy={hoy} cerrado={mesRes.data?.estado === 'cerrado'} filas={filas} />
}
