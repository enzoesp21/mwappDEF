'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const PESTANAS = [
  { href: '/admin/fichadas', etiqueta: 'Ahora', exacta: true },
  { href: '/admin/fichadas/planilla', etiqueta: 'Planilla del mes', exacta: false },
  { href: '/admin/fichadas/empleados', etiqueta: 'Empleados', exacta: false },
  { href: '/admin/fichadas/reloj', etiqueta: 'Reloj', exacta: false },
]

/** Las secciones de Fichadas: quién está adentro ahora y la planilla maestra. */
export default function PestanasFichadas() {
  const ruta = usePathname()
  return (
    <nav aria-label="Secciones de Fichadas" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1.5 px-1 w-max">
        {PESTANAS.map((p) => {
          const activa = p.exacta ? ruta === p.href : ruta.startsWith(p.href)
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'block px-4 py-2 rounded-full text-sm font-semibold border transition-colors',
                  activa
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : 'bg-brand-card border-brand-border text-brand-text hover:border-brand-accent'
                )}
              >
                {p.etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
