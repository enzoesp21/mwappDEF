import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ahoraEnArgentina, hoyEnArgentina, lunesDe, sumarDias } from '@/lib/horarios'
import { semanasParaPedir, textoPlazo, textoSemana } from '@/lib/pedidos-horario'
import { faltaSqlPedidos, traerPedidosConNombre } from '@/lib/pedidos-horario-datos'
import PedidosAdmin from '@/components/admin/PedidosAdmin'

export const dynamic = 'force-dynamic'

/**
 * Los pedidos de cambio de horario del personal, de la semana pasada en
 * adelante, para aprobarlos o no. Solo encargados (lo cuida el layout de admin).
 */
export default async function PedidosHorarioPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = hoyEnArgentina()
  const { pedidos, error } = await traerPedidosConNombre(supabase, { desde: sumarDias(lunesDe(hoy), -7) })
  const ahora = ahoraEnArgentina()
  const proxima = semanasParaPedir(ahora)[0]

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <Link
          href="/admin/horarios"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Horarios
        </Link>
        <h1 className="text-2xl font-semibold text-brand-accent mt-1">Pedidos de horario</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Lo que pidió el personal para cada semana. Aprobar no cambia el horario: queda marcado en el editor, al lado de
          esa persona y ese día. Para la semana del {textoSemana(proxima)} se puede pedir hasta el {textoPlazo(proxima)}.
        </p>
      </div>

      {error ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudieron leer los pedidos.</p>
          <p className="mt-1">
            {faltaSqlPedidos(error)
              ? 'Falta correr el SQL de pedidos de horario (supabase/add_pedidos_horario.sql) en Supabase.'
              : `Detalle: ${error}`}
          </p>
        </div>
      ) : (
        <PedidosAdmin pedidos={pedidos} hoy={ahora} />
      )}
    </div>
  )
}
