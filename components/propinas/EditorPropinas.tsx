'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Fingerprint,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EN_BETA } from '@/lib/beta'
import {
  GRUPOS,
  PAGOS,
  calcularReparto,
  fechaConDia,
  pesos,
  textoReporte,
  vincularUsuario,
  type Grupo,
  type Pago,
  type PersonaPropina,
} from '@/lib/propinas'
import { borrarDiaPropinasAction, guardarPropinasAction, relojParaPropinasAction } from '@/app/actions/propinas'
import {
  armarDesdeReloj,
  emparejar,
  leerDetalle,
  type DatosRelojPropinas,
  type ParaOfrecer,
  type ResultadoReloj,
} from '@/lib/propinas-reloj'
import {
  grupoConfigurado,
  marcadoNoMozo,
  type GrupoConfigurado,
  type GrupoDeAlguien,
} from '@/lib/propinas-grupos'

interface Fila {
  key: string
  nombre: string
  grupo: Grupo
  horas: string
  pago: Pago | null
  efectivo: string
}

interface Props {
  /** '/admin/propinas' o '/dashboard/propinas'. */
  base: string
  fecha: string
  esNuevo: boolean
  total: number | null
  general: number | null
  personas: PersonaPropina[]
  version: string | null
  usuarios: { id: string; full_name: string }[]
  sugerencias: string[]
  /** Nivel de progresión de cada mozo (por id de usuario): define su grupo. */
  nivelPorUsuario?: Record<string, number>
  /** Los grupos que configuró un encargado (Propinas → Grupos). */
  grupos?: GrupoConfigurado[]
  /** Si no se pudieron leer los grupos (por ejemplo, falta el SQL). */
  errorGrupos?: string | null
}

/** "100 %", "75 %" o "50 %". */
const porcentaje = (g: Grupo) => GRUPOS.find((x) => x.valor === g)?.corta ?? ''

/** Una suma de horas para mostrar: 85,25. */
const sumaHoras = (h: number) => String(Math.round(h * 100) / 100).replace('.', ',')

let contador = 0
const nuevaKey = () => 'f' + ++contador

function aFila(p: PersonaPropina): Fila {
  return {
    key: nuevaKey(),
    nombre: p.nombre,
    grupo: p.grupo,
    horas: p.horas > 0 ? String(p.horas) : '',
    pago: p.pago,
    efectivo: p.efectivo ? String(p.efectivo) : '',
  }
}

/** "277.850" o "$ 277850" -> 277850. */
function aPesos(texto: string): number {
  const limpio = texto.replace(/\D/g, '')
  return limpio ? Number(limpio) : 0
}

/** "6,5" -> 6.5. Vacío o inválido -> 0. */
function aHoras(texto: string): number {
  const n = Number(texto.replace(',', '.').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 6.5 -> "6,5", como se escriben a mano. */
const textoHoras = (h: number) => String(h).replace('.', ',')

interface AvisoReloj {
  ok: boolean
  texto: string
  detalles: { titulo: string; nombres: string; pista: string }[]
}

const juntar = (nombres: string[]) => nombres.join(', ')

/**
 * El resumen de lo que hizo "Traer horas del reloj". `conDetalle`: la base
 * mandó las entradas y salidas, y a quien le falta una fichada ya se lo marca
 * en su fila (no se repite acá).
 */
function avisoDelReloj(r: ResultadoReloj, filas: Fila[], conDetalle: boolean): AvisoReloj {
  const nombreDe = new Map(filas.map((f) => [f.key, f.nombre.trim()]))
  const deLaLista = (tipo: string) =>
    Array.from(r.filas)
      .filter(([, e]) => e.tipo === tipo)
      .map(([clave]) => nombreDe.get(clave) ?? '')
  const sumados = (motivo: string) => r.mozos.filter((m) => m.motivo === motivo).map((m) => m.nombre)

  const conHoras = deLaLista('horas').length + sumados('horas').length
  const incompletas = [...deLaLista('incompleta'), ...sumados('incompleta')]
  const sinFichadas = [...deLaLista('sin_fichadas'), ...sumados('sin_fichadas')]
  const noEstan = deLaLista('no_esta')

  const detalles: AvisoReloj['detalles'] = []
  if (incompletas.length > 0 && !conDetalle) {
    detalles.push({ titulo: 'Incompletas en el reloj', nombres: juntar(incompletas), pista: 'Poneles las horas a mano.' })
  }
  if (sinFichadas.length > 0) {
    detalles.push({
      titulo: 'Con turno en Horarios y sin fichadas',
      nombres: juntar(sinFichadas),
      pista: 'Si trabajaron, poneles las horas a mano.',
    })
  }
  if (noEstan.length > 0) {
    detalles.push({ titulo: 'No ficharon ese día', nombres: juntar(noEstan), pista: 'Si no trabajaron, dejalos sin horas.' })
  }
  const n = r.mozos.length
  return {
    ok: true,
    texto:
      `Horas del reloj para ${conHoras} ${conHoras === 1 ? 'persona' : 'personas'}` +
      (n > 0 ? `: sumé ${n} ${n === 1 ? 'mozo que no estaba' : 'mozos que no estaban'} en la lista.` : '.'),
    detalles,
  }
}

function aPersona(f: Fila): PersonaPropina {
  return {
    nombre: f.nombre,
    grupo: f.grupo,
    horas: aHoras(f.horas),
    pago: f.pago,
    efectivo: f.pago === 'tr_ef' && f.efectivo ? aPesos(f.efectivo) : null,
  }
}

const inputBase =
  'w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[40px]'

export default function EditorPropinas(props: Props) {
  const router = useRouter()
  const [fecha, setFecha] = useState(props.fecha)
  const [total, setTotal] = useState(props.total ? String(props.total) : '')
  const [general, setGeneral] = useState(props.general ? String(props.general) : '')
  const usuarioDe = (nombre: string) => (nombre.trim() ? vincularUsuario(nombre, props.usuarios) : null)
  // El grupo de cada uno: el de su nivel de Progresión o el que configuró un encargado.
  const configuradoDe = (nombre: string): GrupoDeAlguien | null =>
    grupoConfigurado(nombre, usuarioDe(nombre), props.nivelPorUsuario, props.grupos ?? [])
  // Los que un encargado marcó como que no son mozos (Enzo).
  const noEsMozo = (nombre: string) => marcadoNoMozo(nombre, usuarioDe(nombre), props.grupos ?? [])

  const [filas, setFilas] = useState<Fila[]>(() => {
    // En un día nuevo cada uno arranca en su grupo, y los que no son mozos no
    // vienen de la lista anterior; uno ya guardado queda como está.
    const personas = props.esNuevo
      ? props.personas
          .filter((p) => !noEsMozo(p.nombre))
          .map((p) => ({ ...p, grupo: configuradoDe(p.nombre)?.grupo ?? p.grupo }))
      : props.personas
    return personas.length > 0
      ? personas.map(aFila)
      : [aFila({ nombre: '', grupo: 'camarero', horas: 0, pago: null, efectivo: null })]
  })
  // Filas a las que la cajera les eligió el grupo a mano: el configurado ya no las mueve.
  const elegidasAMano = useRef(new Set<string>())
  // El nombre que tenía cada fila al entrar a escribirlo, para saber si cambió.
  const nombreAlEntrar = useRef(new Map<string, string>())
  const [version, setVersion] = useState(props.version)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [trayendo, setTrayendo] = useState(false)
  const [avisoReloj, setAvisoReloj] = useState<AvisoReloj | null>(null)
  // Runners y gente sin sector que ficharon: se suman solo si se los toca.
  const [ofrecidos, setOfrecidos] = useState<ParaOfrecer[]>([])
  // Lo que puso el reloj (horas por fila y filas que sumó), para poder
  // corregirlo si se vuelve a traer con otra fecha sin pisar lo escrito a mano.
  const puestasPorReloj = useRef(new Map<string, string>())
  const sumadasPorReloj = useRef(new Set<string>())
  const filasActuales = useRef(filas)
  useEffect(() => {
    filasActuales.current = filas
  }, [filas])

  // A qué hora entró y salió cada uno ese día (la planilla maestra), para que
  // la cajera controle. Se pide solo al abrir y al cambiar la fecha; no toca
  // las horas de la lista (eso lo hace "Traer horas del reloj").
  const [reloj, setReloj] = useState<{ fecha: string; datos: DatosRelojPropinas } | null>(null)
  const [verHorarios, setVerHorarios] = useState(false)
  const pedidoReloj = useRef(0)
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return
    const pedido = ++pedidoReloj.current
    // Si falla, no se muestra nada de esto: "Traer horas del reloj" dice el error.
    relojParaPropinasAction(fecha)
      .then((res) => {
        if (pedido === pedidoReloj.current) setReloj(res.ok && res.value ? { fecha, datos: res.value } : null)
      })
      .catch(() => {
        if (pedido === pedidoReloj.current) setReloj(null)
      })
  }, [fecha])

  // Qué dice el reloj de cada fila de la lista (por usuario o por nombre).
  const relojDeFila = useMemo(() => {
    const mapa = new Map<string, { linea: string; alerta: string | null }>()
    if (!reloj || reloj.fecha !== fecha) return mapa
    const pares = emparejar(
      filas.map((f) => ({ clave: f.key, nombre: f.nombre, usuarioId: usuarioDe(f.nombre) })),
      reloj.datos.personas
    )
    pares.forEach((i, clave) => {
      const p = reloj.datos.personas[i]
      if (p.detalle) mapa.set(clave, leerDetalle(p.detalle, p.minutos))
    })
    return mapa
    // usuarioDe solo depende de props.usuarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, reloj, fecha, props.usuarios])
  // Si la base ya manda las entradas y salidas (falta el SQL nuevo si no).
  const hayDetalle = reloj?.fecha === fecha && reloj.datos.personas.some((p) => p.detalle !== null)
  // A quién de la lista le falta una fichada o hay que revisarle algo.
  const paraRevisar = filas.flatMap((f) => {
    const alerta = relojDeFila.get(f.key)?.alerta
    return alerta && f.nombre.trim() ? [{ nombre: f.nombre.trim(), alerta }] : []
  })

  const personas = useMemo(() => filas.map(aPersona), [filas])
  const totalN = aPesos(total)
  const generalN = aPesos(general)
  const reparto = useMemo(() => calcularReparto(totalN, generalN, personas), [totalN, generalN, personas])
  const conHoras = personas.filter((p) => p.horas > 0).length

  // Qué se guardó por última vez, para saber si hay cambios sin guardar.
  const foto = JSON.stringify({ fecha, totalN, generalN, personas: personas.filter((p) => p.horas > 0) })
  const [guardado, setGuardado] = useState(props.esNuevo ? '' : foto)
  const sinGuardar = foto !== guardado

  useEffect(() => {
    if (!sinGuardar) return
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sinGuardar])

  function cambiar(key: string, cambio: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambio } : f)))
    setError(null)
  }

  /** Una fila nueva que pone el reloj, con el grupo de su nivel si tiene. */
  function filaDelReloj(nombre: string, horas: number | null): Fila {
    const fila = {
      ...aFila({ nombre, grupo: configuradoDe(nombre)?.grupo ?? 'camarero', horas: 0, pago: null, efectivo: null }),
      horas: horas !== null ? textoHoras(horas) : '',
    }
    sumadasPorReloj.current.add(fila.key)
    if (horas !== null) puestasPorReloj.current.set(fila.key, fila.horas)
    return fila
  }

  /**
   * Arma la lista con la planilla maestra de ese día (el reloj): les pone las
   * horas a los que están, suma a los mozos que faltan y ofrece a los runners.
   */
  async function traerHoras() {
    setTrayendo(true)
    setAvisoReloj(null)
    setOfrecidos([])
    const pedido = ++pedidoReloj.current
    const res = await relojParaPropinasAction(fecha)
    setTrayendo(false)
    if (!res.ok) {
      setAvisoReloj({ ok: false, texto: res.error, detalles: [] })
      return
    }
    // Si la planilla todavía no tiene ese día, igual se pasa (vacío): así se saca
    // lo que el reloj había puesto con otra fecha. Horarios solo no alcanza para
    // decir quién faltó.
    const vacio = (res.value?.personas.length ?? 0) === 0
    const datos: DatosRelojPropinas = vacio || !res.value ? { personas: [], sinReloj: [] } : res.value
    if (pedido === pedidoReloj.current) setReloj({ fecha, datos })

    const actuales = filasActuales.current
    const r = armarDesdeReloj(
      actuales.map((f) => ({ clave: f.key, nombre: f.nombre, usuarioId: usuarioDe(f.nombre) })),
      datos,
      props.usuarios,
      // A los que no son mozos (Enzo) no los suma ni los ofrece.
      (props.grupos ?? []).filter((g) => g.grupo === 'afuera')
    )

    const previas = puestasPorReloj.current
    puestasPorReloj.current = new Map()
    const siguientes: Fila[] = []
    for (const f of actuales) {
      // Las horas que tiene son las que puso el reloj antes (con otra fecha): se pueden sacar.
      const delReloj = previas.get(f.key) === f.horas && f.horas !== ''
      const estado = r.filas.get(f.key)
      if (!estado) {
        // Sin nombre: si está vacía, afuera; si tiene horas, queda (al guardar se avisa).
        if (f.horas.trim()) siguientes.push(f)
      } else if (estado.tipo === 'horas') {
        const horas = textoHoras(estado.horas)
        puestasPorReloj.current.set(f.key, horas)
        siguientes.push({ ...f, horas })
      } else if (estado.tipo === 'no_esta' && sumadasPorReloj.current.has(f.key) && (delReloj || !f.horas.trim())) {
        // La había sumado el reloj para otra fecha y este día no trabajó: afuera.
      } else {
        siguientes.push(delReloj ? { ...f, horas: '' } : f)
      }
    }
    for (const m of r.mozos) siguientes.push(filaDelReloj(m.nombre, m.horas))

    setFilas(siguientes.length > 0 ? siguientes : [aFila({ nombre: '', grupo: 'camarero', horas: 0, pago: null, efectivo: null })])
    setOfrecidos(r.ofrecer)
    setAvisoReloj(
      vacio
        ? {
            ok: false,
            texto: 'La planilla todavía no tiene a nadie ese día. Se actualiza sola cada 2 horas: probá más tarde.',
            detalles: [],
          }
        : avisoDelReloj(r, actuales, datos.personas.some((p) => p.detalle !== null))
    )
    setError(null)
  }

  /** Suma a la lista a los runners (o sin sector) que se tocaron. */
  function sumarOfrecidos(cuales: ParaOfrecer[]) {
    const nuevas = cuales.map((o) => filaDelReloj(o.nombre, o.horas))
    setFilas((prev) => [...prev.filter((f) => f.nombre.trim() || f.horas.trim()), ...nuevas])
    setOfrecidos((prev) => prev.filter((o) => !cuales.includes(o)))
  }

  // Desde la planilla ("Pasar a Propinas") se llega con ?traer=reloj: se traen solas, una vez.
  const parametros = useSearchParams()
  const yaTrajo = useRef(false)
  useEffect(() => {
    if (yaTrajo.current || parametros.get('traer') !== 'reloj') return
    yaTrajo.current = true
    traerHoras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros])

  /** Una fila vacía en esa sección (si después escribe a alguien de otro grupo, se pasa sola). */
  function agregar(grupo: Grupo) {
    setFilas((prev) => [...prev, aFila({ nombre: '', grupo, horas: 0, pago: null, efectivo: null })])
  }

  function quitar(key: string) {
    setFilas((prev) => prev.filter((f) => f.key !== key))
  }

  /** La cajera eligió el grupo a mano: queda ese, aunque esté configurado otro. */
  function elegirGrupo(key: string, grupo: Grupo) {
    elegidasAMano.current.add(key)
    cambiar(key, { grupo })
  }

  /**
   * Al terminar de escribir un nombre, si esa persona tiene grupo configurado,
   * pasa sola a su sección (al salir del campo y no al escribir, para que la
   * fila no se mueva mientras se tipea). Si no cambió el nombre, no se toca.
   */
  function alSalirDelNombre(f: Fila) {
    const antes = nombreAlEntrar.current.get(f.key)
    nombreAlEntrar.current.delete(f.key)
    if (antes === undefined || antes === f.nombre || elegidasAMano.current.has(f.key)) return
    const configurado = configuradoDe(f.nombre)
    if (configurado && configurado.grupo !== f.grupo) cambiar(f.key, { grupo: configurado.grupo })
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const res = await guardarPropinasAction(
      { fecha, total: totalN, general: generalN, personas },
      props.esNuevo ? null : version
    )
    setGuardando(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setGuardado(foto)
    if (props.esNuevo) {
      router.replace(props.base + '/' + fecha)
      router.refresh()
    } else {
      setVersion(res.value ?? null)
      router.refresh()
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar las propinas del ${fechaConDia(fecha)}? No se puede deshacer.`)) return
    setBorrando(true)
    setError(null)
    const res = await borrarDiaPropinasAction(fecha)
    if (!res.ok) {
      setBorrando(false)
      setError(res.error)
      return
    }
    setGuardado(foto)
    router.replace(props.base)
    router.refresh()
  }

  const reporte = textoReporte(fecha, totalN, generalN, personas)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(reporte)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar. Mantené apretado el texto de abajo y copialo a mano.')
    }
  }

  const nombresSugeridos = useMemo(
    () =>
      Array.from(new Set([...props.sugerencias, ...props.usuarios.map((u) => u.full_name.trim())]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [props.sugerencias, props.usuarios]
  )

  /** Una persona de la lista: nombre, horas, grupo, pago y lo que le toca. */
  function filaDeLaLista(i: number) {
    const f = filas[i]
    const p = personas[i]
    const trabajo = p.horas > 0
    const vinculado = usuarioDe(f.nombre)
    const configurado = configuradoDe(f.nombre)
    const delReloj = relojDeFila.get(f.key)
    return (
      <li key={f.key} className={cn('px-4 py-3 space-y-2', !trabajo && 'bg-brand-card-hover/60')}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              list="nombres-propinas"
              value={f.nombre}
              onChange={(e) => cambiar(f.key, { nombre: e.target.value })}
              onFocus={() => nombreAlEntrar.current.set(f.key, f.nombre)}
              onBlur={() => alSalirDelNombre(f)}
              placeholder="Nombre y apellido"
              aria-label="Nombre"
              className={cn(inputBase, 'font-medium', vinculado && 'pr-8')}
            />
            {vinculado && (
              <UserCheck
                className="w-4 h-4 text-brand-accent absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label="Tiene usuario: lo ve en su app"
              />
            )}
          </div>
          {/* Ancho para "12,75": las horas de la propina van de a cuarto. */}
          <div className="relative w-[5.25rem] flex-shrink-0">
            <input
              type="text"
              inputMode="decimal"
              value={f.horas}
              onChange={(e) => cambiar(f.key, { horas: e.target.value })}
              placeholder="0"
              aria-label={'Horas de ' + (f.nombre || 'esta persona')}
              className={cn(inputBase, 'pr-6 text-right tabular-nums')}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
              h
            </span>
          </div>
          <button
            type="button"
            onClick={() => quitar(f.key)}
            aria-label={'Sacar a ' + (f.nombre || 'esta fila')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 cursor-pointer flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* El reloj: si le falta una fichada, siempre; la entrada y la salida, si se pidió verlas. */}
        {delReloj?.alerta ? (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
            <span>{delReloj.linea}</span>
          </p>
        ) : (
          verHorarios &&
          hayDetalle &&
          f.nombre.trim() && (
            <p className="flex items-start gap-1.5 text-[11px] text-brand-muted leading-snug tabular-nums">
              <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
              <span>{delReloj ? delReloj.linea : 'No figura en el reloj ese día'}</span>
            </p>
          )
        )}

        {f.nombre.trim() && noEsMozo(f.nombre) && (
          <p className="text-[11px] text-amber-700 font-medium">
            Un encargado lo marcó como que no es mozo: si hoy no trabajó de mozo, sacalo de la lista.
          </p>
        )}

        {trabajo && (
          <div className="flex items-center gap-2">
            <select
              value={f.grupo}
              onChange={(e) => elegirGrupo(f.key, e.target.value as Grupo)}
              aria-label="Grupo"
              className="px-2 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs text-brand-text cursor-pointer min-h-[34px]"
            >
              {GRUPOS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  Al {g.corta}
                </option>
              ))}
            </select>
            <select
              value={f.pago ?? ''}
              onChange={(e) =>
                cambiar(f.key, { pago: (e.target.value || null) as Pago | null })
              }
              aria-label="Cómo se le pagó"
              className={cn(
                'px-2 py-1.5 border rounded-lg text-xs cursor-pointer min-h-[34px]',
                f.pago
                  ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent font-semibold'
                  : 'bg-brand-card border-brand-border text-brand-muted'
              )}
            >
              <option value="">Sin pagar</option>
              {PAGOS.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.corta}
                </option>
              ))}
            </select>
            <span className="ml-auto text-sm font-bold text-brand-text tabular-nums whitespace-nowrap">
              {pesos(reparto.montos[i])}
            </span>
          </div>
        )}

        {trabajo && configurado && configurado.grupo !== f.grupo && (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-amber-700 font-medium">
            <span>
              {/* Mientras Progresión está en fase beta, la cajera no ve que existe. */}
              {configurado.origen === 'progresion' && (!EN_BETA.progresion || props.base.startsWith('/admin'))
                ? 'Su nivel de Progresión es'
                : 'Está configurado al'}{' '}
              {porcentaje(configurado.grupo)}: hoy lo pusiste al {porcentaje(f.grupo)}.
            </span>
            <button
              type="button"
              onClick={() => elegirGrupo(f.key, configurado.grupo)}
              className="underline underline-offset-2 cursor-pointer"
            >
              Pasarlo al {porcentaje(configurado.grupo)}
            </button>
          </p>
        )}

        {trabajo && f.pago === 'tr_ef' && (
          <label className="flex items-center gap-2">
            <span className="text-xs text-brand-muted whitespace-nowrap">En efectivo</span>
            <input
              type="text"
              inputMode="numeric"
              value={f.efectivo}
              onChange={(e) => cambiar(f.key, { efectivo: e.target.value })}
              placeholder="Ej: 20800"
              className={cn(inputBase, 'min-h-[34px] py-1.5 text-xs')}
            />
          </label>
        )}
      </li>
    )
}

  return (
    <div className="space-y-4">
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-brand-text">Datos del día</h2>
        {props.esNuevo ? (
          <label className="block">
            <span className="text-xs text-brand-muted">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value)
                // Lo que dijo el reloj era de la otra fecha.
                setOfrecidos([])
                setAvisoReloj(
                  puestasPorReloj.current.size > 0 || filas.some((f) => sumadasPorReloj.current.has(f.key))
                    ? {
                        ok: false,
                        texto: 'Cambiaste la fecha: tocá "Traer horas del reloj" de nuevo, así las horas son las de ese día.',
                        detalles: [],
                      }
                    : null
                )
              }}
              className={cn(inputBase, 'mt-1')}
            />
          </label>
        ) : (
          <p className="text-sm text-brand-text capitalize">{fechaConDia(fecha)}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-brand-muted">Propina total</span>
            <input
              type="text"
              inputMode="numeric"
              value={total}
              onChange={(e) => {
                setTotal(e.target.value)
                setError(null)
              }}
              placeholder="Ej: 277850"
              className={cn(inputBase, 'mt-1')}
            />
          </label>
          <label className="block">
            <span className="text-xs text-brand-muted">General (1,5 %)</span>
            <input
              type="text"
              inputMode="numeric"
              value={general}
              onChange={(e) => {
                setGeneral(e.target.value)
                setError(null)
              }}
              placeholder="Ej: 44200"
              className={cn(inputBase, 'mt-1')}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Dato etiqueta="Salón" valor={pesos(reparto.salon)} />
          <Dato etiqueta="Por hora" valor={reparto.porHora > 0 ? pesos(reparto.porHora) : '—'} destacado />
          <Dato etiqueta="Personas" valor={String(conHoras)} />
        </div>
      </section>

      <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-brand-text">Horas de cada uno</h2>
              <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                De a cuarto (8, 8,25, 8,5, 8,75). Quien no trabajó, dejalo sin horas: no entra en el reparto.
              </p>
              {hayDetalle && (
                <button
                  type="button"
                  aria-pressed={verHorarios}
                  onClick={() => setVerHorarios((v) => !v)}
                  className={cn(
                    'mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer min-h-[34px]',
                    verHorarios
                      ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent'
                      : 'bg-brand-card border-brand-border text-brand-text hover:border-brand-accent'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {verHorarios ? 'Ocultar entradas y salidas' : 'Ver entradas y salidas'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={traerHoras}
              disabled={trayendo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-accent/50 text-xs font-semibold text-brand-accent hover:bg-brand-accent/5 cursor-pointer disabled:opacity-60 whitespace-nowrap min-h-[40px]"
            >
              {trayendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Fingerprint className="w-3.5 h-3.5" />}
              Traer horas del reloj
            </button>
          </div>
          {avisoReloj && (
            <div
              role="status"
              className={cn(
                'mt-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed space-y-1.5',
                avisoReloj.ok ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-brand-error/30 bg-brand-error/10'
              )}
            >
              <p
                className={cn(
                  'flex items-start gap-1.5 font-semibold',
                  avisoReloj.ok ? 'text-brand-success' : 'text-brand-error'
                )}
              >
                {avisoReloj.ok ? (
                  <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                )}
                {avisoReloj.texto}
              </p>
              {avisoReloj.detalles.map((d) => (
                <p key={d.titulo} className="text-brand-text">
                  <span className="font-semibold">{d.titulo}:</span> {d.nombres}.{' '}
                  <span className="text-brand-muted">{d.pista}</span>
                </p>
              ))}
            </div>
          )}
          {(['runner', 'sin_sector'] as const).map((tipo) => {
            const delTipo = ofrecidos.filter((o) => o.tipo === tipo)
            if (delTipo.length === 0) return null
            return (
              <div key={tipo} className="mt-2 rounded-xl border border-brand-border bg-brand-card-hover/60 px-3 py-2.5">
                <p className="text-xs font-semibold text-brand-text">
                  {tipo === 'runner' ? 'Runners y comisses que ficharon' : 'Ficharon y no figuran en Horarios'}
                </p>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  {tipo === 'runner'
                    ? 'No se suman solos: tocá a los que entran en el reparto.'
                    : 'Si alguno es del salón, tocalo para sumarlo.'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {delTipo.map((o, i) => (
                    <button
                      key={o.nombre + i}
                      type="button"
                      onClick={() => sumarOfrecidos([o])}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-brand-accent/40 bg-brand-card text-xs font-medium text-brand-accent hover:bg-brand-accent/5 cursor-pointer min-h-[34px]"
                    >
                      <Plus className="w-3 h-3" />
                      {o.nombre} · {textoHoras(o.horas)} h
                    </button>
                  ))}
                  {tipo === 'runner' && delTipo.length > 1 && (
                    <button
                      type="button"
                      onClick={() => sumarOfrecidos(delTipo)}
                      className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-brand-muted hover:text-brand-accent underline underline-offset-2 cursor-pointer min-h-[34px]"
                    >
                      Sumar a los {delTipo.length}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <datalist id="nombres-propinas">
          {nombresSugeridos.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {paraRevisar.length > 0 && (
          <div
            role="status"
            className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"
          >
            <p className="flex items-start gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {paraRevisar.length === 1
                ? 'Revisá las fichadas de 1 persona'
                : `Revisá las fichadas de ${paraRevisar.length} personas`}
            </p>
            <ul className="mt-1 space-y-0.5 pl-5">
              {paraRevisar.map((r, i) => (
                <li key={r.nombre + i}>
                  <span className="font-semibold">{r.nombre}</span>: {r.alerta}
                </li>
              ))}
            </ul>
            <p className="mt-1 pl-5 text-amber-800/90">Si trabajaron, poneles las horas a mano.</p>
          </div>
        )}

        {props.errorGrupos && (
          <p className="mx-4 mb-3 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-relaxed">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
            <span>No se pudieron leer los grupos configurados: cada uno queda en el grupo que tenía. {props.errorGrupos}</span>
          </p>
        )}

        {/* Las tres secciones: cada uno cae solo en la de su grupo. */}
        {GRUPOS.map((g) => {
          const indices = filas.flatMap((f, i) => (f.grupo === g.valor ? [i] : []))
          const conHorasAca = indices.filter((i) => personas[i].horas > 0)
          const horasAca = conHorasAca.reduce((s, i) => s + personas[i].horas, 0)
          return (
            <div key={g.valor} className="border-t border-brand-border/70">
              <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2 bg-brand-card-hover/50">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">Al {g.corta}</h3>
                <span className="text-[11px] text-brand-muted tabular-nums">
                  {conHorasAca.length === 0
                    ? 'Nadie con horas'
                    : `${conHorasAca.length} ${conHorasAca.length === 1 ? 'persona' : 'personas'} · ${sumaHoras(horasAca)} h`}
                </span>
              </div>
              {indices.length > 0 && (
                <ul className="divide-y divide-brand-border/70 border-t border-brand-border/40">
                  {indices.map((i) => filaDeLaLista(i))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => agregar(g.valor)}
                className="flex items-center gap-1.5 w-full px-4 py-2.5 border-t border-brand-border/40 text-xs font-medium text-brand-accent hover:bg-brand-accent/5 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar al {g.corta}
              </button>
            </div>
          )
        })}

        <div className="px-4 py-3 border-t border-brand-border/70 space-y-2">
          <p className="flex items-start gap-1.5 text-[11px] text-brand-muted leading-relaxed">
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px text-brand-accent" />
            Tiene usuario en la app y ve lo que le tocó. Si alguien no lo tiene, revisá que el nombre
            y apellido estén igual que en su usuario. Cada uno cae solo en su sección, según el porcentaje
            que le puso un encargado; si hoy cobra distinto, cambiáselo.
          </p>
          {props.base.startsWith('/admin') && (
            <Link
              href="/admin/propinas/grupos"
              className="inline-flex text-[11px] font-semibold text-brand-accent underline underline-offset-2"
            >
              Cambiar el porcentaje de cada mozo
            </Link>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || borrando || (!sinGuardar && !props.esNuevo)}
          className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-5 py-3 rounded-xl bg-brand-accent text-white font-bold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[48px] disabled:opacity-50 disabled:cursor-default"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {props.esNuevo ? 'Guardar el día' : sinGuardar ? 'Guardar cambios' : 'Guardado'}
        </button>
        {!props.esNuevo && (
          <button
            type="button"
            onClick={borrar}
            disabled={guardando || borrando}
            className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm text-brand-muted hover:text-brand-error hover:bg-brand-error/10 cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            {borrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Borrar día
          </button>
        )}
      </div>

      {!props.esNuevo && (
        <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-text">Reporte para el grupo</h2>
            <p className="text-xs text-brand-muted mt-0.5">
              {sinGuardar
                ? 'Guardá los cambios antes de mandarlo, así el grupo y la app dicen lo mismo.'
                : 'Copialo o mandalo directo por WhatsApp.'}
            </p>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-brand-text bg-brand-card-hover border border-brand-border/70 rounded-xl p-3 font-sans">
            {reporte}
          </pre>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiar}
              disabled={sinGuardar}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border bg-brand-card text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-default"
            >
              {copiado ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={sinGuardar ? undefined : 'https://wa.me/?text=' + encodeURIComponent(reporte)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={sinGuardar}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold min-h-[44px]',
                sinGuardar ? 'opacity-50 pointer-events-none' : 'hover:brightness-95 cursor-pointer'
              )}
            >
              <Send className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </section>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl px-2.5 py-2 border',
        destacado ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-brand-card-hover border-brand-border/60'
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">{etiqueta}</p>
      <p className={cn('text-sm font-bold tabular-nums truncate', destacado ? 'text-brand-accent' : 'text-brand-text')}>
        {valor}
      </p>
    </div>
  )
}
