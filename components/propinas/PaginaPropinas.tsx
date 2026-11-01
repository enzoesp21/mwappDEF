import Link from 'next/link'
import { Banknote, ChevronRight, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina } from '@/lib/horarios'
import { listarDias, misPropinas, permisosPropinas } from '@/lib/propinas-datos'
import ListaDias from '@/components/propinas/ListaDias'
import MisPropinas from '@/components/propinas/MisPropinas'
import AvisoPropinas from '@/components/propinas/AvisoPropinas'

interface Props {
  base: string
  userId: string
}

/**
 * La pantalla de propinas.
 * - Quien carga: los días cargados para editarlos, y lo suyo si trabajó.
 * - Mozos y runners: lo suyo y el reparto de todos, de solo lectura.
 * - El resto: solo lo suyo.
 */
export default async function PaginaPropinas({ base, userId }: Props) {
  const supabase = await createClient()
  const { puedeCargar, veTodas } = await permisosPropinas(supabase, userId)

  const [lista, mias] = await Promise.all([
    veTodas ? listarDias(supabase) : Promise.resolve(null),
    misPropinas(supabase, userId),
  ])
  const error = lista?.error ?? mias.error
  const mes = hoyEnArgentina().slice(0, 7)

  return (
    <div className="space-y-5 max-w-2xl animate-slide-up">
      <div>
        <h1 className="text-2xl font-semibold text-brand-accent flex items-center gap-2">
          <Banknote className="w-6 h-6 text-brand-accent" />
          Propinas
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {veTodas ? 'El reparto del salón, día por día.' : 'Lo que te tocó cada día.'}
        </p>
      </div>

      {error ? (
        <AvisoPropinas error={error} />
      ) : puedeCargar ? (
        <>
          {/* Solo encargados: el grupo de cada uno, que la cajera ve ya separado. */}
          {base.startsWith('/admin') && (
            <Link
              href="/admin/propinas/grupos"
              className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl px-4 py-3 hover:border-brand-accent transition-colors"
            >
              <Users className="w-5 h-5 text-brand-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-text">Grupos de propina</p>
                <p className="text-xs text-brand-muted">Quién va al 100, al 75 y al 50 %</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
            </Link>
          )}
          {lista && <ListaDias base={base} dias={lista.dias} />}
          {mias.propinas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-text">Tus propinas</h2>
              <MisPropinas propinas={mias.propinas} mes={mes} />
            </section>
          )}
        </>
      ) : (
        <>
          <section className="space-y-3">
            {veTodas && <h2 className="text-sm font-semibold text-brand-text">Tus propinas</h2>}
            <MisPropinas propinas={mias.propinas} mes={mes} />
          </section>
          {lista && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-text">Reparto de cada día</h2>
              <ListaDias base={base} dias={lista.dias} puedeCargar={false} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
