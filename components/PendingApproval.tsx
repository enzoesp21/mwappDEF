'use client'

import { Clock, XCircle, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

interface Props {
  status: 'pending' | 'rejected' | 'inactive'
  fullName: string
}

export default function PendingApproval({ status, fullName }: Props) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  async function handleLogout() {
    setLeaving(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const blocked = status === 'rejected' || status === 'inactive'
  const inactive = status === 'inactive'

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
          <div
            className={
              'w-14 h-14 rounded-full flex items-center justify-center mx-auto ' +
              (blocked ? 'bg-brand-error/10' : 'bg-brand-accent/10')
            }
          >
            {blocked ? (
              <XCircle className="w-7 h-7 text-brand-error" />
            ) : (
              <Clock className="w-7 h-7 text-brand-accent" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-bold text-brand-text">
              {inactive
                ? 'Tu cuenta fue dada de baja'
                : blocked
                  ? 'Acceso no aprobado'
                  : 'Tu cuenta está pendiente'}
            </h1>
            <p className="text-sm text-brand-muted leading-relaxed">
              {inactive ? (
                <>
                  Tu cuenta ya no tiene acceso a la aplicación. Si creés que es un error, hablá
                  con Facundo o Enzo.
                </>
              ) : blocked ? (
                <>
                  Tu solicitud de acceso fue rechazada. Si creés que es un error, hablá con
                  Facundo o Enzo.
                </>
              ) : (
                <>
                  Hola {fullName}. Tu registro llegó bien y un encargado lo tiene que aprobar
                  antes de que puedas entrar. Te avisamos apenas esté listo.
                </>
              )}
            </p>
          </div>

          {!blocked && (
            <p className="text-xs text-brand-muted bg-brand-dark rounded-xl px-3 py-2">
              Si ya te avisaron que te aprobaron, cerrá sesión y volvé a entrar.
            </p>
          )}

          <button
            onClick={handleLogout}
            disabled={leaving}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-card-hover border border-brand-border text-brand-text font-medium text-sm hover:border-brand-accent/50 transition-colors cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {leaving ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
