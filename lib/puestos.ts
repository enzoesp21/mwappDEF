import {
  ConciergeBell,
  HandPlatter,
  Sparkles,
  Droplets,
  Calculator,
  ChefHat,
  Salad,
  Martini,
  BookUser,
  Flame,
  CakeSlice,
  type LucideIcon,
} from 'lucide-react'

/**
 * Los puestos como se muestran en pantalla.
 *
 * `valor` es lo que está guardado en profiles.puesto y en guide_paths.puesto,
 * y no se toca: cambiarlo dejaría a la gente sin sus guías. `nombre` es solo
 * la etiqueta visible, que puede leerse distinto y más completa.
 *
 * El orden de esta lista es el orden en que aparecen las tarjetas.
 *
 * Los colores son de la paleta de miradorwaikiki.com: verdes, el verde azulado
 * del balneario, el marrón del hotel y el azul de Hula Kai.
 */
export interface PuestoInfo {
  valor: string
  nombre: string
  icono: LucideIcon
  /** Degradado de la tarjeta. */
  desde: string
  hasta: string
}

export const PUESTOS_INFO: PuestoInfo[] = [
  { valor: 'Mozos',           nombre: 'Mozos y Runners',     icono: ConciergeBell, desde: '#5f7d6a', hasta: '#344a3d' },
  { valor: 'Commis',          nombre: 'Comisses',            icono: HandPlatter,   desde: '#6f8a77', hasta: '#3e5446' },
  { valor: 'Limpieza',        nombre: 'Limpieza',            icono: Sparkles,      desde: '#7b8c83', hasta: '#47574f' },
  { valor: 'Bacha',           nombre: 'Bacha',               icono: Droplets,      desde: '#4f7a7e', hasta: '#2f4c50' },
  { valor: 'Caja',            nombre: 'Caja',                icono: Calculator,    desde: '#8a7653', hasta: '#5a4a30' },
  { valor: 'Cocina',          nombre: 'Cocina',              icono: ChefHat,       desde: '#8c6a4a', hasta: '#57402b' },
  { valor: 'Ensaladas',       nombre: 'Ensaladas y Postres', icono: Salad,         desde: '#6f8a5a', hasta: '#43573a' },
  { valor: 'Barra',           nombre: 'Barra',               icono: Martini,       desde: '#41687f', hasta: '#284456' },
  { valor: 'Recepción',       nombre: 'Recepción',           icono: BookUser,      desde: '#7d6e5c', hasta: '#4d4337' },
  { valor: 'Calienta Platos', nombre: 'Calientaplatos',      icono: Flame,         desde: '#8f6550', hasta: '#58392c' },
  { valor: 'Pastelería',      nombre: 'Pastelería',          icono: CakeSlice,     desde: '#94786a', hasta: '#5c463d' },
]

/** Busca por el valor guardado. Tolera el puesto escrito sin tilde. */
export function buscarPuesto(valor: string): PuestoInfo | undefined {
  const normalizar = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const objetivo = normalizar(valor)
  return PUESTOS_INFO.find((p) => normalizar(p.valor) === objetivo)
}
