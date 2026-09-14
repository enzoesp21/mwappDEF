const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// Argentina no aplica horario de verano, siempre UTC-3.
function nowInBuenosAires(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

/** Período actual en formato '2026-09'. */
export function currentPeriod(): string {
  const d = nowInBuenosAires()
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
}

/** Período del mes siguiente, que es por el que se vota. */
export function nextPeriod(): string {
  const d = nowInBuenosAires()
  const month = d.getUTCMonth() + 1
  const year = month > 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()
  return year + '-' + String((month % 12) + 1).padStart(2, '0')
}

/** '2026-09' -> 'septiembre 2026' */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const index = Number(month) - 1
  if (!MONTHS[index]) return period
  return MONTHS[index] + ' ' + year
}
