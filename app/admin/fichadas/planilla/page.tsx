import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { avisoConexion, type EstadoFichero } from '@/lib/fichadas'
import { ubicarEnJornada } from '@/lib/planilla'
import { armarFilas, mesDeHoy, type CeldaPlanilla, type EmpleadoDeHoja } from '@/lib/planilla-vista'
import GrillaPlanilla from '@/components/planilla/GrillaPlanilla'

export const dynamic = 'force-dynamic'

const COLUMNAS =
  'empleado_id, dia, horas, codigo, origen, estado, entrada, salida, tramos, minutos, horario, sugerencia, avisos, nota, bloqueada'
const POR_PAGINA = 1000 // Supabase no devuelve más de 1000 filas por consulta; un mes son más de 2000 celdas

type Cliente = Awaited<ReturnType<typeof createClient>>

async function traerCeldas(supabase: Cliente, periodo: string) {
  const todas: CeldaPlanilla[] = []
  for (let fila = 0; ; fila += POR_PAGINA) {
    const { data, error } = await supabase
      .from('planilla_celdas')
      .select(COLUMNAS)
      .eq('periodo', periodo)
      .order('empleado_id')
      .order('dia')
      .range(fila, fila + POR_PAGINA - 1)
    if (error) return { data: null, error }
    todas.push(...((data ?? []) as CeldaPlanilla[]))
    if (!data || data.length < POR_PAGINA) return { data: todas, error: null }
  }
}

/** "hoy 17:20", "ayer 07:20" o "30/10 07:20", en hora de Argentina. */
function cuandoFue(iso: string | null, ahora: number): string | null {
  if (!iso) return null
  const fecha = ubicarEnJornada(Date.parse(iso), true)
  const hoy = ubicarEnJornada(ahora, true).fecha
  const hora = `${String(Math.floor(fecha.min / 60)).padStart(2, '0')}:${String(fecha.min % 60).padStart(2, '0')}`
  if (fecha.fecha === hoy) return `hoy ${hora}`
  const [, mes, dia] = fecha.fecha.split('-')
  return `${dia}/${mes} ${hora}`
}

interface MesGuardado {
  periodo: string
  estado: 'abierto' | 'cerrado'
  empleados: EmpleadoDeHoja[]
  ultima_actualizacion: string | null
}

/** La planilla maestra del mes, igual a la de Excel, que se llena sola con el reloj. */
export default async function PlanillaPage({ searchParams }: { searchParams: { mes?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const ahora = Date.now()
  const actual = mesDeHoy(ahora)
  const pedido = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mes ?? '') ? searchParams.mes! : actual

  // El mes pedido se trae a la vez que lo demás; si no existe, se trae el último que haya.
  const [mesesRes, empleadosRes, estadoRes, celdasPedidas, aliasRes] = await Promise.all([
    supabase.from('planilla_meses').select('periodo, estado, empleados, ultima_actualizacion').order('periodo', { ascending: false }),
    supabase.from('planilla_empleados').select('id, nombre, cargo'),
    supabase.from('fichero_estado').select('ultima_conexion, ultima_fichada_crosschex, error').maybeSingle(),
    traerCeldas(supabase, `${pedido}-01`),
    supabase.from('planilla_reloj_alias').select('userid'),
  ])

  const error = mesesRes.error ?? empleadosRes.error ?? estadoRes.error ?? celdasPedidas.error ?? aliasRes.error
  const meses = (mesesRes.data ?? []) as MesGuardado[]
  const elegido = meses.find((m) => m.periodo.startsWith(pedido)) ?? meses[0]
  const celdas =
    elegido && !elegido.periodo.startsWith(pedido) ? await traerCeldas(supabase, elegido.periodo) : celdasPedidas

  if (error || celdas.error) {
    return (
      <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error max-w-3xl">
        <p className="font-semibold">No se pudo leer la planilla.</p>
        <p className="mt-1">
          Si todavía no corriste <code>supabase/add_fichadas_planilla.sql</code> en Supabase, falta eso. Detalle:{' '}
          {(error ?? celdas.error)?.message}
        </p>
      </div>
    )
  }

  const mes = elegido ? elegido.periodo.slice(0, 7) : actual

  // Personas del reloj que ficharon y no están asociadas a nadie (ni ignoradas).
  const conocidos = (aliasRes.data ?? []).map((a) => `"${a.userid}"`).join(',')
  let sueltas = supabase.from('fichadas').select('userid').limit(1000)
  if (conocidos) sueltas = sueltas.not('userid', 'in', `(${conocidos})`)
  const { data: sinAlias } = await sueltas
  const sinAsociar = new Set((sinAlias ?? []).map((f) => f.userid as string)).size
  const actuales = new Map((empleadosRes.data ?? []).map((e) => [e.id as string, { nombre: e.nombre as string, cargo: e.cargo as string | null }]))

  return (
    <GrillaPlanilla
      mes={mes}
      meses={meses.map((m) => ({ mes: m.periodo.slice(0, 7), cerrado: m.estado === 'cerrado' }))}
      filas={elegido ? armarFilas(elegido.empleados ?? [], actuales, celdas.data ?? []) : []}
      cerrado={elegido?.estado === 'cerrado'}
      actualizada={cuandoFue(elegido?.ultima_actualizacion ?? null, ahora)}
      aviso={avisoConexion(estadoRes.data as EstadoFichero | null, ahora)}
      hoy={ubicarEnJornada(ahora, false).fecha}
      esMesActual={mes === actual}
      sinMeses={meses.length === 0}
      sinAsociar={sinAsociar}
    />
  )
}
