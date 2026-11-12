import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina, sumarDias } from '@/lib/horarios'
import { leerMes, limitesDelMes, mesDe } from '@/lib/eventos'
import { quienesVenEventos, traerEventos } from '@/lib/eventos-datos'
import CalendarioEventos from '@/components/eventos/CalendarioEventos'

interface Props {
  base: '/admin/eventos' | '/dashboard/eventos'
  searchParams: { mes?: string; dia?: string }
  /** Los encargados ven además a quiénes les dieron el permiso. */
  esAdmin: boolean
}

/** Lo que comparten /admin/eventos y /dashboard/eventos: pide los datos y arma la pantalla. */
export default async function PaginaEventos({ base, searchParams, esAdmin }: Props) {
  const supabase = await createClient()
  const hoy = hoyEnArgentina()
  const mes = leerMes(searchParams.mes) ?? mesDe(hoy)
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? '') ? searchParams.dia! : null
  const { desde, hasta } = limitesDelMes(mes)

  const [delMes, proximos, conPermiso] = await Promise.all([
    traerEventos(supabase, desde, hasta),
    traerEventos(supabase, hoy, sumarDias(hoy, 180)),
    esAdmin ? quienesVenEventos(supabase) : Promise.resolve([] as string[]),
  ])
  const error = delMes.error ?? proximos.error

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Uso interno</p>
        <h1 className="text-2xl font-semibold text-brand-accent leading-tight mt-1">Eventos y mesas</h1>
        <p className="font-serif italic text-brand-text/80 text-base mt-0.5">
          Mesas personalizadas y eventos privados, para saber cuándo tenemos el salón.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <CalendarioEventos
          key={mes}
          base={base}
          mes={mes}
          hoy={hoy}
          dia={dia}
          eventos={delMes.eventos}
          proximos={proximos.eventos}
          autores={{ ...proximos.autores, ...delMes.autores }}
        />
      )}

      {esAdmin && (
        <Link
          href="/admin/users"
          className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-text">Quiénes lo ven</p>
            <p className="text-xs text-brand-muted leading-relaxed">
              {conPermiso.length > 0
                ? `Los encargados y ${conPermiso.join(', ')}.`
                : 'Por ahora solo los encargados.'}{' '}
              Se da en Usuarios, con el botón &quot;Eventos&quot;.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
        </Link>
      )}
    </div>
  )
}
