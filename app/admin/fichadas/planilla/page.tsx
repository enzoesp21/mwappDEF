import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { avisoConexion, type EstadoFichero } from '@/lib/fichadas'
import { ubicarEnJornada } from '@/lib/planilla'
import { armarFilas, mesDeHoy, mesTerminado, type EmpleadoDeHoja } from '@/lib/planilla-vista'
import { traerCeldas } from '@/lib/planilla-datos'
import GrillaPlanilla from '@/components/planilla/GrillaPlanilla'

export const dynamic = 'force-dynamic'

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
  cerrado_en: string | null
  cerrado_por: string | null
  xlsx_path: string | null
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
  const [mesesRes, empleadosRes, estadoRes, celdasPedidas, aliasRes, eventosRes, perfilesRes] = await Promise.all([
    supabase
      .from('planilla_meses')
      .select('periodo, estado, empleados, ultima_actualizacion, cerrado_en, cerrado_por, xlsx_path')
      .order('periodo', { ascending: false }),
    supabase.from('planilla_empleados').select('id, nombre, cargo, activo'),
    supabase.from('fichero_estado').select('ultima_conexion, ultima_fichada_crosschex, error').maybeSingle(),
    traerCeldas(supabase, `${pedido}-01`),
    supabase.from('planilla_reloj_alias').select('userid'),
    supabase.from('planilla_eventos').select('periodo, accion, detalle, por, en').order('en', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, full_name'),
  ])

  const error =
    mesesRes.error ?? empleadosRes.error ?? estadoRes.error ?? celdasPedidas.error ?? aliasRes.error ?? eventosRes.error ?? perfilesRes.error
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
  const actuales = new Map(
    (empleadosRes.data ?? []).map((e) => [
      e.id as string,
      { nombre: e.nombre as string, cargo: e.cargo as string | null, activo: e.activo !== false },
    ])
  )
  const nombreDe = new Map((perfilesRes.data ?? []).map((p) => [p.id as string, ((p.full_name as string | null) ?? '').trim() || 'alguien']))
  const historial = (eventosRes.data ?? [])
    .filter((e) => (e.periodo as string).startsWith(mes))
    .map((e) => ({
      accion: e.accion as string,
      detalle: (e.detalle as string | null) ?? null,
      por: e.por ? nombreDe.get(e.por as string) ?? 'alguien' : 'el editor SQL',
      cuando: cuandoFue(e.en as string, ahora) ?? '',
    }))

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
      cierre={{
        terminado: mesTerminado(mes, ahora),
        cerradoEn: elegido?.estado === 'cerrado' ? cuandoFue(elegido.cerrado_en, ahora) : null,
        cerradoPor: elegido?.cerrado_por ? nombreDe.get(elegido.cerrado_por) ?? null : null,
        tieneExcel: Boolean(elegido?.xlsx_path),
        historial,
      }}
    />
  )
}
