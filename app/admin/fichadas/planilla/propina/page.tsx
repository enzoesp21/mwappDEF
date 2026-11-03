import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ubicarEnJornada } from '@/lib/planilla'
import { moverMes, nombreDelMes } from '@/lib/planilla-vista'
import { quincenaPorDefecto } from '@/lib/propina-general'
import { leerPropinaGeneral } from '@/lib/propina-general-datos'
import PropinaGeneral from '@/components/planilla/PropinaGeneral'

export const dynamic = 'force-dynamic'

/** La propina del resto del personal (sin camareros) de una quincena: 60 % Salón, 40 % Cocina. */
export default async function PropinaGeneralPage({ searchParams }: { searchParams: { mes?: string; q?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const porDefecto = quincenaPorDefecto(ubicarEnJornada(Date.now(), false).fecha)
  const pidioMes = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mes ?? '')
  const mes = pidioMes ? searchParams.mes! : porDefecto.mes
  const q: 1 | 2 = searchParams.q === '2' ? 2 : searchParams.q === '1' || pidioMes ? 1 : porDefecto.q

  const { data, error } = await leerPropinaGeneral(supabase, mes, q)
  const anterior = q === 2 ? `?mes=${mes}&q=1` : `?mes=${moverMes(mes, -1)}&q=2`
  const siguiente = q === 1 ? `?mes=${mes}&q=2` : `?mes=${moverMes(mes, 1)}&q=1`

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link
          href={`/admin/fichadas/planilla?mes=${mes}`}
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Planilla de {nombreDelMes(mes).toLowerCase()}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-accent mt-1">Propina del resto del personal</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Sin camareros. Ponés el monto de la quincena: 60 % para Salón y 40 % para Cocina, y cada parte se reparte
          según las horas de la planilla.
        </p>
      </div>

      <nav className="flex items-center justify-between gap-2 bg-brand-card border border-brand-border rounded-2xl px-2 py-1.5" aria-label="Quincena">
        <Link href={anterior} className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent" aria-label="Quincena anterior">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <p className="text-sm font-semibold text-brand-text text-center">
          {nombreDelMes(mes)} · {q === 1 ? '1.ª quincena (1 al 15)' : `2.ª quincena (16 al ${data?.hasta.slice(8) ?? 'fin'})`}
        </p>
        <Link href={siguiente} className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent" aria-label="Quincena siguiente">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </nav>

      {error || !data ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudieron leer las horas.</p>
          <p className="mt-1">Detalle: {error?.message}</p>
        </div>
      ) : !data.hayPlanilla ? (
        <p className="bg-brand-card border border-brand-border rounded-2xl p-4 text-sm text-brand-muted">
          {nombreDelMes(mes)} todavía no tiene planilla.
        </p>
      ) : (
        <PropinaGeneral
          key={`${mes}-${q}`}
          mes={mes}
          q={q}
          personas={data.personas}
          sumaGeneral={data.sumaGeneral}
          diasConPropina={data.diasConPropina}
          faltaColumna={data.faltaColumna}
        />
      )}
    </div>
  )
}
