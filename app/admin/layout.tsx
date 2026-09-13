import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import NotificationBell from '@/components/NotificationBell'
import type { Notification } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [{ count: pendingCount }, { count: pendingCorrections }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('exam_results')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', 'pending_review'),
  ])

  const { data: rawNotifications } = await supabase
    .from('notifications')
    .select('id, message, is_seen, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = (rawNotifications ?? []) as Pick<
    Notification,
    'id' | 'message' | 'is_seen' | 'created_at'
  >[]
  const unseen = notifications.filter((n) => !n.is_seen)

  return (
    <div className="min-h-screen bg-brand-dark">
      <AdminNav
        adminName={profile.full_name}
        pendingCount={pendingCount ?? 0}
        pendingCorrections={pendingCorrections ?? 0}
      />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <div className="lg:pl-60 pt-14 lg:pt-0">
        <div className="hidden lg:flex justify-end px-8 pt-6">
          <NotificationBell initialCount={unseen.length} notifications={unseen} />
        </div>
        <main className="min-h-screen p-4 md:p-6 lg:px-8 lg:pb-8 lg:pt-2">{children}</main>
      </div>
    </div>
  )
}
