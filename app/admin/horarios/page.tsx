import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn, formatDateTime } from '@/lib/utils'
import { etiquetaSemana, hoyEnArgentina, lunesDe, sumarDias } from '@/lib/horarios'
import NuevaSemana from '@/components/admin/NuevaSemana'
import BorrarSemana from '@/components/admin/BorrarSemana'

export const dynamic = 'force-dynamic'

export default async function AdminHorariosPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (me?.role !== 'admin') redirect('/dashboard')

  // Sin el contenido: solo hace falta para listar, y son varios KB por semana.
  const { data: semanas } = await supabase
    .from('schedule_weeks')
    .select('id, week_start, status, published_at, updated_at')
    .order('week_start', { ascending: false })
    .limit(20)

  const lista = semanas ?? []
  const lunesActual = lunesDe(hoyEnArgentina())
  const lunesQueViene = sumarDias(lunesActual, 7)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Horarios</h1>
        <p className="text-sm text-brand-muted mt-1 leading-relaxed">
          Armá la semana como borrador y publicala cuando esté lista. Hasta que la publiques, el
          personal no la ve.
        </p>
      </div>

      <NuevaSemana lunesSugerido={lunesQueViene} hayAnterior={lista.length > 0} />

      {lista.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-xl p-8 text-center">
          <CalendarDays className="w-8 h-8 text-brand-muted mx-auto mb-2" />
          <p className="text-sm text-brand-muted">Todavía no hay ninguna semana cargada.</p>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border">
          {lista.map((s) => {
            const lunes = s.week_start as string
            const publicada = s.status === 'published'
            const esEstaSemana = lunes === lunesActual
            const etiqueta = etiquetaSemana(lunes)
            return (
              <div key={s.id as string} className="flex items-center gap-2 pr-2">
                <Link
                  href={'/admin/horarios/' + s.id}
                  className="flex-1 min-w-0 flex items-center gap-3 p-4 hover:bg-brand-card-hover transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-brand-text">{etiqueta}</p>
                      {esEstaSemana && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-accent/15 text-brand-accent">
                          esta semana
                        </span>
                      )}
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-[10px] font-semibold rounded',
                          publicada ? 'bg-brand-success/15 text-brand-success' : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {publicada ? 'publicada' : 'borrador'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {publicada && s.published_at
                        ? 'Publicada ' + formatDateTime(s.published_at as string)
                        : 'Último cambio ' + formatDateTime(s.updated_at as string)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
                </Link>
                {!publicada && <BorrarSemana id={s.id as string} etiqueta={etiqueta} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
