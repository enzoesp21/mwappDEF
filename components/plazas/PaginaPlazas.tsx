import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina } from '@/lib/horarios'
import { traerPlazas } from '@/lib/plazas-datos'
import EditorPlazas from '@/components/plazas/EditorPlazas'

/** Lo que comparten /admin/plazas y /dashboard/plazas. */
export default async function PaginaPlazas() {
  const supabase = await createClient()
  const { mozos, filas, error } = await traerPlazas(supabase)
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Para imprimir</p>
        <h1 className="text-2xl font-semibold text-brand-accent leading-tight mt-1">Hoja de plazas</h1>
        <p className="text-sm text-brand-muted mt-0.5 leading-relaxed">
          La de todos los días. Lo que cambies acá lo ven al momento las otras cajeras. Se imprime y se completa a mano.
        </p>
      </div>
      {error ? (
        <div className="flex items-start gap-2 bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <EditorPlazas mozos={mozos} filas={filas} hoy={hoyEnArgentina()} />
      )}
    </div>
  )
}
