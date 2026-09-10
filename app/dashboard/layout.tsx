import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import type { Notification } from '@/lib/types'
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role === 'admin') redirect('/admin')
  const { data: raw } = await supabase.from('notifications').select('id, message, is_seen, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20)
  const notifs = (raw ?? []) as Pick<Notification, 'id' | 'message' | 'is_seen' | 'created_at'>[]
  const unread = notifs.filter((n) => !n.is_seen)
  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="sticky top-0 z-30 bg-brand-dark/95 backdrop-blur-sm border-b border-brand-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Logo size="sm" />
          <NotificationBell initialCount={unread.length} notifications={unread} />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 animate-fade-in">{children}</main>
      <BottomNav />
    </div>
  )
}
