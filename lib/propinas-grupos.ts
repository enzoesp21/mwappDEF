/**
 * Porcentaje de cada mozo: quién cobra la hora al 100, al 75, al 50 o al 25 %,
 * y quién no es mozo.
 *
 * Un encargado (Enzo o Facu) lo pone una vez, por empleado de la planilla (la
 * lista del reloj, que tiene a todos, con o sin usuario de la app), en
 * Propinas → Porcentaje de cada mozo. Se guarda en propina_grupos. Si la
 * persona tiene nivel en Progresión, manda el nivel (1 · 50 %, 2 · 75 %,
 * 3 · 100 %): son lo mismo y no puede haber dos respuestas.
 *
 * "No es mozo" (grupo 'afuera'): Enzo figura en la planilla con cargo MOZO,
 * pero es el encargado de salón. "Traer horas del reloj" no lo suma ni lo
 * ofrece; si la cajera lo escribe a mano, entra igual (y se le avisa).
 *
 * En el editor de propinas, cada uno cae solo en la sección de su porcentaje.
 * La cajera lo puede cambiar para ese día (se le avisa que es distinto).
 * Todo es puro: no lee la base.
 */

import { normalizarNombre, type SectorHorario } from '@/lib/horarios'
import { GRUPOS, type Grupo } from '@/lib/propinas'
import { grupoDeNivel } from '@/lib/progresion'
import { emparejar, nombreParaPropinas, tipoEnElSalon, type TipoSalon } from '@/lib/propinas-reloj'

/** Lo que se guarda en propina_grupos: un porcentaje, o 'afuera' (no es mozo). */
export type GrupoGuardado = Grupo | 'afuera'

/** Un empleado con lo que se le configuró, como lo devuelve grupos_para_propinas(). */
export interface GrupoConfigurado {
  /** Como figura en la planilla: "IBARRA LUCAS DAMIAN". */
  nombre: string
  profileId: string | null
  nombresHorario: string[]
  grupo: GrupoGuardado
}

export const esGrupo = (v: unknown): v is Grupo => GRUPOS.some((g) => g.valor === v)
export const esGrupoGuardado = (v: unknown): v is GrupoGuardado => v === 'afuera' || esGrupo(v)

/** Lo que devuelve la base (jsonb), con cuidado por si algo viene raro. */
export function leerGruposConfigurados(crudo: unknown): GrupoConfigurado[] {
  if (!Array.isArray(crudo)) return []
  return (crudo as Record<string, unknown>[])
    .filter((g) => typeof g?.nombre === 'string' && esGrupoGuardado(g?.grupo))
    .map((g) => ({
      nombre: g.nombre as string,
      profileId: typeof g.profile_id === 'string' ? g.profile_id : null,
      nombresHorario: Array.isArray(g.nombres_horario)
        ? (g.nombres_horario as unknown[]).filter((n): n is string => typeof n === 'string')
        : [],
      grupo: g.grupo as GrupoGuardado,
    }))
}

export interface GrupoDeAlguien {
  grupo: Grupo
  /** Quién lo decide: su nivel de Progresión o lo que puso un encargado. */
  origen: 'progresion' | 'grupos'
}

/**
 * La fila configurada que corresponde a un nombre de la lista de propinas
 * (por su usuario, por nombre igual o por la regla de las 2 palabras). Se
 * busca entre todos, también los que no son mozos: así un nombre que podría
 * ser de dos personas no se le asigna a una sola. Null ante la duda.
 */
function configuracionDe(nombre: string, usuarioId: string | null, grupos: GrupoConfigurado[]): GrupoConfigurado | null {
  if (!nombre.trim() || grupos.length === 0) return null
  const i = emparejar([{ clave: 'x', nombre, usuarioId }], grupos).get('x')
  return i === undefined ? null : grupos[i]
}

/**
 * El porcentaje de un nombre de la lista de propinas: primero su nivel de
 * Progresión (si tiene usuario y nivel), después lo que puso un encargado.
 * Null si no tiene ninguno o si no es mozo: ante la duda no se pone nada.
 */
export function grupoConfigurado(
  nombre: string,
  usuarioId: string | null,
  nivelPorUsuario: Record<string, number> | undefined,
  grupos: GrupoConfigurado[]
): GrupoDeAlguien | null {
  if (!nombre.trim()) return null
  const porNivel = usuarioId ? grupoDeNivel(nivelPorUsuario?.[usuarioId] ?? null) : null
  if (porNivel) return { grupo: porNivel, origen: 'progresion' }
  const config = configuracionDe(nombre, usuarioId, grupos)
  return config && config.grupo !== 'afuera' ? { grupo: config.grupo, origen: 'grupos' } : null
}

/** Si un encargado marcó a ese nombre de la lista como que no es mozo. */
export function marcadoNoMozo(nombre: string, usuarioId: string | null, grupos: GrupoConfigurado[]): boolean {
  return configuracionDe(nombre, usuarioId, grupos)?.grupo === 'afuera'
}

// ---------------------------------------------------------------------------
// La pantalla del encargado: el porcentaje de cada mozo
// ---------------------------------------------------------------------------

export interface EmpleadoParaGrupo {
  id: string
  nombre: string
  cargo: string | null
  nombresHorario: string[]
  profileId: string | null
}

export interface FilaGrupo {
  id: string
  /** Como lo conocen (el de Horarios) o el de la planilla en minúscula. */
  nombre: string
  /** "Camareros", "Comiss / Runners" o el cargo de la planilla. */
  detalle: string
  /** Si es del salón según Horarios (o el cargo o el puesto); null si no. */
  tipo: TipoSalon | null
  /** Lo que puso un encargado: un porcentaje o 'afuera' (no es mozo). */
  grupo: GrupoGuardado | null
  /** Si tiene nivel en Progresión, ese manda. */
  nivel: { nivel: number; grupo: Grupo; userId: string } | null
}

/** "COMISS / RUNNERS" -> "Comiss / Runners". */
function comoTitulo(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Todos los empleados, en orden alfabético, con su sector, su porcentaje y su
 * nivel. En qué parte de la pantalla va cada uno lo dice seccionDe.
 */
export function armarListaGrupos(d: {
  empleados: EmpleadoParaGrupo[]
  grupos: { empleadoId: string; grupo: GrupoGuardado }[]
  puestoPorUsuario: Map<string, string | null>
  nivelPorUsuario: Map<string, number>
  sectores: SectorHorario[]
}): FilaGrupo[] {
  const grupoDe = new Map(d.grupos.map((g) => [g.empleadoId, g.grupo]))
  // Los nombres de cada sector de esa semana, comparables.
  const enSector = d.sectores.map((s) => ({
    sector: s.nombre.trim(),
    nombres: new Set(s.personas.map((p) => normalizarNombre(p.nombre ?? '')).filter(Boolean)),
  }))

  const filas = d.empleados.map((e): FilaGrupo => {
    const claves = e.nombresHorario.map(normalizarNombre).filter(Boolean)
    const sectores = enSector.filter((s) => claves.some((c) => s.nombres.has(c))).map((s) => s.sector)
    const puesto = e.profileId ? d.puestoPorUsuario.get(e.profileId) ?? null : null
    const tipo = tipoEnElSalon({ cargo: e.cargo, puesto, horario: sectores.map((sector) => ({ sector, celda: null })) })
    const nivel = e.profileId ? d.nivelPorUsuario.get(e.profileId) : undefined
    const grupoNivel = grupoDeNivel(nivel ?? null)
    return {
      id: e.id,
      nombre: nombreParaPropinas({ nombre: e.nombre, profileId: null, nombresHorario: e.nombresHorario }, []),
      detalle: sectores.length > 0 ? sectores.map(comoTitulo).join(' · ') : e.cargo ? comoTitulo(e.cargo) : puesto ?? '',
      tipo,
      grupo: grupoDe.get(e.id) ?? null,
      nivel: grupoNivel && e.profileId ? { nivel: nivel!, grupo: grupoNivel, userId: e.profileId } : null,
    }
  })
  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** El porcentaje con el que cobra: el de su nivel si tiene, si no el que le pusieron. */
export function grupoEfectivo(f: Pick<FilaGrupo, 'grupo' | 'nivel'>): Grupo | null {
  if (f.nivel) return f.nivel.grupo
  return f.grupo === 'afuera' ? null : f.grupo
}

/**
 * Dónde va cada uno en la pantalla:
 *   - en la sección de su porcentaje, si tiene nivel o un encargado se lo puso
 *     (sea mozo, runner o lo que sea);
 *   - "no es mozo", si un encargado lo marcó así;
 *   - "sin definir", los mozos sin porcentaje (en la propina van al 100 %);
 *   - "otros", el resto: runners y demás personal, que se muestran si se pide.
 */
export type Seccion = Grupo | 'afuera' | 'sin' | 'otros'

export function seccionDe(f: FilaGrupo): Seccion {
  if (f.nivel) return f.nivel.grupo
  if (f.grupo) return f.grupo
  return f.tipo === 'mozo' ? 'sin' : 'otros'
}
