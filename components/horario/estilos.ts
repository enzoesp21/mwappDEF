import { esNoche, tipoCelda } from '@/lib/horarios'

/**
 * Color de cada celda según lo que dice. Sirve para leer la planilla de un
 * vistazo: quién está libre, de vacaciones o hace noche.
 */
export function claseCelda(valor: string, finde = false, hayNoche = false): string {
  switch (tipoCelda(valor)) {
    case 'vacio':
      return finde ? 'bg-[#d6e7cf]/60 text-brand-muted' : 'bg-transparent text-brand-muted'
    case 'libre':
      return 'bg-brand-dark/50 text-brand-muted'
    case 'vacaciones':
      return 'bg-sky-100 text-sky-800'
    case 'licencia':
      return 'bg-amber-100 text-amber-800'
    case 'otro_lugar':
      return 'bg-violet-100 text-violet-800'
    case 'turno':
      if (esNoche(valor, hayNoche)) return 'bg-brand-accent/20 text-brand-text font-semibold'
      // Mismo verde que el fin de semana del PDF y de la planilla de Excel.
      return finde ? 'bg-[#d6e7cf] text-brand-text' : 'bg-brand-card text-brand-text'
  }
}

/** Fondo de las columnas de fin de semana y feriados, como en la planilla. */
export function claseColumna(finde: boolean): string {
  return finde ? 'bg-[#d6e7cf]/40' : ''
}

/** Encabezado del día: verde lleno en fin de semana y feriado, como en el PDF. */
export function claseEncabezadoDia(finde: boolean): string {
  return finde ? 'bg-brand-accent text-white' : 'text-brand-muted'
}

export const REFERENCIAS = [
  { etiqueta: 'Turno', clase: 'bg-brand-card' },
  { etiqueta: 'Finde o feriado', clase: 'bg-[#d6e7cf]' },
  { etiqueta: 'Hace noche', clase: 'bg-brand-accent/20' },
  { etiqueta: 'Libre (X)', clase: 'bg-brand-dark/50' },
  { etiqueta: 'Vacaciones', clase: 'bg-sky-100' },
  { etiqueta: 'Licencia', clase: 'bg-amber-100' },
  { etiqueta: 'Mirador 9', clase: 'bg-violet-100' },
]
