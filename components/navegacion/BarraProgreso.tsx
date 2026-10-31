'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Una línea fina arriba de todo que arranca apenas se toca un link interno y
 * se completa cuando llega la página nueva. Da respuesta inmediata aunque el
 * servidor tarde.
 */
export default function BarraProgreso() {
  const pathname = usePathname()
  const [progreso, setProgreso] = useState(0)
  const [visible, setVisible] = useState(false)
  const avance = useRef<ReturnType<typeof setInterval> | null>(null)
  const desde = useRef(pathname)

  // Arranca al tocar un link a otra página de la app.
  useEffect(() => {
    function alTocar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname === location.pathname) return

      desde.current = location.pathname
      setVisible(true)
      setProgreso(12)
      if (avance.current) clearInterval(avance.current)
      // Avanza cada vez más despacio: nunca llega sola al final.
      avance.current = setInterval(() => setProgreso((p) => p + (90 - p) * 0.12), 180)
    }
    document.addEventListener('click', alTocar, true)
    return () => document.removeEventListener('click', alTocar, true)
  }, [])

  // Termina cuando cambia la página.
  useEffect(() => {
    if (!visible || pathname === desde.current) return
    if (avance.current) clearInterval(avance.current)
    setProgreso(100)
    const t = setTimeout(() => {
      setVisible(false)
      setProgreso(0)
    }, 260)
    return () => clearTimeout(t)
  }, [pathname, visible])

  // Por las dudas: si en 12 segundos no llegó nada, se esconde.
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      if (avance.current) clearInterval(avance.current)
      setVisible(false)
      setProgreso(0)
    }, 12000)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[100] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 220ms ease' }}
    >
      <div
        className="h-full bg-brand-accent shadow-[0_0_8px_rgba(81,109,92,0.6)] rounded-r-full"
        style={{ width: `${progreso}%`, transition: 'width 220ms ease-out' }}
      />
    </div>
  )
}
