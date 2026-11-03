import { BookOpen, CalendarDays, Home, MessageSquarePlus, Trophy, User, Utensils, type LucideIcon } from 'lucide-react'
import { EN_BETA } from '@/lib/beta'

/** Las secciones del menú de abajo, en orden. `beta`: lleva la marca de fase beta. */
export const SECCIONES: { href: string; icon: LucideIcon; label: string; beta?: boolean }[] = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/guides', icon: BookOpen, label: 'Guías' },
  { href: '/dashboard/horario', icon: CalendarDays, label: 'Horario' },
  { href: '/dashboard/comida', icon: Utensils, label: 'Comida' },
  { href: '/dashboard/resultados', icon: Trophy, label: 'Resultados', beta: EN_BETA.resultados },
  { href: '/dashboard/sugerencias', icon: MessageSquarePlus, label: 'Sugerencias' },
  { href: '/dashboard/profile', icon: User, label: 'Perfil' },
]

/** En qué sección del menú está una dirección; -1 si no es ninguna. */
export function indiceSeccion(pathname: string): number {
  // De la más específica a la más general, para que "/dashboard" no gane siempre.
  for (let i = SECCIONES.length - 1; i >= 0; i--) {
    const href = SECCIONES[i].href
    if (href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/')) return i
  }
  return -1
}
