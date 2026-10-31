'use client'

import { usePathname } from 'next/navigation'
let anterior: string | null = null

/**
 * La entrada de cada pantalla del panel: sube apenas. Al volver de algo de
 * adentro a su lista, entra desde la izquierda.
 */
export default function Transicion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const clase = anterior && anterior !== pathname && anterior.startsWith(pathname + '/') ? 'entrada-vuelve' : 'entrada-sube'
  anterior = pathname
  return <div className={'transicion ' + clase}>{children}</div>
}
