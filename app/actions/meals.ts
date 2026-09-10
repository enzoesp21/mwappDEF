'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextWeekDates, isSignupOpen } from '@/lib/meals-utils'

export async function saveMealSignupAction(mealDate: string, mealType: string, preference: string) {
  if (!isSignupOpen()) return { error: 'El plazo cerro el sabado a las 22hs.' }
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }
  const validDates = getNextWeekDates().map(d => d.date)
  if (!validDates.includes(mealDate)) return { error: 'Fecha invalida' }
  const { error } = await supabase.from('meal_signups').upsert(
    { user_id: session.user.id, meal_date: mealDate, meal_type: mealType, preference, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,meal_date,meal_type' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/comida')
  return { success: true }
}

export async function removeMealSignupAction(mealDate: string, mealType: string) {
  if (!isSignupOpen()) return { error: 'El plazo cerro.' }
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }
  const { error } = await supabase.from('meal_signups').delete().eq('user_id', session.user.id).eq('meal_date', mealDate).eq('meal_type', mealType)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/comida')
  return { success: true }
}
