'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type GradeResult = { ok: true; finalized: boolean } | { ok: false; error: string }

export async function gradeOpenAnswerAction(
  answerId: string,
  isCorrect: boolean,
  comment: string
): Promise<GradeResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión. Volvé a iniciar sesión.' }

  const { data, error } = await supabase.rpc('grade_open_answer', {
    p_answer_id: answerId,
    p_is_correct: isCorrect,
    p_comment: comment.trim() === '' ? null : comment.trim(),
  })

  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  const result = data as { review_status?: string } | null

  revalidatePath('/admin/correcciones')
  revalidatePath('/admin')
  return { ok: true, finalized: result?.review_status === 'graded' }
}
