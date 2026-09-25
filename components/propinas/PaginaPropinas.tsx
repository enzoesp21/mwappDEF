import { Banknote } from 'lucide-react'
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
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
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
