import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { hhmm, ubicarEnJornada } from '@/lib/planilla'
import CargarPapel, { type CargaManual } from '@/components/planilla/CargarPapel'
import ImportarCrossChex from '@/components/planilla/ImportarCrossChex'

export const dynamic = 'force-dynamic'

/** Cargar fichadas de la planilla en papel e importar el Excel de CrossChex. */
export default async function PapelPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = ubicarEnJornada(Date.now(), false).fecha
  const desde = new Date(Date.parse(`${sumarDias(hoy, -45)}T00:00:00-03:00`)).toISOString()
  const [empleadosRes, manualesRes, aliasRes, personasRes] = await Promise.all([
    supabase.from('planilla_empleados').select('id, nombre, orden, activo, jornada_calendario').order('orden'),
    supabase
      .from('fichadas_manuales')
      .select('id, empleado_id, fecha_hora, fuente, nota')
      .gte('fecha_hora', desde)
      .order('fecha_hora', { ascending: false })
      .limit(1000),
    supabase.from('planilla_reloj_alias').select('userid, empleado_id').eq('ignorar', false),
    supabase.from('fichero_personas').select('userid, nombre'),
  ])
  const error = empleadosRes.error ?? manualesRes.error ?? aliasRes.error ?? personasRes.error
  if (error) {
    return (
      <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
        <p className="font-semibold">No se pudo leer lo cargado a mano.</p>
        <p className="mt-1">Detalle: {error.message}</p>
      </div>
    )
  }

  const empleados = (empleadosRes.data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre as string,
    activo: e.activo as boolean,
    calendario: e.jornada_calendario as boolean,
  }))
  const porId = new Map(empleados.map((e) => [e.id, e]))
  const recientes: CargaManual[] = (manualesRes.data ?? []).map((m) => {
    const e = porId.get(m.empleado_id as string)
    const { fecha, min } = ubicarEnJornada(Date.parse(m.fecha_hora as string), e?.calendario ?? false)
    return {
      id: m.id as number,
      empleadoId: m.empleado_id as string,
      nombre: e?.nombre ?? 'Empleado borrado',
      fecha,
      hora: hhmm(min) + (min >= 24 * 60 ? ' (+1)' : ''),
      minuto: min,
      fuente: m.fuente as 'papel' | 'manual',
      nota: (m.nota as string | null) ?? null,
    }
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <CargarPapel
        empleados={[...empleados.filter((e) => e.activo), ...empleados.filter((e) => !e.activo)]}
        hoy={hoy}
        recientes={recientes}
      />
      <ImportarCrossChex
        alias={(aliasRes.data ?? []).filter((a) => a.empleado_id).map((a) => [a.userid as string, a.empleado_id as string])}
        personas={(personasRes.data ?? []).map((p) => [p.userid as string, p.nombre as string])}
        empleados={empleados.map((e) => ({ id: e.id, nombre: e.nombre }))}
      />
    </div>
  )
}
