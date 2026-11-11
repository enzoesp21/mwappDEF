import Link from 'next/link'
import { AlertTriangle, ChevronRight, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { avisoConexion } from '@/lib/fichadas'
import { traerAdentroAhora } from '@/lib/fichadas-datos'
import AdentroAhora from '@/components/fichadas/AdentroAhora'
import RefrescoAutomatico from '@/components/fichadas/RefrescoAutomatico'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Lo primero que ven los encargados al abrir el panel (Enzo, 11/11: "el
 * dashboard no me interesa"; eligió "quién está adentro ahora"). Antes había
 * números de capacitación; esos siguen en Resultados.
 */
export default async function InicioAdmin() {
  const supabase = await createClient()
  const ahora = Date.now()
  const { datos, error } = await traerAdentroAhora(supabase, ahora)
  const aviso = avisoConexion(datos?.estado ?? null, ahora)
  const fecha = new Date(ahora).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <RefrescoAutomatico segundos={30} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">{fecha}</p>
        <h1 className="text-2xl font-semibold text-brand-accent leading-tight mt-1">Ahora en Waikiki</h1>
        <p className="text-sm text-brand-muted mt-0.5">Quién está fichado en este momento. Se actualiza sola cada 30 s.</p>
      </div>

      {datos && aviso.nivel !== 'ok' && (
        <div
          className={cn(
            'rounded-2xl border p-4 flex gap-3',
            aviso.nivel === 'problema'
              ? 'bg-brand-error/10 border-brand-error/30 text-brand-error'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          )}
        >
          {aviso.nivel === 'problema' ? (
            <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{aviso.titulo}</p>
            {aviso.detalle && <p className="mt-0.5 leading-relaxed">{aviso.detalle}</p>}
          </div>
        </div>
      )}

      {error || !datos ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudo leer quién está adentro.</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <AdentroAhora
          conTotal
          fichadas={datos.fichadas}
          inicios={datos.inicios}
          cierres={datos.cierres}
          personas={datos.personas}
          semanas={datos.semanas}
          ahora={ahora}
        />
      )}

      <Link
        href="/admin/fichadas"
        className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-2xl p-4 hover:border-brand-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-text">Fichadas</p>
          <p className="text-xs text-brand-muted">Quién vino y se fue hoy, y el mes día por día</p>
        </div>
        <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
      </Link>
    </div>
  )
}
