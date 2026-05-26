'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Usuarios', href: '/admin/users', icon: Users, exact: false },
  { label: 'Guías', href: '/admin/guides', icon: BookOpen, exact: false },
  { label: 'Resultados', href: '/admin/results', icon: BarChart2, exact: false },
]

interface AdminNavProps {
  adminName: string
}

export default function AdminNav({ adminName }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-card border-b border-brand-border h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Logo size="sm" />
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-brand-card border-r border-brand-border flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <MobileNavContent
          adminName={adminName}
          isActive={isActive}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-60 bg-brand-card border-r border-brand-border z-30">
        <div className="p-5 border-b border-brand-border">
          <Logo size="md" />
        </div>

        <div className="px-4 py-4 border-b border-brand-border">
          <div className="flex items-center gap-2 text-brand-muted mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
            <span className="text-xs font-medium text-brand-accent">Panel Admin</span>
          </div>
          <p className="text-sm font-medium text-brand-text truncate">{adminName}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer min-h-[44px]',
                isActive(href, exact)
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                  : 'text-brand-muted hover:text-brand-text hover:bg-brand-card-hover'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-brand-border">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors duration-200 cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  )
}

function MobileNavContent({
  adminName,
  isActive,
  loggingOut,
  onLogout,
}: {
  adminName: string
  isActive: (href: string, exact: boolean) => boolean
  loggingOut: boolean
  onLogout: () => void
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-brand-border">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
          <span className="text-xs font-medium text-brand-accent">Panel Admin</span>
        </div>
        <p className="text-sm font-medium text-brand-text truncate">{adminName}</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer min-h-[44px]',
              isActive(href, exact)
                ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-card-hover'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-brand-border">
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors duration-200 cursor-pointer min-h-[44px] disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
        </button>
      </div>
    </>
  )
}
