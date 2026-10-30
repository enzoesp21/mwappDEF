import { AlertCircle } from 'lucide-react'

/** Error al leer la progresión. Si faltan las tablas, dice qué SQL correr. */
export default function AvisoProgresion({ error }: { error: string }) {
  const faltaSql = /mozo_niveles|schema cache|does not exist/i.test(error)
  return (
    <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>
        {faltaSql
          ? 'Falta correr el SQL de progresión (supabase/add_progresion_mozos.sql) en Supabase.'
          : 'No se pudo leer la progresión: ' + error}
      </span>
    </div>
  )
}
