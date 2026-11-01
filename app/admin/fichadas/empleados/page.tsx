import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { ubicarEnJornada } from '@/lib/planilla'
import ListaEmpleados, { type EmpleadoLista } from '@/components/planilla/ListaEmpleados'

export const dynamic = 'force-dynamic'

/** Los empleados de la planilla, en el orden de la hoja. */
export default async function EmpleadosPlanillaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = ubicarEnJornada(Date.now(), false).fecha
  const [empleadosRes, aliasRes, perfilesRes, semanasRes] = await Promise.all([
    supabase
      .from('planilla_empleados')
      .select('id, nombre, cargo, orden, activo, jornada_calendario, profile_id, nombres_horario')
      .order('orden'),
    supabase.from('planilla_reloj_alias').select('userid, empleado_id').eq('ignorar', false),
    supabase.from('profiles').select('id, full_name, puesto').order('full_name'),
    // Los nombres de Horarios de las últimas semanas publicadas, para elegir.
    supabase.from('schedule_weeks').select('data').eq('status', 'published').gte('week_start', sumarDias(hoy, -70)),
  ])

  const error = empleadosRes.error ?? aliasRes.error ?? perfilesRes.error ?? semanasRes.error
  if (error) {
    return (
      <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
        <p className="font-semibold">No se pudieron leer los empleados.</p>
        <p className="mt-1">Detalle: {error.message}</p>
      </div>
    )
  }

  const numeros = new Map<string, string[]>()
  for (const a of aliasRes.data ?? []) {
    if (!a.empleado_id) continue
    numeros.set(a.empleado_id, [...(numeros.get(a.empleado_id) ?? []), a.userid as string])
  }

  const empleados: EmpleadoLista[] = (empleadosRes.data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre as string,
    cargo: (e.cargo as string | null) ?? '',
    orden: e.orden as number,
    activo: e.activo as boolean,
    calendario: e.jornada_calendario as boolean,
    profileId: (e.profile_id as string | null) ?? null,
    nombresHorario: (e.nombres_horario as string[] | null) ?? [],
    reloj: (numeros.get(e.id as string) ?? []).sort((a, b) => Number(a) - Number(b)),
  }))

  const nombresHorario = new Set<string>()
  for (const s of semanasRes.data ?? []) {
    const datos = s.data as { sectores?: { personas?: { nombre?: string }[] }[] }
    for (const sector of datos.sectores ?? []) {
      for (const p of sector.personas ?? []) if (p.nombre?.trim()) nombresHorario.add(p.nombre.trim().replace(/\s+/g, ' '))
    }
  }

  return (
    <ListaEmpleados
      empleados={empleados}
      perfiles={(perfilesRes.data ?? []).map((p) => ({
        id: p.id as string,
        nombre: (p.full_name as string | null)?.trim() || 'Sin nombre',
        puesto: (p.puesto as string | null) ?? null,
      }))}
      nombresHorario={Array.from(nombresHorario).sort((a, b) => a.localeCompare(b, 'es'))}
      cargos={Array.from(new Set(empleados.map((e) => e.cargo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'))}
    />
  )
}
