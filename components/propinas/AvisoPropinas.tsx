import { AlertCircle } from 'lucide-react'

/** Error al leer propinas. Si faltan las tablas, dice qué SQL correr. */
export default function AvisoPropinas({ error }: { error: string }) {
  const faltaSql = /tip_days|tip_entries|schema cache|does not exist/i.test(error)
  return (
    <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>
        {faltaSql
          ? 'Falta correr el SQL de propinas (supabase/add_propinas.sql) en Supabase.'
          : 'No se pudieron leer las propinas: ' + error}
      </span>
    </div>
  )
}
