'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pesos } from '@/lib/propinas'
import { textoHoras } from '@/lib/planilla-vista'
import { bajarArchivo } from '@/lib/bajar-archivo'
import { NOMBRE_GRUPO, repartirPropinaGeneral, ubicar, type GrupoGeneral, type Ubicacion } from '@/lib/propina-general'
import type { PersonaPropinaGeneral } from '@/lib/propina-general-datos'
import { guardarGrupoGeneralAction } from '@/app/actions/planilla-empleados'

interface Props {
  mes: string
  q: 1 | 2
  personas: PersonaPropinaGeneral[]
  /** La General de los días cargados en Propinas en la quincena. */
  sumaGeneral: number
  diasConPropina: number
  faltaColumna: boolean
}

/** "277.850" o "$ 277850" → 277850. */
function aPesos(texto: string): number {
  const limpio = texto.replace(/\D/g, '')
  return limpio ? Number(limpio) : 0
}

/** "COMISS / RUNNERS" → "Comiss / Runners". */
function comoTitulo(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/** De dónde sale que vaya ahí: el sector de Horarios, el cargo o un encargado. */
function detalle(p: PersonaPropinaGeneral): string {
  const base = p.sector
    ? comoTitulo(p.sector)
    : p.cargo
      ? comoTitulo(p.cargo)
      : p.puesto
        ? `Usuario de ${p.puesto}`
        : 'Sin sector en Horarios ni cargo'
  return p.por === 'a mano' ? `${base} · fijado a mano` : base
}

const OPCIONES: { valor: GrupoGeneral | null; texto: string }[] = [
  { valor: 'salon', texto: 'Salón' },
  { valor: 'cocina', texto: 'Cocina' },
  { valor: 'afuera', texto: 'No entra' },
  { valor: null, texto: 'Automático' },
]

/**
 * La propina del resto del personal de una quincena: se pone el monto y se
 * reparte 60 % Salón y 40 % Cocina, cada parte según las horas de la planilla.
 * Tocando a alguien se lo cambia de parte (queda guardado para las próximas).
 */
export default function PropinaGeneral(props: Props) {
  const [monto, setMonto] = useState('')
  const [personas, setPersonas] = useState(props.personas)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bajando, setBajando] = useState(false)
  const [verAfuera, setVerAfuera] = useState(false)

  const montoN = aPesos(monto)
  const reparto = useMemo(() => repartirPropinaGeneral(montoN, personas), [montoN, personas])
  const de = (u: Ubicacion[]) => personas.filter((p) => u.includes(p.ubicacion))
  const sinSector = de(['sin_sector'])
  const afuera = de(['afuera', 'camarero'])
  const incompletas = personas.reduce((s, p) => s + p.incompletas, 0)

  async function mover(p: PersonaPropinaGeneral, grupo: GrupoGeneral | null) {
    const antes = personas
    setError(null)
    setPersonas((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, manual: grupo, ...ubicar({ manual: grupo, sector: x.sector, cargo: x.cargo, puesto: x.puesto }) } : x
      )
    )
    setGuardando(p.id)
    const r = await guardarGrupoGeneralAction(p.id, grupo)
    setGuardando(null)
    if (!r.ok) {
      setPersonas(antes)
      setError(`${p.nombre}: ${r.error}`)
      return
    }
    setAbierta(null)
  }

  async function bajarExcel() {
    setBajando(true)
    setError(await bajarArchivo(`/api/planilla/propina-general?mes=${props.mes}&q=${props.q}&monto=${montoN}`))
    setBajando(false)
  }

  /** Una persona: nombre, de dónde sale, horas y lo que le toca; tocándola se cambia de parte. */
  function fila(p: PersonaPropinaGeneral, siempreAbierta = false) {
    const abiertaAca = siempreAbierta || abierta === p.id
    const parte = p.ubicacion === 'salon' || p.ubicacion === 'cocina' ? reparto[p.ubicacion] : null
    const leToca = parte?.montos.get(p.id) ?? 0
    return (
      <li key={p.id} className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => !siempreAbierta && setAbierta(abiertaAca ? null : p.id)}
          className={cn('w-full flex items-center gap-3 text-left', !siempreAbierta && 'cursor-pointer')}
          aria-expanded={siempreAbierta ? undefined : abiertaAca}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-brand-text truncate">{p.nombre}</span>
            <span className="block text-[11px] text-brand-muted truncate">
              {detalle(p)}
              {p.incompletas > 0 && (
                <span className="text-brand-error"> · {p.incompletas === 1 ? '1 día incompleto' : `${p.incompletas} días incompletos`}</span>
              )}
            </span>
          </span>
          <span className="text-right flex-shrink-0">
            <span className="block text-xs text-brand-muted tabular-nums">{textoHoras(p.horas)} h</span>
            {parte && montoN > 0 && (
              <span className="block text-sm font-bold text-brand-text tabular-nums">{pesos(leToca)}</span>
            )}
          </span>
        </button>
        {abiertaAca && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {OPCIONES.map((o) => {
              const actual = o.valor === p.manual
              return (
                <button
                  key={o.texto}
                  type="button"
                  aria-pressed={actual}
                  disabled={guardando !== null}
                  onClick={() => mover(p, o.valor)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer min-h-[34px] disabled:opacity-60',
                    actual
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
                  )}
                >
                  {o.texto}
                </button>
              )
            })}
            {guardando === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-muted" />}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <label className="block">
          <span className="text-xs text-brand-muted">Monto de la quincena</span>
          <input
            type="text"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 850000"
            className="mt-1 w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-base text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[44px] tabular-nums"
          />
        </label>
        {props.sumaGeneral > 0 && aPesos(monto) !== props.sumaGeneral && (
          <button
            type="button"
            onClick={() => setMonto(String(props.sumaGeneral))}
            className="text-xs text-brand-accent font-semibold underline underline-offset-2 cursor-pointer text-left"
          >
            Usar {pesos(props.sumaGeneral)}: la General de {props.diasConPropina === 1 ? 'el día cargado' : `los ${props.diasConPropina} días cargados`} en
            Propinas
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(['salon', 'cocina'] as const).map((g) => (
            <div key={g} className="rounded-xl border border-brand-border/70 bg-brand-card-hover px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                {NOMBRE_GRUPO[g]} · {g === 'salon' ? 60 : 40} %
              </p>
              <p className="text-base font-bold text-brand-text tabular-nums">{pesos(reparto[g].pozo)}</p>
              <p className="text-[11px] text-brand-muted tabular-nums">
                {de([g]).filter((p) => p.horas > 0).length} personas · {textoHoras(reparto[g].horas)} h
                {reparto[g].porHora > 0 && <> · {pesos(reparto[g].porHora)}/h</>}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={bajarExcel}
          disabled={bajando || montoN <= 0}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          {bajando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Bajar el reparto en Excel
        </button>
      </section>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {props.faltaColumna && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Para poder cambiar a alguien de parte falta correr el SQL de la propina del resto del personal
          (supabase/add_propina_general.sql). El reparto automático anda igual.
        </p>
      )}
      {incompletas > 0 && (
        <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          Hay {incompletas === 1 ? '1 día incompleto' : `${incompletas} días incompletos`} en la quincena: no suman horas.
          Corregilos en la{' '}
          <Link href={`/admin/fichadas/planilla?mes=${props.mes}`} className="font-semibold underline underline-offset-2">
            planilla
          </Link>{' '}
          antes de pagar.
        </p>
      )}

      {sinSector.length > 0 && (
        <section className="bg-brand-card border border-amber-300 rounded-2xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 bg-amber-50">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">Sin sector · {sinSector.length}</h2>
            <p className="text-[11px] text-amber-900 mt-0.5">No cobran hasta que digas dónde van. Queda guardado para las próximas.</p>
          </div>
          <ul className="divide-y divide-brand-border/70">{sinSector.map((p) => fila(p, true))}</ul>
        </section>
      )}

      {(['salon', 'cocina'] as const).map((g) => {
        const lista = de([g])
        return (
          <section key={g} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2 bg-brand-card-hover/50 border-b border-brand-border/40">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {NOMBRE_GRUPO[g]} · {g === 'salon' ? 60 : 40} %
              </h2>
              <span className="text-[11px] text-brand-muted tabular-nums">{lista.length} personas</span>
            </div>
            {lista.length === 0 ? (
              <p className="px-4 py-3 text-xs text-brand-muted">Nadie en esta parte.</p>
            ) : (
              <ul className="divide-y divide-brand-border/70">{lista.map((p) => fila(p))}</ul>
            )}
          </section>
        )
      })}

      {afuera.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setVerAfuera((v) => !v)}
            aria-expanded={verAfuera}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer"
          >
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">No entran · {afuera.length}</span>
              <span className="block text-[11px] text-brand-muted mt-0.5">Camareros (tienen la suya), encargados y administrativos.</span>
            </span>
            <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform flex-shrink-0', verAfuera && 'rotate-180')} />
          </button>
          {verAfuera && <ul className="divide-y divide-brand-border/70 border-t border-brand-border/40">{afuera.map((p) => fila(p))}</ul>}
        </section>
      )}

      <p className="text-[11px] text-brand-muted leading-relaxed">
        Cada uno va en su parte por su sector en Horarios (donde más trabajó en la quincena) o, si no figura, por su cargo.
        Tocá a alguien para cambiarlo de parte: queda guardado. Las horas son las de la planilla.
      </p>
    </div>
  )
}
