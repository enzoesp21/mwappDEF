import { AlertTriangle, CheckCircle2, Coffee, Fingerprint, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  avisoConexion,
  horaArgentina,
  inicioJornada,
  nombreDe,
  nombreTipo,
  sectorDe,
  SIN_SECTOR,
  porSector,
  presentes,
  sinRepetidas,
  type EstadoFichero,
  type Fichada,
  type PersonaFichero,
} from '@/lib/fichadas'
import RefrescoAutomatico from '@/components/fichadas/RefrescoAutomatico'

const COLOR_TIPO: Record<number, string> = {
  0: 'bg-brand-success/15 text-brand-success',
  1: 'bg-brand-border/40 text-brand-muted',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-brand-accent/10 text-brand-accent',
}

interface Props {
  fichadas: Fichada[]
  personas: PersonaFichero[]
  estado: EstadoFichero | null
  ahora: number
}

/** La pantalla de fichadas, ya con los datos: presentes por sector y lo del día. */
export default function VistaFichadas({ fichadas, personas: listaPersonas, estado, ahora }: Props) {
  const personas = new Map(listaPersonas.map((p) => [p.userid, p]))
  const aviso = avisoConexion(estado, ahora)

  const lista = presentes(fichadas, personas, ahora)
  const adentro = lista.filter((p) => p.situacion !== 'sin-salida')
  const sinSalida = lista.filter((p) => p.situacion === 'sin-salida')
  const enBreak = adentro.filter((p) => p.situacion === 'break').length
  // Hoy en CrossChex casi nadie tiene sector: mientras sea así, va una sola
  // lista a lo ancho y el sector como etiqueta de quien lo tenga.
  const conSector = adentro.filter((p) => p.sector !== SIN_SECTOR).length
  const sinSectores = conSector < adentro.length / 2
  const sectores = sinSectores ? [{ nombre: 'Adentro ahora', personas: adentro }] : porSector(adentro)

  const desdeHoy = Date.parse(inicioJornada(ahora))
  const deHoy = sinRepetidas(fichadas)
    .filter((f) => Date.parse(f.fecha_hora) >= desdeHoy && Date.parse(f.fecha_hora) <= ahora + 5 * 60 * 1000)
    .reverse()

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
        <Numero valor={enBreak} texto="En break" />
        <Numero valor={deHoy.length} texto="Fichadas hoy" />
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
                <span className="text-xs tabular-nums whitespace-nowrap">
                  entró {p.entrada ? horaArgentina(p.entrada) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sectores.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-2xl p-8 text-center">
          <Fingerprint className="w-8 h-8 text-brand-muted mx-auto mb-2" />
          <p className="text-sm text-brand-muted">No hay nadie adentro según el reloj.</p>
        </div>
      ) : (
        <div className={cn('grid gap-3', !sinSectores && 'sm:grid-cols-2')}>
          {sectores.map((s) => (
            <section key={s.nombre} className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <h2 className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted truncate">
                  {s.nombre}
                </span>
                <span className="text-sm font-bold text-brand-accent tabular-nums">{s.personas.length}</span>
              </h2>
              <ul className="mt-2 divide-y divide-brand-border/50">
                {s.personas.map((p) => (
                  <li key={p.userid} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 min-w-0 text-sm text-brand-text truncate">
                      {p.nombre}
                      {sinSectores && p.sector !== SIN_SECTOR && (
                        <span className="ml-1.5 text-[10px] text-brand-muted">· {p.sector}</span>
                      )}
                    </span>
                    {p.situacion === 'break' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                        <Coffee className="w-3 h-3" />
                        break {horaArgentina(p.ultima.fecha_hora)}
                      </span>
                    ) : (
                      <span className="text-xs text-brand-muted tabular-nums whitespace-nowrap">
                        {p.entrada ? 'desde ' + horaArgentina(p.entrada) : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted mb-2">
          Fichadas de hoy
        </h2>
        {deHoy.length === 0 ? (
          <p className="text-sm text-brand-muted">Todavía no hay fichadas hoy.</p>
        ) : (
          <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
            {deHoy.map((f) => {
              const persona = personas.get(f.userid)
              const sector = sectorDe(persona)
              return (
                <li key={f.logid} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm font-semibold text-brand-text tabular-nums w-11 flex-shrink-0">
                    {horaArgentina(f.fecha_hora)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-text truncate">{nombreDe(persona, f.userid)}</p>
                    {sector !== SIN_SECTOR && <p className="text-[11px] text-brand-muted truncate">{sector}</p>}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                      COLOR_TIPO[f.tipo] ?? COLOR_TIPO[1]
                    )}
                  >
                    {nombreTipo(f.tipo)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
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
        Quién está adentro ahora según el reloj de la entrada. La jornada empieza a las 5 de la mañana.
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
