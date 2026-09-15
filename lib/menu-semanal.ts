/**
 * Menú de personal, en ciclo de dos semanas que se alterna solo.
 *
 * El ancla es el lunes 14/9/2026, que es Semana 2. A partir de ahí la app
 * calcula sola qué semana toca, sin que nadie tenga que tocar nada.
 *
 * Los días van por número: 0 domingo, 1 lunes ... 6 sábado. Viernes y sábado
 * tienen almuerzo y cena; el resto, solo almuerzo.
 */

export interface Plato {
  principal: string
  vegetariano?: string
  /** Aclaración corta, cuando el cartel dice algo más. */
  nota?: string
}

export interface MenuDia {
  almuerzo?: Plato
  cena?: Plato
}

export type MenuSemana = Record<number, MenuDia>

const SEMANA_1: MenuSemana = {
  1: {
    almuerzo: {
      principal: 'Merluza a la romana con puré de papas',
      vegetariano: 'Zapallitos rellenos gratinados, con ensalada de tomate, zanahoria y huevo',
    },
  },
  2: {
    almuerzo: {
      principal: 'Lasaña con salsa mixta',
      vegetariano: 'Lasaña de verduras',
    },
  },
  3: {
    almuerzo: {
      principal: 'Guiso de mostacholes con carne y pollo',
      vegetariano: 'Guiso de mostacholes con vegetales',
    },
  },
  4: {
    almuerzo: {
      principal: 'Ñoquis parisienne',
      vegetariano: 'Ñoquis con crema de hongos o pesto',
    },
  },
  5: {
    almuerzo: { principal: 'Pizza variada', nota: '3 o 4 porciones' },
    cena: { principal: 'Tacos', nota: 'Se adapta a la opción vegetariana' },
  },
  6: {
    almuerzo: {
      principal: 'Pata muslo con crema de verdeo o a la mostaza, con puré o papas fritas',
      vegetariano: 'Ensalada Caesar, con huevo en lugar de pollo',
    },
    cena: {
      principal: 'Suprema napolitana',
      vegetariano: 'Milanesa napolitana de berenjena con puré de papas',
    },
  },
  0: {
    almuerzo: { principal: 'Ravioles con salsa mixta' },
  },
}

const SEMANA_2: MenuSemana = {
  1: {
    almuerzo: {
      principal: 'Hamburguesa con papas fritas',
      vegetariano: 'Hamburguesa vegetariana con papas',
    },
  },
  2: {
    almuerzo: {
      principal: 'Guiso de lentejas con carne y chorizo colorado',
      vegetariano: 'Guiso de lentejas sin carne ni chorizo colorado',
    },
  },
  3: {
    almuerzo: {
      principal: 'Tortilla de papas con ensalada primavera',
      vegetariano: 'Tortilla de espinaca o acelga con ensalada primavera',
    },
  },
  4: {
    almuerzo: {
      principal: 'Milanesa de pollo con puré de papas',
      vegetariano: 'Milanesa de berenjena con puré mixto',
    },
  },
  5: {
    almuerzo: {
      principal: 'Pastel de papa y carne',
      vegetariano: 'Pastel de papa relleno de lentejas y soja, o de verduras salteadas',
    },
    cena: { principal: 'Tacos' },
  },
  6: {
    almuerzo: {
      principal: 'Cintas caseras con salsa bolognesa',
      vegetariano: 'Cintas caseras con pesto o salsa mixta',
    },
    cena: {
      principal: 'Suprema napolitana',
      vegetariano: 'Canelones de verdura y ricota con salsa mixta',
    },
  },
  0: {
    almuerzo: {
      principal: 'Pollo al horno condimentado, con puré o papas fritas',
      vegetariano: 'Sándwich de queso tybo, rúcula, tomate y huevo, con papas',
    },
  },
}

/** Lunes de referencia del ciclo. Esa semana es la Semana 2. */
const ANCLA_LUNES = '2026-09-14'

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000

/** El lunes de la semana a la que pertenece esa fecha. */
function lunesDe(fechaISO: string): Date {
  const d = new Date(fechaISO + 'T00:00:00Z')
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7))
  return d
}

/** Si esa fecha cae en Semana 1 o en Semana 2 del ciclo. */
export function semanaDelCiclo(fechaISO: string): 1 | 2 {
  const diff = Math.round(
    (lunesDe(fechaISO).getTime() - lunesDe(ANCLA_LUNES).getTime()) / UNA_SEMANA_MS
  )
  // El ancla es Semana 2; de ahí en más se van alternando.
  return (((diff % 2) + 2) % 2) === 0 ? 2 : 1
}

export function menuDeLaSemana(fechaISO: string): MenuSemana {
  return semanaDelCiclo(fechaISO) === 1 ? SEMANA_1 : SEMANA_2
}

/** Qué se come ese día, en ese turno. */
export function platoDe(fechaISO: string, turno: 'almuerzo' | 'cena'): Plato | null {
  const dow = new Date(fechaISO + 'T00:00:00Z').getUTCDay()
  return menuDeLaSemana(fechaISO)[dow]?.[turno] ?? null
}

/** El menú completo de esa semana, día por día, listo para mostrar. */
export function menuPorFecha(fechasISO: string[]): Record<string, MenuDia> {
  const out: Record<string, MenuDia> = {}
  for (const f of fechasISO) {
    const dow = new Date(f + 'T00:00:00Z').getUTCDay()
    out[f] = menuDeLaSemana(f)[dow] ?? {}
  }
  return out
}

/** Fecha de hoy en Argentina, que no tiene horario de verano. */
export function hoyEnArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0]
}
