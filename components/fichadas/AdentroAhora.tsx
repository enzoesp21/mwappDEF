import { AlertTriangle, Fingerprint } from 'lucide-react'
import {
  horaArgentina,
  jornadaDe,
  leerFichadas,
  presentes,
  type CierreAMano,
  type Fichada,
  type PersonaFichero,
} from '@/lib/fichadas'
import { agruparPorSector, entradaSegunHorario, vincularHorarios, type SemanaConDatos } from '@/lib/fichadas-reporte'
import NombreConHorario from '@/components/fichadas/NombreConHorario'

interface Props {
  fichadas: Fichada[]
  inicios: string[]
  cierres: CierreAMano[]
  personas: PersonaFichero[]
  semanas: SemanaConDatos[]
  ahora: number
  /** Arriba, el total grande ("En el local ahora: 23"). Lo usa el panel de inicio. */
  conTotal?: boolean
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted truncate">{children}</span>
  )
}

/**
 * Quién está adentro ahora, por sector, y quién entró hace más de 13 h sin
 * fichar la salida. Lo usan Fichadas y el panel de inicio de los encargados
 * (Enzo, 11/11: "lo que me interesa al abrir la app").
 */
export default function AdentroAhora({ fichadas, inicios, cierres, personas: listaPersonas, semanas, ahora, conTotal }: Props) {
  const personas = new Map(listaPersonas.map((p) => [p.userid, p]))
  const leidas = leerFichadas(fichadas, inicios)
  const horario = vincularHorarios(semanas, listaPersonas, new Set(fichadas.map((f) => f.userid)))
  const hoy = jornadaDe(new Date(ahora).toISOString())

  const lista = presentes(leidas, personas, ahora, cierres)
  const adentro = lista.filter((p) => p.situacion === 'adentro')
  const sinSalida = lista.filter((p) => p.situacion === 'sin-salida')
  const grupos = agruparPorSector(adentro, (p) => horario.sectorDe(p.userid, hoy), horario.orden)

  return (
    <div className="space-y-4">
      {conTotal && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
          <Etiqueta>En el local ahora</Etiqueta>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-brand-accent tabular-nums">{adentro.length}</span>
            <span className="text-sm text-brand-muted">{adentro.length === 1 ? 'persona fichada' : 'personas fichadas'}</span>
          </p>
          {grupos.length > 0 && (
            <p className="mt-2 text-xs text-brand-muted leading-relaxed">
              {grupos.map((g) => `${g.nombre.toLowerCase()} ${g.items.length}`).join(' · ')}
            </p>
          )}
        </div>
      )}

      {sinSalida.length > 0 && (
        <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
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
        <div id="adentro" className="border border-dashed border-brand-border rounded-2xl p-8 text-center scroll-mt-20">
          <Fingerprint className="w-8 h-8 text-brand-muted mx-auto mb-2" />
          <p className="text-sm text-brand-muted">No hay nadie adentro según el reloj.</p>
        </div>
      ) : (
        <div id="adentro" className="grid grid-cols-1 gap-3 sm:grid-cols-2 scroll-mt-20">
          {grupos.map((g) => (
            <section key={g.nombre} className="bg-brand-card border border-brand-border rounded-2xl p-4 min-w-0">
              <h2 className="flex items-center justify-between gap-2">
                <Etiqueta>{g.nombre}</Etiqueta>
                <span className="text-sm font-bold text-brand-accent tabular-nums">{g.items.length}</span>
              </h2>
              <ul className="mt-2 divide-y divide-brand-border/50">
                {g.items.map((p) => (
                  <li key={p.userid} className="flex items-start gap-2 py-1.5">
                    <NombreConHorario nombre={p.nombre} entrada={entradaSegunHorario(horario.celdaDe(p.userid, hoy))} />
                    <span className="text-xs text-brand-muted tabular-nums whitespace-nowrap pt-0.5">
                      desde {horaArgentina(p.entrada)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
