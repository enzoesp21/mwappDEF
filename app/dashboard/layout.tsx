import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  return (
    <div className="min-h-screen bg-brand-dark">
      <header className="sticky top-0 z-30 bg-brand-dark/95 backdrop-blur-sm border-b border-brand-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 animate-fade-in">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
