'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { borrarSemanaAction } from '@/app/actions/horarios'

export default function BorrarSemana({ id, etiqueta }: { id: string; etiqueta: string }) {
  const router = useRouter()
  const [borrando, setBorrando] = useState(false)

  async function borrar() {
    if (!confirm('¿Borrar el borrador de la semana del ' + etiqueta + '? No se puede deshacer.')) return
    setBorrando(true)
    const res = await borrarSemanaAction(id)
    setBorrando(false)
    if (res.ok) router.refresh()
    else alert(res.error)
  }

  return (
    <button
      type="button"
      onClick={borrar}
      disabled={borrando}
      aria-label={'Borrar el borrador del ' + etiqueta}
      className="p-2 rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer disabled:opacity-50"
    >
      {borrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
