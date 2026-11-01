// Equivalencias del reloj: a qué empleado de la planilla puede corresponder un
// nombre de CrossChex. Regla del pedido: coinciden al menos 2 palabras, iguales
// o con un prefijo común de más de 3 letras; mayúsculas y tildes no importan.
// Son solo sugerencias: asociar lo decide un admin con un toque.

/** En CrossChex a veces ponen el sector como apellido ("LURDES COCINA"): no cuenta. */
const SECTORES = new Set(['COCINA', 'BARRA', 'CAJA', 'SALON', 'MOZO', 'MOZOS', 'RECEPCION', 'LIMPIEZA', 'BACHA', 'CAMAREROS'])

/** Las palabras de un nombre, en mayúscula y sin tildes. */
export function palabras(nombre: string): string[] {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((p) => p.length >= 2)
}

/** El nombre del reloj sin el sector usado de apellido: "LURDES COCINA" → "LURDES". */
export function sinSector(nombre: string): string {
  const propias = nombre.trim().split(/\s+/).filter((p) => !SECTORES.has(palabras(p)[0] ?? ''))
  return (propias.length > 0 ? propias.join(' ') : nombre.trim()).toUpperCase()
}

function prefijoComun(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

function parecidas(a: string, b: string): boolean {
  return a === b || prefijoComun(a, b) > 3
}

/** Cuántas palabras del primero tienen pareja (distinta) en el segundo. */
export function coincidencias(de: string[], en: string[]): number {
  const libres = [...en]
  let n = 0
  for (const p of de) {
    const i = libres.findIndex((q) => parecidas(p, q))
    if (i >= 0) {
      n++
      libres.splice(i, 1)
    }
  }
  return n
}

export interface EmpleadoParaSugerir {
  id: string
  nombre: string
  /** Si ya tiene algún número del reloj asociado. */
  conReloj: boolean
}

export interface Candidato {
  id: string
  nombre: string
  /** true: coincide un solo nombre (ej. "ALMA"), hay que mirarlo con más cuidado. */
  dudoso: boolean
}

/**
 * Hasta 3 empleados que pueden ser esa persona del reloj, el más parecido
 * primero. Con dos palabras o más, la regla del pedido. Con una sola ("ALMA",
 * "LAUREANO"), solo quien tenga esa palabra en el nombre y todavía no tenga
 * número del reloj: queda marcado como dudoso.
 */
export function sugerirEmpleados(nombreReloj: string, empleados: EmpleadoParaSugerir[]): Candidato[] {
  const propias = palabras(nombreReloj).filter((p) => !SECTORES.has(p))
  if (propias.length === 0) return []

  const fuertes = empleados
    .map((e) => ({ e, n: coincidencias(propias, palabras(e.nombre)) }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n || Number(a.e.conReloj) - Number(b.e.conReloj))
  if (fuertes.length > 0) return fuertes.slice(0, 3).map(({ e }) => ({ id: e.id, nombre: e.nombre, dudoso: false }))

  if (propias.length === 1) {
    return empleados
      .filter((e) => !e.conReloj && palabras(e.nombre).includes(propias[0]))
      .slice(0, 3)
      .map((e) => ({ id: e.id, nombre: e.nombre, dudoso: true }))
  }
  return []
}

// ---------------------------------------------------------------------------
// Propinas: las horas de la planilla para cada nombre de la lista del día
// ---------------------------------------------------------------------------

export interface HorasDelReloj {
  nombre: string
  profileId: string | null
  nombresHorario: string[]
  horas: number
}

const igual = (a: string) => palabras(a).join(' ')

/**
 * Para cada nombre de la lista de propinas, las horas de ese día según la
 * planilla. Primero por su usuario de la app; después por nombre igual (el de
 * la planilla o el de Horarios); por último, con la regla de las 2 palabras.
 * Ante la duda (dos posibles) no pone nada: es plata.
 */
export function emparejarHoras(
  lista: { clave: string; nombre: string; usuarioId: string | null }[],
  delReloj: HorasDelReloj[]
): { horas: Map<string, number>; sinHoras: string[] } {
  const usadas = new Set<number>()
  const horas = new Map<string, number>()
  const sinHoras: string[] = []
  const libres = () => delReloj.map((e, i) => ({ e, i })).filter((x) => !usadas.has(x.i))
  const unico = (candidatos: { e: HorasDelReloj; i: number }[]) => (candidatos.length === 1 ? candidatos[0] : null)

  for (const fila of lista) {
    if (!fila.nombre.trim()) continue
    const buscado = igual(fila.nombre)
    const nombres = (e: HorasDelReloj) => [e.nombre, ...e.nombresHorario]
    const elegido =
      (fila.usuarioId ? unico(libres().filter((x) => x.e.profileId === fila.usuarioId)) : null) ??
      unico(libres().filter((x) => nombres(x.e).some((n) => igual(n) === buscado))) ??
      unico(libres().filter((x) => nombres(x.e).some((n) => coincidencias(palabras(fila.nombre), palabras(n)) >= 2)))
    if (elegido) {
      usadas.add(elegido.i)
      horas.set(fila.clave, elegido.e.horas)
    } else {
      sinHoras.push(fila.nombre.trim())
    }
  }
  return { horas, sinHoras }
}
