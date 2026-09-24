/**
 * Reparto de propinas del salón.
 *
 * Es la misma cuenta que hacía la calculadora que se usaba aparte
 * (prueba77enzo.vercel.app), para que los números no cambien al pasar a la app:
 *
 *   salón     = total - general
 *   horas     = horas de camareros + 75 % de las de reducidos + 50 % de las de prueba
 *   por hora  = salón / horas
 *   a cada uno = sus horas × su porcentaje × por hora
 */

import { normalizarNombre } from '@/lib/horarios'

export type Grupo = 'camarero' | 'reducido' | 'prueba'
export type Pago = 'tr' | 'ef' | 'tr_ef'

export const GRUPOS: { valor: Grupo; opcion: string; corta: string; factor: number; titulo: string }[] = [
  { valor: 'camarero', opcion: 'Completa', corta: '100 %', factor: 1, titulo: 'Camareros' },
  { valor: 'reducido', opcion: 'Reducida 75 %', corta: '75 %', factor: 0.75, titulo: 'Reducidos (75%)' },
  { valor: 'prueba', opcion: 'Prueba 50 %', corta: '50 %', factor: 0.5, titulo: 'En prueba (50%)' },
]

export const PAGOS: { valor: Pago; etiqueta: string; corta: string }[] = [
  { valor: 'tr', etiqueta: 'Transferencia', corta: 'TR' },
  { valor: 'ef', etiqueta: 'Efectivo', corta: 'EF' },
  { valor: 'tr_ef', etiqueta: 'Transferencia + efectivo', corta: 'TR + EF' },
]

export function factorDe(grupo: Grupo): number {
  return GRUPOS.find((g) => g.valor === grupo)?.factor ?? 1
}

export interface PersonaPropina {
  nombre: string
  grupo: Grupo
  horas: number
  pago: Pago | null
  /** Solo con pago 'tr_ef': cuánto fue en efectivo. */
  efectivo: number | null
}

export interface Reparto {
  salon: number
  horasEquivalentes: number
  porHora: number
  /** Lo que le toca a cada persona, en el mismo orden, ya redondeado a pesos. */
  montos: number[]
}

export function calcularReparto(total: number, general: number, personas: PersonaPropina[]): Reparto {
  const salon = Math.max(0, total - general)
  const horasEquivalentes = personas.reduce(
    (suma, p) => suma + (p.horas > 0 ? p.horas * factorDe(p.grupo) : 0),
    0
  )
  const porHora = horasEquivalentes > 0 ? salon / horasEquivalentes : 0
  const montos = personas.map((p) =>
    p.horas > 0 ? Math.round(p.horas * factorDe(p.grupo) * porHora) : 0
  )
  return { salon, horasEquivalentes, porHora, montos }
}

/** "$ 48.903", igual que la calculadora vieja. */
export function pesos(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

/** 9 -> "9", 6.5 -> "6.5": como se escribían las horas en el grupo. */
export function horasTexto(h: number): string {
  return String(Math.round(h * 100) / 100)
}

/** "2026-09-23" -> "23/09/2026". */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "2026-09-23" -> "miércoles 23/09". */
export function fechaConDia(fecha: string): string {
  const dia = new Date(fecha + 'T12:00:00Z').getUTCDay()
  const [, m, d] = fecha.split('-')
  return `${DIAS_SEMANA[dia]} ${d}/${m}`
}

export function pagoTexto(pago: Pago | null, efectivo: number | null): string {
  if (!pago) return ''
  if (pago === 'tr_ef') return 'TR + EF' + (efectivo ? ' ' + pesos(efectivo) : '')
  return PAGOS.find((p) => p.valor === pago)?.corta ?? ''
}

/**
 * El mensaje para el grupo de WhatsApp, con el mismo formato que la
 * calculadora vieja más la forma de pago de cada uno.
 */
export function textoReporte(
  fecha: string,
  total: number,
  general: number,
  personas: PersonaPropina[]
): string {
  const { salon, porHora, montos } = calcularReparto(total, general, personas)
  const conMonto = personas.map((p, i) => ({ ...p, monto: montos[i] })).filter((p) => p.horas > 0)

  const bloques = GRUPOS.map((g) => {
    const delGrupo = conMonto.filter((p) => p.grupo === g.valor).sort((a, b) => b.monto - a.monto)
    if (delGrupo.length === 0) return ''
    const lineas = delGrupo.map((p) => {
      const pago = pagoTexto(p.pago, p.efectivo)
      return `• *${p.nombre}* › ${pesos(p.monto)} _(${horasTexto(p.horas)}h)_` + (pago ? ` · ${pago}` : '')
    })
    return `\n*${g.titulo}*\n` + lineas.join('\n')
  })

  return [
    `🍃 *Propinas ${fechaCorta(fecha)} — Waikiki*`,
    '',
    `💰 *Total:* ${pesos(total)}`,
    `🤝 *Salón:* ${pesos(salon)}`,
    `🍽️ *General:* ${pesos(general)}`,
    `⏱️ *Por hora:* ${pesos(porHora)}`,
    '',
    '📋 *Distribución*',
    ...bloques,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * El usuario de la app que corresponde a un nombre de la planilla de
 * propinas, para que esa persona vea lo suyo. Devuelve null ante la duda.
 *
 * Mostrarle a alguien la plata de otro es peor que no mostrarle nada, así que
 * es más estricta que la búsqueda del horario:
 * - si el nombre es igual al del usuario, vale;
 * - si no, hacen falta nombre y apellido (dos palabras o más) y que todas
 *   estén en el nombre del usuario: "Lucas Lopez" -> "Lucas Uriel López Saaied";
 * - un nombre solo ("Lucas") no alcanza: puede ser otro Lucas sin usuario;
 * - si coincide con más de un usuario, no se vincula.
 */
export function vincularUsuario(
  nombre: string,
  usuarios: { id: string; full_name: string }[]
): string | null {
  const clave = normalizarNombre(nombre)
  if (!clave) return null

  const exactos = usuarios.filter((u) => normalizarNombre(u.full_name) === clave)
  if (exactos.length === 1) return exactos[0].id
  if (exactos.length > 1) return null

  const palabras = clave.split(' ')
  if (palabras.length < 2) return null

  const candidatos = usuarios.filter((u) => {
    const delUsuario = new Set(normalizarNombre(u.full_name).split(' '))
    return palabras.every((p) => delUsuario.has(p))
  })
  return candidatos.length === 1 ? candidatos[0].id : null
}

/** Revisa lo que llega del navegador antes de guardarlo. Devuelve el error o null. */
export function validarCarga(
  fecha: string,
  total: number,
  general: number,
  personas: PersonaPropina[]
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha + 'T12:00:00Z'))) {
    return 'La fecha no es válida.'
  }
  if (!Number.isInteger(total) || total <= 0) return 'Poné la propina total del día.'
  if (!Number.isInteger(general) || general < 0) return 'La propina general no es válida.'
  if (general > total) return 'La propina general no puede ser más que la total.'

  const conHoras = personas.filter((p) => p.horas > 0)
  if (conHoras.length === 0) return 'Poné las horas de al menos una persona.'

  const vistos = new Set<string>()
  for (const p of conHoras) {
    const nombre = p.nombre.replace(/\s+/g, ' ').trim()
    if (!nombre) return 'Hay una fila con horas pero sin nombre.'
    if (!GRUPOS.some((g) => g.valor === p.grupo)) return `Revisá el grupo de ${nombre}.`
    if (!(p.horas <= 24)) return `Revisá las horas de ${nombre}: son más de 24.`
    if (Math.round(p.horas * 100) !== p.horas * 100) return `Revisá las horas de ${nombre}.`
    if (p.pago !== null && !PAGOS.some((x) => x.valor === p.pago)) return `Revisá el pago de ${nombre}.`
    if (p.pago === 'tr_ef' && p.efectivo !== null && (!Number.isInteger(p.efectivo) || p.efectivo < 0)) {
      return `Revisá el efectivo de ${nombre}.`
    }
    const clave = normalizarNombre(nombre)
    if (vistos.has(clave)) return `${nombre} está dos veces.`
    vistos.add(clave)
  }
  return null
}
