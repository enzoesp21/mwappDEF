'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface GuidesClientActionsProps {
  guideId: string
  guideTitle: string
}

export default function GuidesClientActions({ guideId, guideTitle }: GuidesClientActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('guides').delete().eq('id', guideId)
    router.refresh()
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-xs text-brand-muted flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-brand-error" />
          ¿Confirmar?
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-2 py-1 text-xs font-medium text-brand-error border border-brand-error/30 rounded hover:bg-brand-error/10 transition-colors duration-200 cursor-pointer disabled:opacity-50 min-h-[32px]"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí, eliminar'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs font-medium text-brand-muted hover:text-brand-text transition-colors duration-200 cursor-pointer min-h-[32px]"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/guides/${guideId}/edit`}
        className="p-2 rounded-lg text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
        title={`Editar ${guideTitle}`}
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
        title={`Eliminar ${guideTitle}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
