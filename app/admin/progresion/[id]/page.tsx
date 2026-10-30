import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { cargarProgresion } from '@/lib/progresion-datos'
import { datosNivel } from '@/lib/progresion'
import AccionesNivel from '@/components/progresion/AccionesNivel'
import TimelineNiveles from '@/components/progresion/TimelineNiveles'
import AvisoProgresion from '@/components/progresion/AvisoProgresion'

export const dynamic = 'force-dynamic'

export default async function ProgresionMozoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { nombre, puesto, estado, historial, error } = await cargarProgresion(supabase, params.id)
  if (!error && !nombre) notFound()
  const actual = datosNivel(estado?.nivel ?? 0)

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <div>
        <Link
          href="/admin/progresion"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Progresión
        </Link>
        <h1 className="text-2xl font-bold text-brand-text mt-1">{nombre}</h1>
        <p className="text-sm text-brand-muted">
          {actual ? `Nivel ${actual.nivel} · ${actual.nombre} · ${actual.porcentaje} % de la propina` : 'Sin nivel asignado'}
          {estado?.desde && actual && ` · desde el ${formatDate(estado.desde + 'T12:00:00')}`}
          {puesto && puesto !== 'Mozos' && ` · puesto ${puesto}`}
        </p>
      </div>

      {error || !estado ? (
        <AvisoProgresion error={error ?? 'sin datos'} />
      ) : (
        <>
          <AccionesNivel userId={params.id} nombre={nombre} estado={estado} />
          <TimelineNiveles estado={estado} editable={estado.nivel !== null} userId={params.id} />

          {historial.length > 0 && (
            <section className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-brand-text mb-2">Historial</h2>
              <ul className="space-y-2">
                {historial.map((h, i) => {
                  const sube = (h.nivel_anterior ?? 0) < h.nivel_nuevo
                  return (
                    <li key={i} className="text-xs text-brand-text">
                      <span className="text-brand-muted">{formatDate(h.created_at)} · </span>
                      {h.nivel_anterior === null
                        ? `Empezó en el nivel ${h.nivel_nuevo}`
                        : `${sube ? 'Subió' : 'Bajó'} del nivel ${h.nivel_anterior} al ${h.nivel_nuevo}`}
                      {h.motivo && <span className="text-brand-muted"> — {h.motivo}</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
