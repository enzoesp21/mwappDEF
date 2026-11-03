'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SECCIONES, indiceSeccion } from '@/lib/navegacion'

/**
 * El menú de abajo. Marca la sección en el mismo momento en que se toca (sin
 * esperar a que cargue) y una pastilla verde se desliza hasta ella.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const [tocada, setTocada] = useState<number | null>(null)

  // Cuando llega la página nueva, manda otra vez la dirección real.
  useEffect(() => setTocada(null), [pathname])

  const actual = indiceSeccion(pathname)
  const activa = tocada ?? actual
  const ancho = 100 / SECCIONES.length

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-brand-card/85 backdrop-blur-xl border-t border-brand-border/60 shadow-[0_-8px_24px_-18px_rgba(31,45,39,0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <div className="relative flex items-stretch h-16 max-w-2xl mx-auto">
        {/* La pastilla que marca la sección: se desliza de una a otra. */}
        {activa >= 0 && (
          <span
            aria-hidden
            className="absolute top-2 h-8 rounded-full bg-brand-accent/10 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)]"
            style={{
              width: `calc(${ancho}% - 12px)`,
              left: 6,
              transform: `translateX(calc(${activa * 100}% + ${activa * 12}px))`,
            }}
          />
        )}
        {SECCIONES.map(({ href, icon: Icon, label, beta }, i) => {
          const esActiva = i === activa
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (i !== actual) setTocada(i)
              }}
              className="group relative flex-1 flex flex-col items-center justify-center gap-1 pt-1 cursor-pointer select-none"
              aria-current={esActiva ? 'page' : undefined}
            >
              <span className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200 group-active:scale-90',
                    esActiva ? 'text-brand-accent scale-110' : 'text-brand-muted'
                  )}
                  strokeWidth={esActiva ? 2.4 : 1.9}
                />
                {/* Las secciones en fase beta (lib/beta.ts) llevan su marca. */}
                {beta && (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-2.5 px-1 rounded-full bg-brand-accent text-white text-[6.5px] font-bold uppercase leading-[11px] tracking-[0.06em]"
                  >
                    Beta
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'text-[8.5px] leading-none tracking-[-0.02em] whitespace-nowrap transition-colors duration-200',
                  esActiva ? 'text-brand-accent font-semibold' : 'text-brand-muted font-medium'
                )}
              >
                {label}
                {beta && <span className="sr-only">, en fase beta</span>}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
