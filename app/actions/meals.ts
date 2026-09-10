'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export function getNextWeekStart(): string {
  const today = new Date()
  const day = today.getDay() // 0=domingo, 1=lunes...
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  return nextMonday.toISOString().split('T')[0]
}

export async function signupForMealAction(preference: string) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }

  const weekStart = getNextWeekStart()

  const { error } = await supabase.from('meal_signups').upsert(
    {
      user_id: session.user.id,
      week_start: weekStart,
      preference,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/comida')
  return { success: true }
}

export async function cancelMealSignupAction() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }

  const weekStart = getNextWeekStart()

  const { error } = await supabase
    .from('meal_signups')
    .delete()
    .eq('user_id', session.user.id)
    .eq('week_start', weekStart)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/comida')
  return { success: true }
}
