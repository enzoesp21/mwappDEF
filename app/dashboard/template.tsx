'use client'

import { usePathname } from 'next/navigation'
import { indiceSeccion } from '@/lib/navegacion'

// Dónde estaba antes, para saber de qué lado entra la sección nueva. Vive
// fuera del componente porque el template se vuelve a montar en cada cambio.
let anterior: { pathname: string; seccion: number } | null = null

/**
 * La entrada de cada pantalla. Entre secciones del menú de abajo, la nueva
 * entra desde el costado hacia el que se movió el dedo (Guías → Horario, de
 * la derecha). Al entrar a algo de adentro (una guía, un día), sube apenas.
 */
export default function Transicion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const seccion = indiceSeccion(pathname)

  let clase = 'entrada-sube'
  if (anterior && anterior.pathname !== pathname) {
    const eraSeccion = anterior.pathname === '/dashboard' || indiceSeccion(anterior.pathname) >= 0
    if (seccion >= 0 && eraSeccion && anterior.seccion >= 0 && seccion !== anterior.seccion) {
      clase = seccion > anterior.seccion ? 'entrada-derecha' : 'entrada-izquierda'
    } else if (anterior.pathname.startsWith(pathname + '/')) {
      // Volver de algo de adentro a su lista.
      clase = 'entrada-vuelve'
    }
  }
  anterior = { pathname, seccion }

  return <div className={'transicion ' + clase}>{children}</div>
}
