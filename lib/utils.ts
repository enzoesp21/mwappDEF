import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatDateShort(dateString: string) {
  return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(dateString: string) {
  return format(new Date(dateString), "d/MM/yyyy 'a las' HH:mm", { locale: es })
}

export function scoreColor(score: number, passingScore = 70) {
  if (score >= passingScore) return 'text-brand-success'
  if (score >= passingScore - 15) return 'text-yellow-400'
  return 'text-brand-error'
}
