'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

interface Props {
  /** El inicio de cada uno: '/dashboard' o '/admin'. */
  href: string
  size?: 'sm' | 'md'
  onClick?: () => void
}

/**
 * El logo de arriba lleva al inicio. Si ya estás en el inicio, sube hasta
 * arriba de todo, como en Instagram.
 */
export default function LogoInicio({ href, size = 'sm', onClick }: Props) {
  const pathname = usePathname()
  return (
    <Link
      href={href}
      aria-label="Ir al inicio"
      onClick={(e) => {
        onClick?.()
        if (pathname === href) {
          e.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }}
      className="-m-1 p-1 rounded-full flex-shrink-0 transition-transform duration-150 active:scale-95"
    >
      <Logo size={size} />
    </Link>
  )
}
