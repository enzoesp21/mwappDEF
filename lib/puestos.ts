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
  { valor: 'Mozos',           nombre: 'Mozos y Runners',     icono: ConciergeBell, desde: '#6e8f7a', hasta: '#3d5747' },
  { valor: 'Commis',          nombre: 'Comisses',            icono: HandPlatter,   desde: '#7b9a86', hasta: '#4a6455' },
  { valor: 'Limpieza',        nombre: 'Limpieza',            icono: Sparkles,      desde: '#8a9e93', hasta: '#556860' },
  { valor: 'Bacha',           nombre: 'Bacha',               icono: Droplets,      desde: '#6f8b93', hasta: '#3f545a' },
  { valor: 'Caja',            nombre: 'Caja',                icono: Calculator,    desde: '#95916f', hasta: '#5c5940' },
  { valor: 'Cocina',          nombre: 'Cocina',              icono: ChefHat,       desde: '#a08464', hasta: '#66503a' },
  { valor: 'Ensaladas',       nombre: 'Ensaladas y Postres', icono: Salad,         desde: '#7f9b6a', hasta: '#4c613d' },
  { valor: 'Barra',           nombre: 'Barra',               icono: Martini,       desde: '#8b7d9b', hasta: '#544a61' },
  { valor: 'Recepción',       nombre: 'Recepción',           icono: BookUser,      desde: '#94867a', hasta: '#5b5048' },
  { valor: 'Calienta Platos', nombre: 'Calientaplatos',      icono: Flame,         desde: '#a37a63', hasta: '#66483a' },
  { valor: 'Pastelería',      nombre: 'Pastelería',          icono: CakeSlice,     desde: '#a8828d', hasta: '#684e57' },
]

/** Busca por el valor guardado. Tolera el puesto escrito sin tilde. */
export function buscarPuesto(valor: string): PuestoInfo | undefined {
  const normalizar = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const objetivo = normalizar(valor)
  return PUESTOS_INFO.find((p) => normalizar(p.valor) === objetivo)
}
