'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitSuggestionAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }

  const content = formData.get('content') as string
  const category = formData.get('category') as string

  if (!content?.trim() || content.trim().length < 10) {
    return { error: 'El mensaje debe tener al menos 10 caracteres.' }
  }

  const { error } = await supabase.from('suggestions').insert({
    user_id: session.user.id,
    content: content.trim(),
    category: category === 'reclamo' ? 'reclamo' : 'sugerencia',
  })

  if (error) return { error: 'Error al enviar. Intentá de nuevo.' }

  revalidatePath('/dashboard/sugerencias')
  return { success: true }
}

export async function markSuggestionReadAction(
  suggestionId: string,
  targetUserId: string,
  category: string
) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('suggestions')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: session.user.id,
    })
    .eq('id', suggestionId)

  if (error) return { error: error.message }

  await supabase.from('notifications').insert({
    user_id: targetUserId,
    message: `Tu ${category} fue leída por los administradores. ¡Gracias por tu aporte!`,
  })

  revalidatePath('/admin/sugerencias')
  return { success: true }
}

export async function markAllNotificationsSeenAction() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'No autenticado' }

  await supabase
    .from('notifications')
    .update({ is_seen: true })
    .eq('user_id', session.user.id)
    .eq('is_seen', false)

  revalidatePath('/dashboard')
  return { success: true }
}
