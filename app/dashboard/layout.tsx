import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import PendingApproval from '@/components/PendingApproval'
import Onboarding from '@/components/Onboarding'
import type { Notification } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, status, experience')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  if (profile && profile.status !== 'approved') {
    return (
      <PendingApproval
        status={
          profile.status === 'rejected' || profile.status === 'inactive'
            ? profile.status
            : 'pending'
        }
        fullName={profile.full_name ?? ''}
      />
    )
  }

  if (profile && !profile.experience) {
    const { data: guide } = await supabase
      .from('guides')
      .select('id')
      .ilike('title', '%Nuevos y No Tan Nuevos%')
      .limit(1)
      .maybeSingle()

    return <Onboarding fullName={profile.full_name ?? ''} guideId={guide?.id ?? null} />
  }

  const { data: rawNotifications } = await supabase
    .from('notifications')
    .select('id, message, is_seen, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = (rawNotifications ?? []) as Pick<Notification, 'id' | 'message' | 'is_seen' | 'created_at'>[]
  const unreadCount = notifications.filter((n) => !n.is_seen).length
  const notifList = notifications.filter((n) => !n.is_seen)

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="sticky top-0 z-30 bg-brand-dark/95 backdrop-blur-sm border-b border-brand-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Logo size="sm" />
          <NotificationBell initialCount={unreadCount} notifications={notifList} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 animate-fade-in">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
