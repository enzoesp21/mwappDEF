'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/guides', icon: BookOpen, label: 'Guías' },
  { href: '/dashboard/progress', icon: TrendingUp, label: 'Progreso' },
  { href: '/dashboard/profile', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-brand-card border-t border-brand-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg',
                'transition-colors duration-200 min-w-[64px] cursor-pointer',
                isActive
                  ? 'text-brand-accent'
                  : 'text-brand-muted hover:text-brand-text'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(212,160,23,0.6)]')}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
