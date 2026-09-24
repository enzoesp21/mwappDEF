import { Banknote } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina } from '@/lib/horarios'
import { listarDias, misPropinas, puedeCargarPropinas } from '@/lib/propinas-datos'
import ListaDias from '@/components/propinas/ListaDias'
import MisPropinas from '@/components/propinas/MisPropinas'
import AvisoPropinas from '@/components/propinas/AvisoPropinas'

interface Props {
  base: string
  userId: string
}

/**
 * La pantalla de propinas. Quien carga ve los días cargados; el resto, solo
 * lo suyo. Quien carga y además trabajó en el salón, ve las dos cosas.
 */
export default async function PaginaPropinas({ base, userId }: Props) {
  const supabase = await createClient()
  const puedeCargar = await puedeCargarPropinas(supabase, userId)

  const [lista, mias] = await Promise.all([
    puedeCargar ? listarDias(supabase) : Promise.resolve(null),
    misPropinas(supabase, userId),
  ])
  const error = lista?.error ?? mias.error

  return (
    <div className="space-y-5 max-w-2xl animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Banknote className="w-6 h-6 text-brand-accent" />
          Propinas
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {puedeCargar ? 'El reparto del salón, día por día.' : 'Lo que te tocó cada día.'}
        </p>
      </div>

      {error ? (
        <AvisoPropinas error={error} />
      ) : (
        <>
          {lista && <ListaDias base={base} dias={lista.dias} />}
          {(!puedeCargar || mias.propinas.length > 0) && (
            <section className="space-y-3">
              {puedeCargar && <h2 className="text-sm font-semibold text-brand-text">Tus propinas</h2>}
              <MisPropinas propinas={mias.propinas} mes={hoyEnArgentina().slice(0, 7)} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
