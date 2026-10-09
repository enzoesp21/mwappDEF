/**
 * Pronóstico del tiempo en Mar del Plata, para armar los horarios sabiendo
 * qué día viene lindo (más gente) o con lluvia.
 *
 * Usa Open-Meteo: es gratis, no pide registro ni clave y da 16 días hacia
 * adelante. También se piden los 7 días anteriores, para que los días ya
 * pasados de la semana en curso muestren el tiempo que hizo.
 *
 * Si el servicio no contesta, devuelve null y la pantalla sigue andando: el
 * clima es una ayuda, no puede frenar el armado del horario.
 */

// Mirador Waikiki, en la costa de Mar del Plata.
const LATITUD = -38.0055
const LONGITUD = -57.5426

export interface ClimaDia {
  fecha: string
  /** Código del tiempo de la Organización Meteorológica Mundial. */
  codigo: number
  max: number
  min: number
  /** Probabilidad de lluvia, en %. Null si el servicio no la da para ese día. */
  lluvia: number | null
  /** Viento máximo, en km/h. */
  viento: number | null
}

export type IconoClima = 'sol' | 'sol_nubes' | 'nublado' | 'niebla' | 'llovizna' | 'lluvia' | 'nieve' | 'tormenta'

/** Qué significa cada código, en castellano y con su ícono. */
export function describirClima(codigo: number): { texto: string; icono: IconoClima } {
  if (codigo === 0) return { texto: 'Despejado', icono: 'sol' }
  if (codigo === 1) return { texto: 'Casi despejado', icono: 'sol_nubes' }
  if (codigo === 2) return { texto: 'Algo nublado', icono: 'sol_nubes' }
  if (codigo === 3) return { texto: 'Nublado', icono: 'nublado' }
  if (codigo === 45 || codigo === 48) return { texto: 'Niebla', icono: 'niebla' }
  if (codigo >= 51 && codigo <= 57) return { texto: 'Llovizna', icono: 'llovizna' }
  if (codigo >= 61 && codigo <= 67) return { texto: codigo === 65 ? 'Lluvia fuerte' : 'Lluvia', icono: 'lluvia' }
  if (codigo >= 80 && codigo <= 82) return { texto: 'Chaparrones', icono: 'lluvia' }
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return { texto: 'Nieve', icono: 'nieve' }
  if (codigo >= 95) return { texto: codigo === 95 ? 'Tormenta' : 'Tormenta con granizo', icono: 'tormenta' }
  return { texto: 'Sin dato', icono: 'nublado' }
}

/**
 * Convierte la respuesta de Open-Meteo en un mapa fecha → clima. Separado de
 * la llamada para poder probarlo. Si la forma no es la esperada, null.
 */
export function leerRespuesta(json: unknown): Record<string, ClimaDia> | null {
  const daily = (json as { daily?: Record<string, unknown[]> } | null)?.daily
  if (!daily || !Array.isArray(daily.time)) return null
  const col = (nombre: string) => (Array.isArray(daily[nombre]) ? daily[nombre] : [])
  const codigos = col('weather_code')
  const maximas = col('temperature_2m_max')
  const minimas = col('temperature_2m_min')
  const lluvias = col('precipitation_probability_max')
  const vientos = col('wind_speed_10m_max')
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  const dias: Record<string, ClimaDia> = {}
  daily.time.forEach((fecha, i) => {
    const codigo = num(codigos[i])
    const max = num(maximas[i])
    const min = num(minimas[i])
    if (typeof fecha !== 'string' || codigo === null || max === null || min === null) return
    dias[fecha] = {
      fecha,
      codigo,
      max: Math.round(max),
      min: Math.round(min),
      lluvia: num(lluvias[i]),
      viento: num(vientos[i]) === null ? null : Math.round(num(vientos[i])!),
    }
  })
  return Object.keys(dias).length > 0 ? dias : null
}

/** Pide el pronóstico. Se guarda media hora en caché para no pedirlo en cada carga. */
export async function pronosticoMarDelPlata(): Promise<Record<string, ClimaDia> | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${LATITUD}&longitude=${LONGITUD}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=America%2FArgentina%2FBuenos_Aires&past_days=7&forecast_days=16'
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    return leerRespuesta(await res.json())
  } catch {
    return null
  }
}
