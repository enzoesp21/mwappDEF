import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { nombreDiaCorto, numeroDeDia, sumarDias } from '@/lib/horarios'
import { describirClima, type ClimaDia, type IconoClima } from '@/lib/clima'

const ICONOS: Record<IconoClima, LucideIcon> = {
  sol: Sun,
  sol_nubes: CloudSun,
  nublado: Cloud,
  niebla: CloudFog,
  llovizna: CloudDrizzle,
  lluvia: CloudRain,
  nieve: CloudSnow,
  tormenta: CloudLightning,
}

/** Desde cuánto viento vale la pena avisar (terraza, sombrillas). */
const VIENTO_FUERTE = 40

interface Props {
  lunes: string
  totalDias: number
  /** null si no se pudo pedir el pronóstico. */
  clima: Record<string, ClimaDia> | null
}

/**
 * El tiempo de cada día de la semana en Mar del Plata, arriba del editor, para
 * armar el horario sabiendo qué día viene lindo o con lluvia.
 */
export default function ClimaSemana({ lunes, totalDias, clima }: Props) {
  if (!clima) {
    return (
      <p className="text-[11px] text-brand-muted">
        Pronóstico del tiempo no disponible ahora. Probá recargar en un rato.
      </p>
    )
  }

  const dias = Array.from({ length: totalDias }, (_, i) => ({ i, fecha: sumarDias(lunes, i) }))
  if (!dias.some((d) => clima[d.fecha])) {
    return (
      <p className="text-[11px] text-brand-muted">
        Todavía no hay pronóstico para esta semana: sale con hasta 16 días de anticipación.
      </p>
    )
  }

  return (
    <section className="bg-brand-card border border-brand-border rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-brand-text">Clima en Mar del Plata</p>
        <p className="text-[10px] text-brand-muted">máx / mín · lluvia · viento km/h</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {dias.map(({ i, fecha }) => {
          const dia = clima[fecha]
          if (!dia) {
            return (
              <div
                key={fecha}
                className="flex-1 min-w-[64px] rounded-lg border border-dashed border-brand-border px-1 py-2 text-center"
              >
                <p className="text-[11px] font-semibold text-brand-muted">
                  {nombreDiaCorto(i)} {numeroDeDia(lunes, i)}
                </p>
                <p className="text-[10px] text-brand-muted mt-3">Sin pronóstico</p>
              </div>
            )
          }
          const { texto, icono } = describirClima(dia.codigo)
          const Icono = ICONOS[icono]
          const lluvioso = (dia.lluvia ?? 0) >= 50 || icono === 'lluvia' || icono === 'tormenta'
          const lindo = !lluvioso && dia.max >= 24 && (icono === 'sol' || icono === 'sol_nubes')
          const ventoso = (dia.viento ?? 0) >= VIENTO_FUERTE
          return (
            <div
              key={fecha}
              title={
                texto +
                (dia.lluvia !== null ? ` · ${dia.lluvia}% de lluvia` : '') +
                (dia.viento !== null ? ` · viento hasta ${dia.viento} km/h` : '')
              }
              className={cn(
                'flex-1 min-w-[64px] rounded-lg border px-1 py-1.5 text-center',
                lluvioso
                  ? 'bg-sky-50 border-sky-200'
                  : lindo
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-brand-card-hover border-brand-border/70'
              )}
            >
              <p className="text-[11px] font-semibold text-brand-text">
                {nombreDiaCorto(i)} {numeroDeDia(lunes, i)}
              </p>
              <Icono
                className={cn(
                  'w-5 h-5 mx-auto my-1',
                  lluvioso ? 'text-sky-600' : lindo ? 'text-amber-500' : 'text-brand-muted'
                )}
                aria-label={texto}
              />
              <p className="text-sm font-bold text-brand-text tabular-nums leading-tight">{dia.max}°</p>
              <p className="text-[11px] text-brand-muted tabular-nums leading-tight">{dia.min}°</p>
              {dia.lluvia !== null && dia.lluvia >= 20 && (
                <p className="flex items-center justify-center gap-0.5 text-[10px] text-sky-700 font-medium whitespace-nowrap">
                  <Droplets className="w-2.5 h-2.5" />
                  {dia.lluvia}%
                </p>
              )}
              {ventoso && (
                <p className="flex items-center justify-center gap-0.5 text-[10px] text-brand-muted font-medium whitespace-nowrap">
                  <Wind className="w-2.5 h-2.5 flex-shrink-0" />
                  {dia.viento}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
