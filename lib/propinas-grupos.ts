/**
 * Grupos de propina: quién cobra la hora al 100, al 75 o al 50 %.
 *
 * Un encargado los configura una vez, por empleado de la planilla (la lista
 * del reloj, que tiene a todos, con o sin usuario de la app), en Propinas →
 * Grupos. Se guardan en propina_grupos. Si la persona tiene nivel en
 * Progresión, manda el nivel (1 · 50 %, 2 · 75 %, 3 · 100 %): son lo mismo y
 * no puede haber dos respuestas.
 *
 * En el editor de propinas, cada uno cae solo en la sección de su grupo. La
 * cajera lo puede cambiar para ese día (se le avisa que es distinto).
 * Todo es puro: no lee la base.
 */

import { normalizarNombre, type SectorHorario } from '@/lib/horarios'
import { GRUPOS, type Grupo } from '@/lib/propinas'
import { grupoDeNivel } from '@/lib/progresion'
import { emparejar, nombreParaPropinas, tipoEnElSalon, type TipoSalon } from '@/lib/propinas-reloj'

/** Un empleado con su grupo configurado, como lo devuelve grupos_para_propinas(). */
export interface GrupoConfigurado {
  /** Como figura en la planilla: "IBARRA LUCAS DAMIAN". */
  nombre: string
  profileId: string | null
  nombresHorario: string[]
  grupo: Grupo
}

const esGrupo = (v: unknown): v is Grupo => GRUPOS.some((g) => g.valor === v)

/** Lo que devuelve la base (jsonb), con cuidado por si algo viene raro. */
export function leerGruposConfigurados(crudo: unknown): GrupoConfigurado[] {
  if (!Array.isArray(crudo)) return []
  return (crudo as Record<string, unknown>[])
    .filter((g) => typeof g?.nombre === 'string' && esGrupo(g?.grupo))
    .map((g) => ({
      nombre: g.nombre as string,
      profileId: typeof g.profile_id === 'string' ? g.profile_id : null,
      nombresHorario: Array.isArray(g.nombres_horario)
        ? (g.nombres_horario as unknown[]).filter((n): n is string => typeof n === 'string')
        : [],
      grupo: g.grupo as Grupo,
    }))
}

export interface GrupoDeAlguien {
  grupo: Grupo
  /** Quién lo decide: su nivel de Progresión o lo configurado en Grupos. */
  origen: 'progresion' | 'grupos'
}

/**
 * El grupo de un nombre de la lista de propinas: primero su nivel de
 * Progresión (si tiene usuario y nivel), después lo configurado en Grupos
 * (por su usuario, por nombre igual o por la regla de las 2 palabras). Null
 * si no tiene ninguno: ante la duda no se pone nada.
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
  if (grupos.length === 0) return null
  const i = emparejar([{ clave: 'x', nombre, usuarioId }], grupos).get('x')
  return i === undefined ? null : { grupo: grupos[i].grupo, origen: 'grupos' }
}

// ---------------------------------------------------------------------------
// La pantalla del encargado: a quién se le puede configurar el grupo
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
  /** Lo configurado en Grupos. */
  grupo: Grupo | null
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
 * La lista para configurar: primero el salón (mozos y runners, según la
 * semana de Horarios, el cargo o el puesto), después el resto. `todos` dice
 * si se muestra también a quien no es del salón ni tiene grupo.
 */
export function armarListaGrupos(d: {
  empleados: EmpleadoParaGrupo[]
  grupos: { empleadoId: string; grupo: Grupo }[]
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

  const orden = (f: FilaGrupo) => (f.tipo === 'mozo' ? 0 : f.tipo === 'runner' ? 1 : f.grupo || f.nivel ? 2 : 3)
  return filas.sort((a, b) => orden(a) - orden(b) || a.nombre.localeCompare(b.nombre, 'es'))
}

/** El grupo con el que cobra: el de su nivel si tiene, si no el configurado. */
export function grupoEfectivo(f: Pick<FilaGrupo, 'grupo' | 'nivel'>): Grupo | null {
  return f.nivel?.grupo ?? f.grupo
}
