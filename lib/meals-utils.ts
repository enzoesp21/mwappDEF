export type MealPreference = 'tradicional' | 'vegetariano' | 'vegano' | 'celiaco' | 'propio'
export type MealType = 'almuerzo' | 'cena'
export interface WeekDay { date: string; dayName: string; meals: MealType[] }

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

export function getNextWeekDates(): WeekDay[] {
  const today = new Date()
  const day = today.getDay()
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(nextMonday)
    date.setDate(nextMonday.getDate() + i)
    const jsDay = date.getDay()
    return { date: date.toISOString().split('T')[0], dayName: DAYS[jsDay], meals: (jsDay === 5 || jsDay === 6) ? ['almuerzo', 'cena'] : ['almuerzo'] }
  })
}

export function getNextWeekStart(): string { return getNextWeekDates()[0].date }

export function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const end = new Date(date)
  end.setDate(date.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return date.toLocaleDateString('es-AR', opts) + ' al ' + end.toLocaleDateString('es-AR', opts)
}

export function isSignupOpen(): boolean {
  const now = new Date()
  const ba = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const day = ba.getUTCDay()
  if (day === 0) return false
  if (day === 6 && ba.getUTCHours() >= 22) return false
  return true
}
