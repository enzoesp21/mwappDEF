export function getNextWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  return nextMonday.toISOString().split('T')[0]
}

export function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const end = new Date(date)
  end.setDate(date.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${date.toLocaleDateString('es-AR', opts)} al ${end.toLocaleDateString('es-AR', opts)}`
}
