// Calendario de eventos y mesas personalizadas (Enzo, 11/11): lo que se
// revisa antes de guardar, el armado del mes y qué salón está ocupado. Es puro
// (no lee la base ni la hora); lo de la base está en lib/eventos-datos.ts.

import { DIAS, lunesDe, normalizarNombre, sumarDias } from '@/lib/horarios'

export type TipoEvento = 'mesa' | 'evento'
export type Comida = 'desayuno' | 'almuerzo' | 'merienda' | 'cena'

export interface Evento {
  id: string
  fecha: string // AAAA-MM-DD
  tipo: TipoEvento
  comida: Comida
  hora: string | null // HH:MM
  horaFin: string | null
  nombre: string
  pax: number | null
  /** '' si todavía no se sabe (una mesa puede ir sin salón: "Salón a definir"). */
  salon: string
  notas: string | null
}

export type DatosEvento = Omit<Evento, 'id'> & { id?: string | null }

export const TIPOS: { valor: TipoEvento; texto: string; corto: string }[] = [
  { valor: 'mesa', texto: 'Mesa personalizada', corto: 'Mesa' },
  { valor: 'evento', texto: 'Evento privado', corto: 'Evento' },
]

export const COMIDAS: { valor: Comida; texto: string }[] = [
  { valor: 'desayuno', texto: 'Desayuno' },
  { valor: 'almuerzo', texto: 'Almuerzo' },
  { valor: 'merienda', texto: 'Merienda' },
  { valor: 'cena', texto: 'Cena' },
]

/** Los salones de Waikiki que nombran las guías. Se puede escribir otro. */
export const SALONES = ['Salón principal', 'Ala Wai']

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function textoComida(c: Comida): string {
  return COMIDAS.find((x) => x.valor === c)?.texto ?? c
}

export function textoTipo(t: TipoEvento): string {
  return TIPOS.find((x) => x.valor === t)?.texto ?? t
}

/** Una fila de la tabla `eventos` como la usa la pantalla ("13:00:00" -> "13:00"). */
export function leerEvento(fila: Record<string, unknown>): Evento {
  const hora = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 5) : null)
  return {
    id: String(fila.id),
    fecha: String(fila.fecha),
    tipo: fila.tipo === 'evento' ? 'evento' : 'mesa',
    comida: (COMIDAS.some((c) => c.valor === fila.comida) ? fila.comida : 'almuerzo') as Comida,
    hora: hora(fila.hora),
    horaFin: hora(fila.hora_fin),
    nombre: String(fila.nombre ?? ''),
    pax: typeof fila.pax === 'number' ? fila.pax : fila.pax == null ? null : Number(fila.pax),
    salon: String(fila.salon ?? ''),
    notas: typeof fila.notas === 'string' && fila.notas ? fila.notas : null,
  }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Lo que se revisa antes de guardar (la base lo vuelve a frenar). Devuelve los
 * datos limpios, o el error para mostrar.
 */
export function validarEvento(
  d: DatosEvento
): { ok: true; datos: DatosEvento } | { ok: false; error: string } {
  const nombre = (d.nombre ?? '').trim().replace(/\s+/g, ' ')
  const salon = (d.salon ?? '').trim().replace(/\s+/g, ' ')
  const notas = (d.notas ?? '').trim()
  const hora = d.hora || null
  const horaFin = d.horaFin || null

  if (!FECHA.test(d.fecha ?? '') || isNaN(Date.parse(d.fecha + 'T12:00:00Z'))) return { ok: false, error: 'Elegí la fecha.' }
  if (d.tipo !== 'mesa' && d.tipo !== 'evento') return { ok: false, error: 'Elegí si es una mesa personalizada o un evento privado.' }
  if (!COMIDAS.some((c) => c.valor === d.comida)) return { ok: false, error: 'Elegí la comida: desayuno, almuerzo, merienda o cena.' }
  if (!nombre) return { ok: false, error: 'Poné un nombre (a nombre de quién está o qué evento es).' }
  if (nombre.length > 120) return { ok: false, error: 'El nombre es muy largo (hasta 120 letras).' }
  // El evento privado ocupa un salón: tiene que decir cuál. La mesa puede quedar a definir.
  if (!salon && d.tipo === 'evento') return { ok: false, error: 'Elegí el salón: el evento privado lo ocupa.' }
  if (salon.length > 60) return { ok: false, error: 'El nombre del salón es muy largo.' }
  if (hora && !HORA.test(hora)) return { ok: false, error: 'La hora no es válida.' }
  if (horaFin && !HORA.test(horaFin)) return { ok: false, error: 'La hora de fin no es válida.' }
  if (horaFin && !hora) return { ok: false, error: 'Poné desde qué hora, además de hasta cuándo.' }
  if (horaFin && horaFin === hora) return { ok: false, error: 'La hora de fin es igual a la de inicio.' }
  if (d.pax !== null && (!Number.isInteger(d.pax) || d.pax < 1 || d.pax > 2000)) {
    return { ok: false, error: 'La cantidad de personas tiene que ser un número entre 1 y 2000.' }
  }
  if (d.tipo === 'mesa' && d.pax === null) return { ok: false, error: 'Poné cuántas personas son.' }
  if (notas.length > 2000) return { ok: false, error: 'Los detalles son muy largos (hasta 2000 letras).' }

  return {
    ok: true,
    datos: { ...d, nombre, salon, notas: notas || null, hora, horaFin },
  }
}

const ORDEN_COMIDA: Record<Comida, number> = { desayuno: 0, almuerzo: 1, merienda: 2, cena: 3 }

/** Por fecha, después por comida y por hora. */
export function ordenarEventos(eventos: Evento[]): Evento[] {
  return [...eventos].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      ORDEN_COMIDA[a.comida] - ORDEN_COMIDA[b.comida] ||
      (a.hora ?? '99').localeCompare(b.hora ?? '99') ||
      a.nombre.localeCompare(b.nombre)
  )
}

export function eventosPorDia(eventos: Evento[]): Map<string, Evento[]> {
  const mapa = new Map<string, Evento[]>()
  for (const e of ordenarEventos(eventos)) mapa.set(e.fecha, [...(mapa.get(e.fecha) ?? []), e])
  return mapa
}

/** "2026-11" si es un mes válido; si no, null. */
export function leerMes(texto: string | null | undefined): string | null {
  if (!texto || !/^\d{4}-(0[1-9]|1[0-2])$/.test(texto)) return null
  return texto
}

export function mesDe(fecha: string): string {
  return fecha.slice(0, 7)
}

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** El primer y el último día del mes. */
export function limitesDelMes(mes: string): { desde: string; hasta: string } {
  const desde = `${mes}-01`
  return { desde, hasta: sumarDias(`${sumarMeses(mes, 1)}-01`, -1) }
}

/** "Noviembre 2026". */
export function nombreDelMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const nombre = MESES[m - 1]
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${a}`
}

/**
 * Las semanas del mes, de lunes a domingo, para dibujar el calendario. Los
 * días de otros meses van como null.
 */
export function grillaDelMes(mes: string): (string | null)[][] {
  const { desde, hasta } = limitesDelMes(mes)
  const semanas: (string | null)[][] = []
  for (let lunes = lunesDe(desde); lunes <= hasta; lunes = sumarDias(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => {
      const f = sumarDias(lunes, i)
      return mesDe(f) === mes ? f : null
    }))
  }
  return semanas
}

/** "Sábado 21 de noviembre". */
export function fechaLarga(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  return `${DIAS[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`
}

/** "13:00", "21:00 a 04:00" o "" si no tiene hora. */
export function textoHorario(e: Pick<Evento, 'hora' | 'horaFin'>): string {
  if (!e.hora) return ''
  return e.horaFin ? `${e.hora} a ${e.horaFin}` : e.hora
}

/** El salón, o "Salón a definir" si todavía no se sabe. */
export function textoSalon(salon: string): string {
  return salon.trim() || 'Salón a definir'
}

export function mismoSalon(a: string, b: string): boolean {
  return normalizarNombre(a) === normalizarNombre(b)
}

/**
 * Los eventos privados que ese día ocupan ese salón (sin contar el que se está
 * editando). Sirve para avisar antes de cargar otra cosa ahí.
 */
export function ocupanElSalon(eventos: Evento[], fecha: string, salon: string, sinContar?: string | null): Evento[] {
  if (!salon.trim()) return []
  return ordenarEventos(
    eventos.filter((e) => e.tipo === 'evento' && e.fecha === fecha && e.id !== sinContar && mismoSalon(e.salon, salon))
  )
}

/** Los salones ocupados por un evento privado ese día, sin repetir. */
export function salonesOcupados(eventos: Evento[], fecha: string): string[] {
  const vistos: string[] = []
  for (const e of ordenarEventos(eventos)) {
    if (e.tipo === 'evento' && e.fecha === fecha && !vistos.some((s) => mismoSalon(s, e.salon))) vistos.push(e.salon)
  }
  return vistos
}

/**
 * La marquita de un día en el editor de horarios (pedido de Enzo, 12/11: que
 * Facu vea al armar la semana que ese día hay algo). Un evento privado manda:
 * ocupa el salón. null si ese día no hay nada.
 */
export function marcaDelDia(eventosDelDia: Evento[]): { texto: string; ocupa: boolean; detalle: string } | null {
  if (eventosDelDia.length === 0) return null
  const lista = ordenarEventos(eventosDelDia)
  const privados = lista.filter((e) => e.tipo === 'evento').length
  const mesas = lista.length - privados
  const partes = [
    privados ? `${privados} evento${privados === 1 ? '' : 's'}` : '',
    mesas ? `${mesas} mesa${mesas === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  const pax = lista.reduce((t, e) => t + (e.pax ?? 0), 0)
  return {
    // Corto, para que entre en la columna del día: el evento privado manda.
    texto: privados ? (privados === 1 ? 'Evento' : `${privados} eventos`) : partes[0],
    ocupa: privados > 0,
    detalle:
      partes.join(' + ') +
      ': ' +
      lista
        .map((e) => `${e.nombre} (${[textoComida(e.comida).toLowerCase(), textoHorario(e), e.pax !== null ? `${e.pax} pax` : '', e.salon].filter(Boolean).join(', ')})`)
        .join(' · ') + (pax ? ` — ${pax} pax en total` : ''),
  }
}

/** Los salones para elegir: los conocidos y los que ya se usaron. */
export function salonesParaElegir(eventos: Evento[]): string[] {
  const lista = [...SALONES]
  for (const e of eventos) if (e.salon.trim() && !lista.some((s) => mismoSalon(s, e.salon))) lista.push(e.salon)
  return lista
}
