import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeCargarPropinas } from '@/lib/propinas-datos'
import { hoyEnArgentina } from '@/lib/horarios'
import { armarHoja, fechaDeLaHoja } from '@/lib/plazas'
import { traerPlazas } from '@/lib/plazas-datos'
import HojaPlazas from '@/components/plazas/HojaPlazas'
import BarraImprimir from '@/components/plazas/BarraImprimir'

export const dynamic = 'force-dynamic'

/**
 * La hoja de plazas lista para imprimir en A4, sin el menú de la app (Enzo,
 * 21/11). La abre "Imprimir la hoja" del editor; abre el cuadro de imprimir sola.
 * ?fecha=2026-11-22 para otro día; ?fecha=no deja la línea en blanco.
 */
export default async function ImprimirPlazas({ searchParams }: { searchParams: { fecha?: string; ver?: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  if (!(await puedeCargarPropinas(supabase, session.user.id))) redirect('/')

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  const volver = perfil?.role === 'admin' ? '/admin/plazas' : '/dashboard/plazas'

  const { mozos, filas, error } = await traerPlazas(supabase)
  if (error) {
    return (
      <div className="p-6 text-sm text-brand-error">
        <p className="font-semibold">No se pudo armar la hoja.</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  const pedida = searchParams.fecha
  const fecha =
    pedida === 'no' ? null : fechaDeLaHoja(/^\d{4}-\d{2}-\d{2}$/.test(pedida ?? '') ? pedida! : hoyEnArgentina())

  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-imprimir { display: none !important; }
          .marco-hoja { padding: 0 !important; box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
      <BarraImprimir volver={volver} auto={searchParams.ver === undefined} />
      <div className="overflow-x-auto py-6 print:py-0">
        <div className="marco-hoja mx-auto w-fit bg-white p-[8mm] shadow-lg">
          <HojaPlazas hoja={armarHoja(mozos.map((m) => m.nombre), filas)} fecha={fecha} />
        </div>
      </div>
    </div>
  )
}
