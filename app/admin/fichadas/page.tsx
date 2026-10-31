import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { desdeParaPedir, type EstadoFichero, type Fichada, type PersonaFichero } from '@/lib/fichadas'
import VistaFichadas, { Encabezado } from '@/components/fichadas/VistaFichadas'

export const dynamic = 'force-dynamic'

/** Quién está adentro ahora y lo que se fichó en el día, desde el reloj de la entrada. */
export default async function FichadasPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const ahora = Date.now()
  const [fichadasRes, personasRes, estadoRes] = await Promise.all([
    supabase
      .from('fichadas')
      .select('logid, userid, fecha_hora, tipo, dispositivo')
      .gte('fecha_hora', desdeParaPedir(ahora))
      .order('fecha_hora', { ascending: true })
      .limit(3000),
    supabase.from('fichero_personas').select('userid, nombre, sector'),
    supabase.from('fichero_estado').select('ultima_conexion, ultima_fichada_crosschex, error').maybeSingle(),
  ])

  const error = fichadasRes.error ?? personasRes.error ?? estadoRes.error
  if (error) {
    return (
      <div className="max-w-3xl space-y-5 animate-fade-in">
        <Encabezado />
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudieron leer las fichadas.</p>
          <p className="mt-1">
            Si todavía no corriste <code>supabase/add_fichadas.sql</code> en Supabase, falta eso. Detalle: {error.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <VistaFichadas
      fichadas={(fichadasRes.data ?? []) as Fichada[]}
      personas={(personasRes.data ?? []) as PersonaFichero[]}
      estado={estadoRes.data as EstadoFichero | null}
      ahora={ahora}
    />
  )
}
