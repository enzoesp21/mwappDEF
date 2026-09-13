export type MealPreference = 'tradicional' | 'vegetariano' | 'vegano' | 'celiaco' | 'propio'
export type MealType = 'almuerzo' | 'cena'

export interface WeekDay {
  date: string
  dayName: string
  meals: MealType[]
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Argentina no aplica horario de verano, siempre UTC-3.
function nowInBuenosAires(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function getNextWeekDates(): WeekDay[] {
  const today = nowInBuenosAires()
  const day = today.getUTCDay()
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day

  const days: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() + daysUntilNextMonday + i)
    const dow = d.getUTCDay()
    // Viernes y sábado tienen descanso de cena además del almuerzo.
    const meals: MealType[] = dow === 5 || dow === 6 ? ['almuerzo', 'cena'] : ['almuerzo']
    days.push({ date: toISODate(d), dayName: DAY_NAMES[dow], meals })
  }
  return days
}

export function getNextWeekStart(): string {
  return getNextWeekDates()[0].date
}

export function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const end = new Date(date)
  end.setDate(date.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return date.toLocaleDateString('es-AR', opts) + ' al ' + end.toLocaleDateString('es-AR', opts)
}

// Cierre de inscripción para la semana siguiente.
// Único lugar donde se define: día de la semana (0 = domingo) y hora.
const CUTOFF_DAY = 0
const CUTOFF_HOUR = 21

export const SIGNUP_CUTOFF_LABEL = 'el domingo a las 21hs'

export function isSignupOpen(): boolean {
  const ba = nowInBuenosAires()
  return !(ba.getUTCDay() === CUTOFF_DAY && ba.getUTCHours() >= CUTOFF_HOUR)
}

export function isValidPreference(value: string): value is MealPreference {
  return ['tradicional', 'vegetariano', 'vegano', 'celiaco', 'propio'].includes(value)
}

export function isValidMealType(value: string): value is MealType {
  return value === 'almuerzo' || value === 'cena'
}
