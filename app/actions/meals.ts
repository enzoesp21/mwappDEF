'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextWeekStart } from '@/lib/meals-utils'

export async function signupForMealAction(preference: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }
  const weekStart = getNextWeekStart()
  const { error } = await supabase.from('meal_signups').upsert(
    { user_id: session.user.id, week_start: weekStart, preference, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,week_start' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/comida')
  return { success: true }
}

export async function cancelMealSignupAction() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }
  const weekStart = getNextWeekStart()
  const { error } = await supabase.from('meal_signups').delete().eq('user_id', session.user.id).eq('week_start', weekStart)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/comida')
  return { success: true }
}
