'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextWeekDates, isSignupOpen, isValidPreference, isValidMealType } from '@/lib/meals-utils'

export interface MealChange {
  mealDate: string
  mealType: string
  preference: string | null
}

export type SaveResult = { ok: true; saved: number } | { ok: false; error: string }

export async function saveMealSignupsAction(changes: MealChange[]): Promise<SaveResult> {
  if (changes.length === 0) return { ok: true, saved: 0 }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión. Volvé a iniciar sesión e intentá de nuevo.' }

  if (!isSignupOpen()) {
    return {
      ok: false,
      error: 'Las inscripciones cerraron el sábado a las 22hs. Vas a poder anotarte de nuevo el lunes.',
    }
  }

  const weekDays = getNextWeekDates()
  const allowed = new Map(weekDays.map((d) => [d.date, d.meals as string[]]))

  for (const c of changes) {
    const meals = allowed.get(c.mealDate)
    if (!meals) return { ok: false, error: 'Uno de los días no corresponde a la semana que viene.' }
    if (!isValidMealType(c.mealType) || !meals.includes(c.mealType)) {
      return { ok: false, error: 'Ese día no tiene ese tipo de comida.' }
    }
    if (c.preference !== null && !isValidPreference(c.preference)) {
      return { ok: false, error: 'Opción de menú inválida.' }
    }
  }

  const toUpsert = changes
    .filter((c) => c.preference !== null)
    .map((c) => ({
      user_id: session.user.id,
      meal_date: c.mealDate,
      meal_type: c.mealType,
      preference: c.preference as string,
      updated_at: new Date().toISOString(),
    }))

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('meal_signups')
      .upsert(toUpsert, { onConflict: 'user_id,meal_date,meal_type' })
    if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }
  }

  for (const c of changes.filter((x) => x.preference === null)) {
    const { error } = await supabase
      .from('meal_signups')
      .delete()
      .eq('user_id', session.user.id)
      .eq('meal_date', c.mealDate)
      .eq('meal_type', c.mealType)
    if (error) return { ok: false, error: 'No se pudo borrar una opción: ' + error.message }
  }

  revalidatePath('/dashboard/comida')
  revalidatePath('/admin/comida')
  return { ok: true, saved: changes.length }
}
