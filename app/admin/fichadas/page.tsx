import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  desdeParaPedir,
  type CierreAMano,
  type EstadoFichero,
  type Fichada,
  type PersonaFichero,
} from '@/lib/fichadas'
import { lunesDe, sumarDias } from '@/lib/horarios'
import type { SemanaConDatos } from '@/lib/fichadas-reporte'
import VistaFichadas, { Encabezado } from '@/components/fichadas/VistaFichadas'

export const dynamic = 'force-dynamic'

const HORA = 3600 * 1000
const COLUMNAS = 'logid, userid, fecha_hora, tipo, dispositivo'
const POR_PAGINA = 1000 // Supabase no devuelve más de 1000 filas por consulta

type Cliente = Awaited<ReturnType<typeof createClient>>

/** Todas las fichadas entre dos horas, de a 1000. */
async function traerFichadas(supabase: Cliente, desde: string, hasta: string) {
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

/** "2026-10" del mes pedido, o el actual si no vino o vino mal. */
function mesPedido(valor: string | undefined, actual: string): string {
  return valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) && valor <= actual ? valor : actual
}

/** Quién está adentro ahora y, mes por mes, quién trabajó cada día y cuántas horas. */
export default async function FichadasPage({ searchParams }: { searchParams: { mes?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const ahora = Date.now()
  const hoy = new Date(ahora - 3 * HORA).toISOString().slice(0, 10)
  const mes = mesPedido(searchParams.mes, hoy.slice(0, 7))
  const [anio, numeroMes] = mes.split('-').map(Number)

  // El mes va de las 4 del día 1 a las 4 del día 1 siguiente (hora de Argentina = UTC-3).
  const inicioMes = Date.UTC(anio, numeroMes - 1, 1, 4 + 3)
  const finMes = Date.UTC(anio, numeroMes, 1, 4 + 3)
  // Dos días antes para saber cómo venía cada uno, y hasta 16 h después por si
  // el último turno del mes sale de madrugada.
  const desdeMes = new Date(inicioMes - 48 * HORA).toISOString()
  const hastaMes = new Date(Math.min(ahora, finMes + 16 * HORA)).toISOString()
  const desdeAhora = desdeParaPedir(ahora)
  const esteMes = finMes + 16 * HORA >= ahora

  // Las planillas de Horarios desde la semana anterior al mes hasta la de hoy
  // (la de hoy hace falta para agrupar a los que están adentro).
  const semanasDesde = sumarDias(lunesDe(`${mes}-01`), -7)
  const semanasHasta = lunesDe(hoy)

  const [mesRes, recientesRes, personasRes, estadoRes, semanasRes, primeraRes, celdasRes, aliasRes] = await Promise.all([
    traerFichadas(supabase, desdeMes, hastaMes),
    esteMes ? Promise.resolve({ data: [] as Fichada[], error: null }) : traerFichadas(supabase, desdeAhora, new Date(ahora).toISOString()),
    supabase.from('fichero_personas').select('userid, nombre, sector'),
    supabase.from('fichero_estado').select('ultima_conexion, ultima_fichada_crosschex, error').maybeSingle(),
    supabase
      .from('schedule_weeks')
      .select('week_start, data')
      .gte('week_start', semanasDesde)
      .lte('week_start', semanasHasta)
      .order('week_start', { ascending: true }),
    supabase.from('fichadas').select('fecha_hora').order('fecha_hora', { ascending: true }).limit(1),
    // Los días que un encargado resolvió a mano en la planilla en las últimas
    // 48 h (horas, la salida que faltaba o un código): esa gente ya no está adentro.
    supabase
      .from('planilla_celdas')
      .select('empleado_id, periodo, dia, horas, codigo, updated_at')
      .in('origen', ['manual', 'papel', 'codigo'])
      .gte('updated_at', desdeAhora),
    supabase.from('planilla_reloj_alias').select('userid, empleado_id').eq('ignorar', false),
  ])

  const error =
    mesRes.error ??
    recientesRes.error ??
    personasRes.error ??
    estadoRes.error ??
    semanasRes.error ??
    primeraRes.error ??
    celdasRes.error ??
    aliasRes.error
  if (error) {
    return (
      <div className="max-w-3xl space-y-5 animate-fade-in">
        <Encabezado />
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudieron leer las fichadas.</p>
          <p className="mt-1">
            Si todavía no corriste <code>supabase/add_fichadas.sql</code> en Supabase, falta eso. Detalle: {error.message}
          </p>
        </div>
      </div>
    )
  }

  // Sin repetir: si es el mes actual, las recientes ya vienen en las del mes.
  const porLogid = new Map<number, Fichada>()
  for (const f of [...(mesRes.data ?? []), ...(recientesRes.data ?? [])]) porLogid.set(f.logid, f)
  const primera = primeraRes.data?.[0]?.fecha_hora as string | undefined
  // Desde dónde hay fichadas sin cortes, para deducir bien la primera de cada
  // uno: el principio del mes pedido y, si es otro mes y no se tocan, el de las
  // recientes.
  const inicios = esteMes || desdeAhora <= hastaMes ? [desdeMes] : [desdeMes, desdeAhora]

  // Cada día resuelto a mano, para cada número del reloj de esa persona.
  const relojesDe = new Map<string, string[]>()
  for (const a of aliasRes.data ?? []) {
    if (!a.empleado_id) continue
    relojesDe.set(a.empleado_id as string, [...(relojesDe.get(a.empleado_id as string) ?? []), a.userid as string])
  }
  const cierres: CierreAMano[] = (celdasRes.data ?? [])
    .filter((c) => (c.horas !== null && Number(c.horas) > 0) || c.codigo)
    .flatMap((c) =>
      (relojesDe.get(c.empleado_id as string) ?? []).map((userid) => ({
        userid,
        fecha: `${(c.periodo as string).slice(0, 8)}${String(c.dia).padStart(2, '0')}`,
        cuando: c.updated_at as string,
      }))
    )

  return (
    <VistaFichadas
      fichadas={Array.from(porLogid.values())}
      inicios={inicios}
      cierres={cierres}
      personas={(personasRes.data ?? []) as PersonaFichero[]}
      estado={estadoRes.data as EstadoFichero | null}
      semanas={(semanasRes.data ?? []) as SemanaConDatos[]}
      ahora={ahora}
      mes={mes}
      primerMes={primera ? new Date(Date.parse(primera) - 3 * HORA).toISOString().slice(0, 7) : mes}
    />
  )
}
