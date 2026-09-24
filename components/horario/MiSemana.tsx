import { CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIAS_CORTOS, numeroDeDia, tipoCelda, type PersonaHorario } from '@/lib/horarios'
import { claseCelda } from '@/components/horario/estilos'

interface Props {
  lunes: string
  /** Una fila por sector en el que figura: alguien puede trabajar en dos. */
  filas: { sector: string; persona: PersonaHorario }[]
  /** Índice de hoy si la semana es la actual; null si no. */
  hoy: number | null
  /** Días feriados de la semana (0 = lunes). */
  feriados?: number[]
}

const DESCRIPCION: Record<string, string> = {
  libre: 'Franco',
  vacaciones: 'Vacaciones',
  licencia: 'Licencia',
  otro_lugar: 'Mirador 9',
  vacio: 'Sin cargar',
}

export default function MiSemana({ lunes, filas, hoy, feriados = [] }: Props) {
  return (
    <section className="bg-brand-card border border-brand-accent/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-brand-accent/10 border-b border-brand-accent/20">
        <CalendarCheck className="w-4 h-4 text-brand-accent flex-shrink-0" />
        <h2 className="text-sm font-semibold text-brand-text">Tu semana</h2>
      </div>

      {filas.map(({ sector, persona }, fi) => (
        <div key={fi} className="p-3">
          <p className="text-[11px] text-brand-muted mb-2 px-1">
            Figurás como <span className="font-semibold text-brand-text">{persona.nombre}</span> en{' '}
            {sector.toLowerCase()}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {persona.dias.map((valor, i) => {
              const tipo = tipoCelda(valor)
              const esHoy = hoy === i
              const feriado = feriados.includes(i)
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg px-0.5 py-1.5 text-center flex flex-col items-center justify-start min-h-[62px]',
                    claseCelda(valor, i, i >= 5 || feriado),
                    esHoy && 'ring-2 ring-brand-accent'
                  )}
                >
                  <span className={cn('text-[10px] font-semibold', esHoy ? 'text-brand-accent' : 'text-brand-muted')}>
                    {esHoy ? 'Hoy' : DIAS_CORTOS[i]}
                  </span>
                  <span className="text-[9px] text-brand-muted">
                    {feriado ? 'Feriado' : numeroDeDia(lunes, i)}
                  </span>
                  <span className="text-[10px] leading-tight mt-1 break-words w-full">
                    {tipo === 'turno' ? valor : DESCRIPCION[tipo]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
