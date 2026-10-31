import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Fingerprint, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIAS_CORTOS } from '@/lib/horarios'
import {
  avisoConexion,
  horaArgentina,
  jornadaDe,
  leerFichadas,
  presentes,
  TURNO_LARGO,
  type EstadoFichero,
  type Fichada,
  type PersonaFichero,
} from '@/lib/fichadas'
import {
  agruparPorSector,
  armarTurnos,
  duracion,
  horasTotales,
  reporteDelMes,
  vincularHorarios,
  type Dia,
  type SemanaConDatos,
  type Turno,
} from '@/lib/fichadas-reporte'
import RefrescoAutomatico from '@/components/fichadas/RefrescoAutomatico'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  fichadas: Fichada[]
  personas: PersonaFichero[]
  estado: EstadoFichero | null
  semanas: SemanaConDatos[]
  ahora: number
  /** "2026-10" */
  mes: string
  /** El primer mes con fichadas, para no ofrecer ir más atrás. */
  primerMes: string
}

function moverMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

/** La pantalla de fichadas: quién está adentro ahora y el mes día por día. */
export default function VistaFichadas({ fichadas, personas: listaPersonas, estado, semanas, ahora, mes, primerMes }: Props) {
  const personas = new Map(listaPersonas.map((p) => [p.userid, p]))
  const aviso = avisoConexion(estado, ahora)

  // Entrada o salida se deduce por el orden, no por la tecla (ver leerFichadas).
  const leidas = leerFichadas(fichadas)
  const horario = vincularHorarios(semanas, listaPersonas, new Set(fichadas.map((f) => f.userid)))
  const hoy = jornadaDe(new Date(ahora).toISOString())

  const lista = presentes(leidas, personas, ahora)
  const adentro = lista.filter((p) => p.situacion === 'adentro')
  const sinSalida = lista.filter((p) => p.situacion === 'sin-salida')
  const grupos = agruparPorSector(adentro, (p) => horario.sectorDe(p.userid, hoy), horario.orden)

  const turnos = armarTurnos(leidas, ahora, TURNO_LARGO)
  const vinieronHoy = new Set(turnos.filter((t) => t.dia === hoy).map((t) => t.userid))
  const siguen = new Set(lista.map((p) => p.userid))
  const seFueron = Array.from(vinieronHoy).filter((u) => !siguen.has(u)).length

  // Los días del mes, hasta hoy.
  const [anio, numeroMes] = mes.split('-').map(Number)
  const diasDelMes = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate()
  const fechas = Array.from({ length: diasDelMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`).filter(
    (f) => f <= hoy
  )
  const dias = reporteDelMes(
    turnos.filter((t) => t.dia.startsWith(mes)),
    fechas,
    personas,
    horario
  )
  const horasDelMes = dias.reduce((s, d) => s + d.ms, 0)
  const anterior = moverMes(mes, -1)
  const siguiente = moverMes(mes, 1)

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <RefrescoAutomatico segundos={30} />
      <Encabezado />

      {aviso.nivel === 'ok' ? (
        <p className="flex items-center gap-1.5 text-xs text-brand-success font-medium">
          <CheckCircle2 className="w-4 h-4" />
          {aviso.titulo} · se actualiza sola cada 30 s
        </p>
      ) : (
        <div
          className={cn(
            'rounded-2xl border p-4 flex gap-3',
            aviso.nivel === 'problema'
              ? 'bg-brand-error/10 border-brand-error/30 text-brand-error'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          )}
        >
          {aviso.nivel === 'problema' ? (
            <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{aviso.titulo}</p>
            {aviso.detalle && <p className="mt-0.5 leading-relaxed">{aviso.detalle}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Numero valor={adentro.length} texto="Adentro" destacado />
        <Numero valor={seFueron} texto="Se fueron" />
        <Numero valor={vinieronHoy.size} texto="Vinieron hoy" />
      </div>

      {sinSalida.length > 0 && (
        <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Entraron hace más de 13 horas y no ficharon la salida
          </h2>
          <ul className="mt-2 space-y-1">
            {sinSalida.map((p) => (
              <li key={p.userid} className="text-sm text-amber-900 flex justify-between gap-3">
                <span className="truncate">{p.nombre}</span>
                <span className="text-xs tabular-nums whitespace-nowrap">entró {horaArgentina(p.entrada)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grupos.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-2xl p-8 text-center">
          <Fingerprint className="w-8 h-8 text-brand-muted mx-auto mb-2" />
          <p className="text-sm text-brand-muted">No hay nadie adentro según el reloj.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {grupos.map((g) => (
            <section key={g.nombre} className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <h2 className="flex items-center justify-between gap-2">
                <Etiqueta>{g.nombre}</Etiqueta>
                <span className="text-sm font-bold text-brand-accent tabular-nums">{g.items.length}</span>
              </h2>
              <ul className="mt-2 divide-y divide-brand-border/50">
                {g.items.map((p) => (
                  <li key={p.userid} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 min-w-0 text-sm text-brand-text truncate">{p.nombre}</span>
                    <span className="text-xs text-brand-muted tabular-nums whitespace-nowrap">
                      desde {horaArgentina(p.entrada)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <FlechaMes mes={anterior} habilitada={anterior >= primerMes} atras />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-brand-accent">
              {MESES[numeroMes - 1]} {anio}
            </h2>
            <p className="text-xs text-brand-muted">{horasTotales(horasDelMes)} trabajadas en el mes</p>
          </div>
          <FlechaMes mes={siguiente} habilitada={siguiente <= hoy.slice(0, 7)} />
        </div>

        {dias.length === 0 ? (
          <p className="text-sm text-brand-muted text-center">Este mes todavía no empezó.</p>
        ) : (
          <div className="space-y-2">
            {dias.map((d) => (
              <DiaDelMes key={d.fecha} dia={d} esHoy={d.fecha === hoy} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FlechaMes({ mes, habilitada, atras = false }: { mes: string; habilitada: boolean; atras?: boolean }) {
  if (!habilitada) return <span className="min-w-[44px]" />
  const Icono = atras ? ChevronLeft : ChevronRight
  return (
    <Link
      href={`/admin/fichadas?mes=${mes}`}
      className="rounded-full hover:bg-brand-card/60 text-brand-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label={atras ? 'Mes anterior' : 'Mes siguiente'}
    >
      <Icono className="w-5 h-5" />
    </Link>
  )
}

function nombreDelDia(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00Z')
  return `${DIAS_CORTOS[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()}`
}

/** Un día del mes: cerrado muestra el resumen; abierto, cada sector con su gente y sus horas. */
function DiaDelMes({ dia, esHoy }: { dia: Dia; esHoy: boolean }) {
  const titulo = (
    <span className="w-16 flex-shrink-0">
      <span className="block text-sm font-semibold text-brand-text">{nombreDelDia(dia.fecha)}</span>
      {esHoy && (
        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-accent">Hoy</span>
      )}
    </span>
  )

  if (dia.personas === 0) {
    return (
      <div className="bg-brand-card/60 border border-brand-border/70 rounded-2xl px-4 py-3 flex items-center gap-3">
        {titulo}
        <span className="text-sm text-brand-muted">Sin fichadas</span>
      </div>
    )
  }

  return (
    <details className="group bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-brand-card-hover">
        {titulo}
        <span className="flex-1 text-sm text-brand-text">
          <span className="font-semibold tabular-nums">{dia.personas}</span>{' '}
          {dia.personas === 1 ? 'persona' : 'personas'}
        </span>
        <span className="text-sm font-semibold text-brand-accent tabular-nums">{horasTotales(dia.ms)}</span>
        <ChevronDown className="w-4 h-4 text-brand-muted transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-brand-border/70 px-4 pb-3">
        {dia.sectores.map((s) => (
          <div key={s.nombre} className="pt-3">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-brand-border/50">
              <Etiqueta>{s.nombre}</Etiqueta>
              <span className="text-[11px] text-brand-muted tabular-nums whitespace-nowrap">
                {s.filas.length} · {horasTotales(s.ms)}
              </span>
            </div>
            <ul className="divide-y divide-brand-border/40">
              {s.filas.map((f) => (
                <li key={f.userid} className="flex items-start gap-3 py-1.5">
                  <span className="flex-1 min-w-0 text-sm text-brand-text truncate pt-0.5">{f.nombre}</span>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-brand-text tabular-nums">
                      {f.ms > 0 ? duracion(f.ms) : '—'}
                    </p>
                    {f.turnos.map((t, i) => (
                      <Tramo key={i} turno={t} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}

/** El horario real de un turno, o lo que le falta. */
function Tramo({ turno }: { turno: Turno }) {
  const { entrada, salida, incompleto } = turno
  if (incompleto === 'en-curso' && entrada) {
    return <p className="text-[11px] text-brand-success tabular-nums">desde {horaArgentina(entrada)} · sigue</p>
  }
  if (incompleto === 'sin-salida' && entrada) {
    return <p className="text-[11px] text-amber-700 tabular-nums">entró {horaArgentina(entrada)} · sin salida</p>
  }
  if (incompleto === 'sin-entrada' && salida) {
    return <p className="text-[11px] text-amber-700 tabular-nums">salió {horaArgentina(salida)} · sin entrada</p>
  }
  return (
    <p className="text-[11px] text-brand-muted tabular-nums">
      {entrada && horaArgentina(entrada)} – {salida && horaArgentina(salida)}
    </p>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted truncate">{children}</span>
  )
}

export function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-accent flex items-center gap-2">
        <Fingerprint className="w-6 h-6 text-brand-accent" />
        Fichadas
      </h1>
      <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
        Quién está adentro ahora según el reloj de la entrada, y el mes día por día. Entrada o salida se deduce por el
        orden de las fichadas, no por la tecla. La jornada empieza a las 4 de la mañana.
      </p>
    </div>
  )
}

function Numero({ valor, texto, destacado = false }: { valor: number; texto: string; destacado?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3 text-center',
        destacado ? 'bg-brand-accent border-brand-accent text-white' : 'bg-brand-card border-brand-border'
      )}
    >
      <p className={cn('text-2xl font-bold tabular-nums', destacado ? 'text-white' : 'text-brand-accent')}>{valor}</p>
      <p
        className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5',
          destacado ? 'text-white/80' : 'text-brand-muted'
        )}
      >
        {texto}
      </p>
    </div>
  )
}
