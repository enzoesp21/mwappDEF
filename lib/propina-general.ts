/**
 * Propina del resto del personal (todos menos los camareros), por quincena.
 *
 * Enzo pone el monto de la quincena y se reparte (decisión de Enzo, 02/11):
 *   - 60 % para SALÓN: Caja, Recepción, Barra, Bacha (Maestranza en Horarios),
 *     Comiss / Runners y limpieza (Zulma);
 *   - 40 % para COCINA: Cocina, Ensalada y Calienta platos. Pastelería no la
 *     nombró: va en Cocina hasta que diga otra cosa.
 * Dentro de cada parte, según las horas de la planilla en la quincena (de a
 * media hora, las del Excel). No entran los camareros (tienen la suya), los
 * encargados (Facundo Núñez, Enzo) ni los administrativos (Romina, Germán).
 *
 * De qué parte es cada uno, en este orden: lo que fijó un encargado a mano
 * (planilla_empleados.grupo_propina_general); el sector de Horarios donde más
 * turnos tuvo en la quincena; su cargo de la planilla; el puesto de su usuario
 * de la app (los recién llegados). Si nada lo dice, queda
 * "sin sector" y no cobra hasta que lo ubiquen: es plata, ante la duda nada.
 * Todo es puro: no lee la base ni la hora.
 */

import { normalizarNombre, sumarDias, tipoCelda, type SectorHorario } from '@/lib/horarios'

/** Lo que se puede fijar a mano. */
export type GrupoGeneral = 'salon' | 'cocina' | 'afuera'
/** Dónde queda cada uno para el reparto. */
export type Ubicacion = GrupoGeneral | 'camarero' | 'sin_sector'

export const PARTE_SALON = 0.6

export const NOMBRE_GRUPO: Record<Ubicacion, string> = {
  salon: 'Salón',
  cocina: 'Cocina',
  afuera: 'Afuera',
  camarero: 'Camareros',
  sin_sector: 'Sin sector',
}

const sinTildes = (s: string) => normalizarNombre(s).toUpperCase()

/** Qué parte le toca a un sector de Horarios; null si no se sabe. */
export function grupoDeSector(sector: string): 'salon' | 'cocina' | 'camarero' | null {
  const s = sinTildes(sector)
  if (/CAMARER/.test(s)) return 'camarero'
  if (/COCINA|ENSALADA|CALIENTA|PASTELER/.test(s)) return 'cocina'
  if (/CAJA|RECEPCI|BARRA|MAESTRANZA|BACHA|COMIS|RUNNER|LIMPIEZA/.test(s)) return 'salon'
  return null
}

/** Qué parte le toca por el cargo de la planilla; null si no se sabe. */
export function grupoDeCargo(cargo: string | null): Ubicacion | null {
  const c = sinTildes(cargo ?? '')
  if (!c) return null
  if (/^(MOZO|MOZA|CAMARERO|CAMARERA)S?$/.test(c)) return 'camarero'
  if (/ENCARGAD|ADMINISTRATIV/.test(c)) return 'afuera'
  if (/LIMPIEZA|LAVACOPAS|BACHER|MOSTRADOR|BARRA|BARMAN|CAJER|RECEPCION|PORTER|PEON/.test(c)) return 'salon'
  if (/COCIN|PARTIDA|FIAMBR|PASTELER|PARRILL/.test(c)) return 'cocina'
  return null
}

export interface SemanaHorarios {
  /** El lunes, "2026-10-26". */
  week_start: string
  sectores: SectorHorario[]
}

/**
 * El sector de Horarios de alguien en la quincena: donde más turnos tuvo entre
 * esas fechas. Si figura en Horarios pero sin turnos esos días, el primero en
 * que figura. null si no figura.
 */
export function sectorDeLaQuincena(nombresHorario: string[], semanas: SemanaHorarios[], desde: string, hasta: string): string | null {
  const claves = new Set(nombresHorario.map(normalizarNombre).filter(Boolean))
  if (claves.size === 0) return null
  const turnos = new Map<string, number>()
  let primero: string | null = null
  for (const semana of [...semanas].sort((a, b) => a.week_start.localeCompare(b.week_start))) {
    for (const sector of semana.sectores) {
      const nombreSector = sector.nombre.trim()
      for (const persona of sector.personas) {
        if (!claves.has(normalizarNombre(persona.nombre ?? ''))) continue
        primero ??= nombreSector
        ;(persona.dias ?? []).forEach((celda, i) => {
          const fecha = sumarDias(semana.week_start, i)
          if (fecha >= desde && fecha <= hasta && tipoCelda(celda ?? '') === 'turno') {
            turnos.set(nombreSector, (turnos.get(nombreSector) ?? 0) + 1)
          }
        })
      }
    }
  }
  let mejor: string | null = null
  turnos.forEach((n, sector) => {
    if (!mejor || n > (turnos.get(mejor) ?? 0)) mejor = sector
  })
  return mejor ?? primero
}

export interface Ubicado {
  ubicacion: Ubicacion
  /** Por qué: lo fijó un encargado, Horarios, el cargo o el puesto de su usuario. */
  por: 'a mano' | 'Horarios' | 'cargo' | 'puesto' | null
}

/** Qué parte le toca por el puesto de su usuario de la app; null si no se sabe. */
export function grupoDePuesto(puesto: string | null | undefined): Ubicacion | null {
  if (puesto === 'Mozos') return 'camarero'
  if (puesto === 'Caja' || puesto === 'Recepción' || puesto === 'Barra' || puesto === 'Commis') return 'salon'
  if (puesto === 'Pastelería') return 'cocina'
  return null
}

/**
 * Dónde va alguien: lo fijado a mano, su sector de Horarios, su cargo de la
 * planilla o el puesto de su usuario (los nuevos que todavía no tienen sector
 * ni cargo); si nada lo dice, sin sector.
 */
export function ubicar(p: { manual: GrupoGeneral | null; sector: string | null; cargo: string | null; puesto?: string | null }): Ubicado {
  if (p.manual) return { ubicacion: p.manual, por: 'a mano' }
  const porSector = p.sector ? grupoDeSector(p.sector) : null
  if (porSector) return { ubicacion: porSector, por: 'Horarios' }
  const porCargo = grupoDeCargo(p.cargo)
  if (porCargo) return { ubicacion: porCargo, por: 'cargo' }
  const porPuesto = grupoDePuesto(p.puesto)
  if (porPuesto) return { ubicacion: porPuesto, por: 'puesto' }
  return { ubicacion: 'sin_sector', por: null }
}

/**
 * Reparte un pozo en pesos enteros según las horas, sin que se pierda ni sobre
 * un peso por el redondeo: cada uno recibe la parte entera de lo suyo y los
 * pesos que faltan van a quienes tenían más centavos (método del mayor resto).
 */
export function repartirPozo(pozo: number, horas: { id: string; horas: number }[]): Map<string, number> {
  const conHoras = horas.filter((h) => h.horas > 0)
  const total = conHoras.reduce((s, h) => s + h.horas, 0)
  const montos = new Map<string, number>()
  if (total <= 0 || pozo <= 0) return montos
  const exactos = conHoras.map((h) => ({ id: h.id, exacto: (pozo * h.horas) / total }))
  for (const e of exactos) montos.set(e.id, Math.floor(e.exacto))
  let faltan = pozo - Array.from(montos.values()).reduce((s, m) => s + m, 0)
  const porResto = [...exactos].sort((a, b) => b.exacto - Math.floor(b.exacto) - (a.exacto - Math.floor(a.exacto)))
  for (let i = 0; faltan > 0 && i < porResto.length; i++, faltan--) {
    montos.set(porResto[i].id, (montos.get(porResto[i].id) ?? 0) + 1)
  }
  return montos
}

export interface ParteDelReparto {
  pozo: number
  horas: number
  /** Pesos por hora de esa parte (con decimales). */
  porHora: number
  montos: Map<string, number>
}

/** El monto de la quincena: 60 % Salón y 40 % Cocina, cada parte según horas. */
export function repartirPropinaGeneral(
  monto: number,
  personas: { id: string; horas: number; ubicacion: Ubicacion }[]
): { salon: ParteDelReparto; cocina: ParteDelReparto } {
  const total = Math.max(0, Math.round(monto))
  const pozoSalon = Math.round(total * PARTE_SALON)
  const parte = (grupo: 'salon' | 'cocina', pozo: number): ParteDelReparto => {
    const delGrupo = personas.filter((p) => p.ubicacion === grupo && p.horas > 0)
    const horas = delGrupo.reduce((s, p) => s + p.horas, 0)
    return { pozo, horas, porHora: horas > 0 ? pozo / horas : 0, montos: repartirPozo(pozo, delGrupo) }
  }
  return { salon: parte('salon', pozoSalon), cocina: parte('cocina', total - pozoSalon) }
}

/** La quincena: 1 (del 1 al 15) o 2 (del 16 a fin de mes), en fechas. */
export function fechasDeQuincena(mes: string, q: 1 | 2, diasDelMes: number): { desde: string; hasta: string } {
  return q === 1
    ? { desde: `${mes}-01`, hasta: `${mes}-15` }
    : { desde: `${mes}-16`, hasta: `${mes}-${String(diasDelMes).padStart(2, '0')}` }
}

/**
 * La última quincena que ya terminó, para abrir la pantalla en esa: del 16 en
 * adelante, la primera de este mes; antes, la segunda del mes anterior.
 */
export function quincenaPorDefecto(hoy: string): { mes: string; q: 1 | 2 } {
  if (Number(hoy.slice(8)) >= 16) return { mes: hoy.slice(0, 7), q: 1 }
  const anterior = sumarDias(`${hoy.slice(0, 7)}-01`, -1)
  return { mes: anterior.slice(0, 7), q: 2 }
}
