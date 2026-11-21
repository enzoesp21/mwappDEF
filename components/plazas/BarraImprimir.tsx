'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'

/**
 * Arriba de la hoja, solo en pantalla (no sale impresa): imprimir y volver. Al
 * abrir, después de que cargan el logo y las letras, abre el cuadro de
 * imprimir solo.
 */
export default function BarraImprimir({ volver, auto }: { volver: string; auto: boolean }) {
  useEffect(() => {
    if (!auto) return
    let hecho = false
    const imprimir = () => {
      if (hecho) return
      hecho = true
      window.print()
    }
    const listo = Promise.all([
      document.fonts?.ready,
      ...Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true })))),
    ])
    listo.then(() => setTimeout(imprimir, 150))
    // Si algo tarda de más, igual se abre.
    const t = setTimeout(imprimir, 2500)
    return () => clearTimeout(t)
  }, [auto])

  return (
    <div className="no-imprimir sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-brand-card border-b border-brand-border">
      <a href={volver} className="text-sm font-semibold text-brand-muted hover:text-brand-accent">
        ← Volver
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-accent text-white text-sm font-semibold uppercase tracking-[0.12em] cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  )
}
