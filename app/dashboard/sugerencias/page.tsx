import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Clock, MessageSquare, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import SugerenciasForm from '@/components/SugerenciasForm'
import type { Suggestion } from '@/lib/types'

export default async function SugerenciasPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  const items = (suggestions ?? []) as Suggestion[]

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Sugerencias y Reclamos</h1>
        <p className="text-brand-muted text-sm mt-0.5">
          Envianos tus ideas, comentarios o inquietudes.
        </p>
      </div>

      <SugerenciasForm />

      {items.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Tus envíos anteriores
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.category === 'reclamo' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-error bg-brand-error/10 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Reclamo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" />
                        Sugerencia
                      </span>
                    )}
                  </div>
                  {item.is_read ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-brand-success">
                      <CheckCircle className="w-3 h-3" />
                      Leído
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-brand-muted">
                      <Clock className="w-3 h-3" />
                      Pendiente
                    </span>
                  )}
                </div>

                <p className="text-sm text-brand-text leading-relaxed">{item.content}</p>

                <p className="text-[10px] text-brand-muted">
                  {formatDateTime(item.created_at)}
                  {item.is_read && item.read_at && (
                    <span className="ml-2 text-brand-success">
                      · Leído el {formatDateTime(item.read_at)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
