import { Moon, Sun, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nombreDiaCorto, numeroDeDia, type TotalDia } from '@/lib/horarios'
import { claseColumna, claseEncabezadoDia } from '@/components/horario/estilos'

interface Props {
  lunes: string
  totales: TotalDia[]
  findes: boolean[]
}

/**
 * Cuántos hay por día en todo el complejo: los que trabajan, los que están al
 * almuerzo (de 12 a 15.30) y los que hacen noche. Quien figura en dos
 * sectores cuenta una vez.
 */
export default function ResumenSemana({ lunes, totales, findes }: Props) {
  const filas = [
    { etiqueta: 'Trabajan', icono: Users, valor: (t: TotalDia) => t.total, destacada: false },
    { etiqueta: 'Almuerzo', detalle: '12 a 15.30', icono: Sun, valor: (t: TotalDia) => t.almuerzo, destacada: true },
    { etiqueta: 'Noche', icono: Moon, valor: (t: TotalDia) => t.noche, destacada: false },
  ]
  return (
    <section className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      <h2 className="px-3 pt-3 pb-2 text-xs font-semibold text-brand-text">Todo el personal, por día</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 120 + totales.length * 58 }}>
          <thead>
            <tr className="border-y border-brand-border">
              <th className="sticky left-0 z-10 bg-brand-card w-[120px]" />
              {totales.map((_, i) => (
                <th key={i} className={cn('font-semibold px-1 py-1.5 text-center', claseEncabezadoDia(findes[i]))}>
                  {nombreDiaCorto(i)} {numeroDeDia(lunes, i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ etiqueta, detalle, icono: Icono, valor, destacada }) => (
              <tr key={etiqueta} className={cn('border-b border-brand-border/60', destacada && 'bg-amber-50/70')}>
                <td
                  className={cn(
                    'sticky left-0 z-10 px-3 py-1.5 text-[11px] font-semibold text-brand-text whitespace-nowrap',
                    destacada ? 'bg-amber-50' : 'bg-brand-card'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Icono className={cn('w-3.5 h-3.5', destacada ? 'text-amber-600' : 'text-brand-muted')} />
                    {etiqueta}
                    {detalle && <span className="font-normal text-brand-muted">{detalle}</span>}
                  </span>
                </td>
                {totales.map((t, i) => (
                  <td
                    key={i}
                    className={cn(
                      'px-1 py-1.5 text-center tabular-nums',
                      destacada ? 'text-sm font-bold text-brand-text' : 'text-[12px] font-semibold text-brand-text',
                      !destacada && claseColumna(findes[i])
                    )}
                  >
                    {valor(t)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
