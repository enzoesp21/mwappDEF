import { redirect } from 'next/navigation'
import { Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const HORA = 3600 * 1000

interface Fila {
  contacto: string
  rol: 'user' | 'assistant'
  contenido: string
  accion: string | null
  creado_en: string
}

interface Numeros {
  personas: number
  pdf: number
  quisieronReservar: number
  coordinandoPago: number
}

/** "2026-11-16" del día en Argentina (UTC-3). */
const diaArgentina = (iso: string) => new Date(new Date(iso).getTime() - 3 * HORA).toISOString().slice(0, 10)

/** "lun 16/11" para la tabla. */
function diaCorto(dia: string) {
  const [anio, mes, d] = dia.split('-').map(Number)
  const semana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(Date.UTC(anio, mes - 1, d)).getUTCDay()]
  return `${semana} ${d}/${mes}`
}

// "Quiso reservar": escribió algo con "reserv…" o el bot le tomó la reserva.
// "Coordinando pago": el bot terminó de tomar la reserva y la siguió Paz.
function contar(filas: Fila[]): Numeros {
  const personas = new Set<string>()
  const quisieron = new Set<string>()
  const coordinando = new Set<string>()
  let pdf = 0
  for (const f of filas) {
    if (f.rol === 'user') {
      personas.add(f.contacto)
      if (f.contenido.toLowerCase().includes('reserv')) quisieron.add(f.contacto)
    }
    if (f.accion === 'pdf') pdf++
    if (f.accion === 'reserva') {
      quisieron.add(f.contacto)
      coordinando.add(f.contacto)
    }
  }
  return { personas: personas.size, pdf, quisieronReservar: quisieron.size, coordinandoPago: coordinando.size }
}

/** Cómo le va al bot de WhatsApp de Nochebuena: el total y día por día. */
export default async function BotPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Sin el SQL (add_informe_bot.sql) la tabla no deja leer y llega vacía.
  const { data, error } = await supabase
    .from('nb_conversaciones')
    .select('contacto, rol, contenido, accion, creado_en')
    .not('contacto', 'like', 'prueba-claude-%')
    .order('id', { ascending: true })
  const filas = (data ?? []) as Fila[]

  const porDia = new Map<string, Fila[]>()
  for (const f of filas) {
    const dia = diaArgentina(f.creado_en)
    porDia.set(dia, [...(porDia.get(dia) ?? []), f])
  }
  const dias = Array.from(porDia.keys()).sort().reverse()
  const total = contar(filas)
  const hoy = contar(porDia.get(diaArgentina(new Date().toISOString())) ?? [])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-accent flex items-center gap-2">
          <Bot className="w-6 h-6 text-brand-accent" />
          Bot de Nochebuena
        </h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Cómo le va al bot de WhatsApp de la cena del 24. Se actualiza cada vez que entrás o tirás hacia abajo. El PDF
          cuenta solo cuando alguien lo pidió de nuevo (el del saludo lo manda ManyChat). Quiso reservar: escribió
          &ldquo;reservar&rdquo; o dio los datos. Coordinando pago: el bot tomó la reserva y la sigue Paz.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl border border-brand-error/30 bg-brand-error/10 p-4 text-sm text-brand-error">
          No se pudieron leer las charlas del bot. Falta correr supabase/add_informe_bot.sql.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">Hoy</h2>
        <Tarjetas numeros={hoy} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">Desde que arrancó</h2>
        <Tarjetas numeros={total} />
      </section>

      {dias.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted mb-3">Día por día</h2>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.08em] text-brand-muted">
                <th className="text-left font-semibold pb-2">Día</th>
                <th className="text-right font-semibold pb-2">Escribieron</th>
                <th className="text-right font-semibold pb-2">PDF</th>
                <th className="text-right font-semibold pb-2">Reservar</th>
                <th className="text-right font-semibold pb-2">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {dias.map((dia) => {
                const n = contar(porDia.get(dia)!)
                return (
                  <tr key={dia}>
                    <td className="py-2 text-brand-text">{diaCorto(dia)}</td>
                    <td className="py-2 text-right">{n.personas}</td>
                    <td className="py-2 text-right">{n.pdf}</td>
                    <td className="py-2 text-right">{n.quisieronReservar}</td>
                    <td className="py-2 text-right">{n.coordinandoPago}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Tarjetas({ numeros }: { numeros: Numeros }) {
  const tarjetas = [
    { valor: numeros.personas, texto: 'Escribieron' },
    { valor: numeros.pdf, texto: 'Pidieron el PDF' },
    { valor: numeros.quisieronReservar, texto: 'Quisieron reservar' },
    { valor: numeros.coordinandoPago, texto: 'Coordinando pago' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tarjetas.map((t) => (
        <div key={t.texto} className="rounded-2xl border border-brand-border bg-brand-card p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-brand-accent">{t.valor}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5 text-brand-muted">{t.texto}</p>
        </div>
      ))}
    </div>
  )
}
