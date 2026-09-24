import { esNoche, tipoCelda } from '@/lib/horarios'

/**
 * Color de cada celda según lo que dice. Sirve para leer la planilla de un
 * vistazo: quién está libre, de vacaciones o hace noche.
 */
export function claseCelda(valor: string, indiceDia: number): string {
  switch (tipoCelda(valor)) {
    case 'vacio':
      return 'bg-transparent text-brand-muted'
    case 'libre':
      return 'bg-brand-dark/50 text-brand-muted'
    case 'vacaciones':
      return 'bg-sky-100 text-sky-800'
    case 'licencia':
      return 'bg-amber-100 text-amber-800'
    case 'otro_lugar':
      return 'bg-violet-100 text-violet-800'
    case 'turno':
      return esNoche(valor, indiceDia)
        ? 'bg-brand-accent/20 text-brand-text font-semibold'
        : 'bg-brand-card text-brand-text'
  }
}

/** Fondo de las columnas de fin de semana, como en la planilla. */
export function claseColumna(indiceDia: number): string {
  return indiceDia >= 5 ? 'bg-brand-accent/5' : ''
}

export const REFERENCIAS = [
  { etiqueta: 'Turno', clase: 'bg-brand-card' },
  { etiqueta: 'Hace noche', clase: 'bg-brand-accent/20' },
  { etiqueta: 'Libre (X)', clase: 'bg-brand-dark/50' },
  { etiqueta: 'Vacaciones', clase: 'bg-sky-100' },
  { etiqueta: 'Licencia', clase: 'bg-amber-100' },
  { etiqueta: 'Mirador 9', clase: 'bg-violet-100' },
]
