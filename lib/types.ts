export type UserRole = 'staff' | 'admin'

export const PUESTOS = [
  'Calienta Platos',
  'Cocina',
  'Barra',
  'Bacha',
  'Caja',
  'Limpieza',
  'Ensaladas',
  'Pastelería',
  'Mozos',
  'Commis',
  'Recepción',
] as const

export type Puesto = (typeof PUESTOS)[number]

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  puesto: string
  status: UserStatus
  created_at: string
}

export interface Guide {
  id: string
  title: string
  description: string
  content: string
  puestos: string[]
  created_at: string
  updated_by: string | null
}

export interface Exam {
  id: string
  guide_id: string
  title: string
  passing_score: number
}

export type QuestionType = 'multiple_choice' | 'open'

export interface ExamQuestion {
  id: string
  exam_id: string
  question: string
  options: string[]
  // null en las preguntas abiertas: las corrige un admin a mano
  correct_option: number | null
  question_type: QuestionType
  answer_guide?: string | null
  order: number
}

export interface ExamResult {
  id: string
  user_id: string
  exam_id: string
  score: number
  passed: boolean
  completed_at: string
  signature_data: string | null
}

export interface GuideWithStatus extends Guide {
  exam?: Exam & { questions_count?: number }
  result?: ExamResult
  status: 'not_started' | 'reading' | 'exam_pending' | 'passed'
}

export interface ExamWithQuestions extends Exam {
  questions: ExamQuestion[]
  guide: Guide
}

export interface AdminUserView extends Profile {
  email?: string
  exam_results_count?: number
}

export interface Suggestion {
  id: string
  user_id: string
  content: string
  category: 'sugerencia' | 'reclamo'
  is_read: boolean
  read_at: string | null
  read_by: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  message: string
  is_seen: boolean
  created_at: string
}
