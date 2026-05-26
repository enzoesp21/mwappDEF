'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Briefcase, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-4 animate-slide-up">
      <h1 className="text-xl font-bold text-brand-text">Mi Perfil</h1>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-accent text-xl font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-bold text-brand-text text-lg">{profile.full_name}</h2>
            <p className="text-brand-muted text-sm">{email}</p>
          </div>
        </div>

        <div className="border-t border-brand-border pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <div>
              <p className="text-brand-muted text-xs">Puesto</p>
              <p className="text-brand-text text-sm font-medium">{profile.puesto}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <div>
              <p className="text-brand-muted text-xs">Rol</p>
              <p className="text-brand-text text-sm font-medium capitalize">{profile.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <div>
              <p className="text-brand-muted text-xs">Miembro desde</p>
              <p className="text-brand-text text-sm font-medium">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-brand-error/30 text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-h-[48px] disabled:opacity-60"
      >
        {loggingOut ? (
          <div className="w-5 h-5 border-2 border-brand-error/30 border-t-brand-error rounded-full animate-spin" />
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </>
        )}
      </button>
    </div>
  )
}
