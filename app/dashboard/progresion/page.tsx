import { redirect } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cargarProgresion } from '@/lib/progresion-datos'
import { datosNivel } from '@/lib/progresion'
import TimelineNiveles from '@/components/progresion/TimelineNiveles'
import AvisoProgresion from '@/components/progresion/AvisoProgresion'

export const dynamic = 'force-dynamic'

/** El mozo ve en qué nivel está y qué le falta para el siguiente. */
export default async function MiProgresionPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { puesto, estado, error } = await cargarProgresion(supabase, session.user.id)
  if (!error && puesto !== 'Mozos') redirect('/dashboard')

  const actual = datosNivel(estado?.nivel ?? 0)
  const siguiente = estado?.niveles.find((n) => n.estado === 'siguiente')

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-2xl font-semibold text-brand-accent flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-accent" />
          Tu progresión
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">Del 50 % al 100 % de la propina por hora, en tres niveles.</p>
      </div>

      {error || !estado ? (
        <AvisoProgresion error={error ?? 'sin datos'} />
      ) : (
        <>
          <section className="bg-brand-card border border-brand-accent/40 rounded-2xl p-5">
            {actual ? (
              <>
                <p className="text-brand-muted text-xs font-medium uppercase tracking-wider">
                  Nivel {actual.nivel} · {actual.nombre}
                </p>
                <p className="text-4xl font-bold text-brand-accent mt-1">{actual.porcentaje} %</p>
                <p className="text-sm text-brand-muted mt-1">
                  {siguiente
                    ? estado.puedeSubir
                      ? `Cumplís todo para el ${siguiente.porcentaje} %. Un encargado te lo confirma en la próxima revisión.`
                      : `Para el ${siguiente.porcentaje} % te ${estado.faltan.length === 1 ? 'falta 1 cosa' : `faltan ${estado.faltan.length} cosas`}: las ves abajo.`
                    : 'Estás en el nivel más alto. ¡Bien ahí!'}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-brand-text">Todavía no tenés un nivel asignado</p>
                <p className="text-sm text-brand-muted mt-1">
                  Te lo pone un encargado. Mientras tanto, abajo ves qué pide cada nivel.
                </p>
              </>
            )}
          </section>

          <TimelineNiveles estado={estado} />

          <p className="text-xs text-brand-muted leading-relaxed px-1">
            Los exámenes se tildan solos cuando los aprobás. El resto lo evalúan los encargados cada 15 días. Una falta
            grave o errores que se repiten pueden hacerte volver al nivel anterior.
          </p>
        </>
      )}
    </div>
  )
}
