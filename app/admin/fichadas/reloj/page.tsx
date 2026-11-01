import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ubicarEnJornada } from '@/lib/planilla'
import { sugerirEmpleados } from '@/lib/planilla-reloj'
import EquivalenciasReloj, { type Asociado, type SinAsociar } from '@/components/planilla/EquivalenciasReloj'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 1000

/** "28/10" en hora de Argentina. */
function diaMes(iso: string): string {
  const [, mes, dia] = ubicarEnJornada(Date.parse(iso), true).fecha.split('-')
  return `${dia}/${mes}`
}

/** De qué empleado es cada número del reloj, y los que todavía no son de nadie. */
export default async function RelojPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [aliasRes, personasRes, empleadosRes] = await Promise.all([
    supabase.from('planilla_reloj_alias').select('userid, empleado_id, ignorar'),
    supabase.from('fichero_personas').select('userid, nombre'),
    supabase.from('planilla_empleados').select('id, nombre, orden, activo').order('orden'),
  ])
  const error = aliasRes.error ?? personasRes.error ?? empleadosRes.error
  if (error) {
    return (
      <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
        <p className="font-semibold">No se pudieron leer los números del reloj.</p>
        <p className="mt-1">Detalle: {error.message}</p>
      </div>
    )
  }
  const alias = aliasRes.data ?? []
  const nombres = new Map((personasRes.data ?? []).map((p) => [p.userid as string, p.nombre as string]))
  const empleados = (empleadosRes.data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre as string,
    activo: e.activo as boolean,
  }))

  // Solo las fichadas de los números que no están en la lista (pocas): de a 1000.
  const conocidos = alias.map((a) => `"${a.userid}"`).join(',')
  const sueltas: { userid: string; fecha_hora: string }[] = []
  for (let fila = 0; ; fila += POR_PAGINA) {
    let consulta = supabase.from('fichadas').select('userid, fecha_hora').order('fecha_hora').range(fila, fila + POR_PAGINA - 1)
    if (conocidos) consulta = consulta.not('userid', 'in', `(${conocidos})`)
    const { data, error: errorFichadas } = await consulta
    if (errorFichadas) {
      return (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
          No se pudieron leer las fichadas: {errorFichadas.message}
        </div>
      )
    }
    sueltas.push(...((data ?? []) as { userid: string; fecha_hora: string }[]))
    if (!data || data.length < POR_PAGINA) break
  }

  const porNumero = new Map<string, { cuantas: number; primera: string; ultima: string }>()
  for (const f of sueltas) {
    const d = porNumero.get(f.userid)
    if (d) {
      d.cuantas++
      d.ultima = f.fecha_hora
    } else {
      porNumero.set(f.userid, { cuantas: 1, primera: f.fecha_hora, ultima: f.fecha_hora })
    }
  }

  const conReloj = new Set(alias.filter((a) => !a.ignorar && a.empleado_id).map((a) => a.empleado_id as string))
  const paraSugerir = empleados.map((e) => ({ id: e.id, nombre: e.nombre, conReloj: conReloj.has(e.id) }))
  const sinAsociar: SinAsociar[] = Array.from(porNumero, ([userid, d]) => ({
    userid,
    nombre: nombres.get(userid) ?? null,
    fichadas: d.cuantas,
    desde: diaMes(d.primera),
    hasta: diaMes(d.ultima),
    ultima: d.ultima,
    sugerencias: nombres.get(userid) ? sugerirEmpleados(nombres.get(userid)!, paraSugerir) : [],
  })).sort((a, b) => b.ultima.localeCompare(a.ultima))

  const nombrePorEmpleado = new Map(empleados.map((e) => [e.id, e.nombre]))
  const asociados: Asociado[] = alias
    .filter((a) => !a.ignorar && a.empleado_id)
    .map((a) => ({
      userid: a.userid as string,
      nombreReloj: nombres.get(a.userid as string) ?? null,
      empleado: nombrePorEmpleado.get(a.empleado_id as string) ?? '?',
    }))
    .sort((a, b) => a.empleado.localeCompare(b.empleado, 'es') || Number(a.userid) - Number(b.userid))
  const ignorados = alias
    .filter((a) => a.ignorar)
    .map((a) => ({ userid: a.userid as string, nombreReloj: nombres.get(a.userid as string) ?? null }))

  return (
    <EquivalenciasReloj
      sinAsociar={sinAsociar}
      asociados={asociados}
      ignorados={ignorados}
      empleados={empleados}
    />
  )
}
