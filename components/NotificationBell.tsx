'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import { markAllNotificationsSeenAction } from '@/app/actions/suggestions'
import type { Notification } from '@/lib/types'

interface NotificationBellProps {
  initialCount: number
  notifications: Pick<Notification, 'id' | 'message' | 'created_at'>[]
}

export default function NotificationBell({ initialCount, notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsSeenAction()
      setCount(0)
      setOpen(false)
    })
  }

  if (count === 0 && notifications.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label={`${count} notificaciones sin leer`}
      >
        <Bell className="w-5 h-5 text-brand-muted" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-brand-error text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-brand-card border border-brand-border rounded-2xl shadow-lg z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
            <h3 className="text-sm font-semibold text-brand-text">Notificaciones</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer"
            >
              <X className="w-4 h-4 text-brand-muted" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-brand-border">
            {notifications.length === 0 ? (
              <p className="text-center text-brand-muted text-sm py-6">Sin notificaciones.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm text-brand-text leading-snug">{n.message}</p>
                  <p className="text-[10px] text-brand-muted mt-1">{formatDateTime(n.created_at)}</p>
                </div>
              ))
            )}
          </div>

          {count > 0 && (
            <div className="px-4 py-3 border-t border-brand-border">
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                {isPending ? 'Marcando...' : 'Marcar todo como leído'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
