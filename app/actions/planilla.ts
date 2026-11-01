'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { ubicarEnJornada } from '@/lib/planilla'
import { rangoPorDefecto, recalcularPlanilla } from '@/lib/planilla-proceso'

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

function mesSiguiente(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  return numero === 12 ? `${anio + 1}-01` : `${anio}-${String(numero + 1).padStart(2, '0')}`
}

/**
 * "Actualizar ahora": el mismo proceso que corre solo cada 2 horas. Con un mes
 * ("2026-10") lo recalcula entero, siempre respetando lo que cargó un admin.
 */
export async function actualizarPlanillaAction(mes?: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const ahora = Date.now()
  let rango = rangoPorDefecto(ahora)
  if (mes !== undefined) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, error: 'El mes no es válido.' }
    const hoy = ubicarEnJornada(ahora, false).fecha
    const fin = sumarDias(`${mesSiguiente(mes)}-01`, -1)
    rango = { desde: `${mes}-01`, hasta: fin < hoy ? fin : hoy }
    if (rango.hasta < rango.desde) return { ok: false, error: 'Ese mes todavía no empezó.' }
  }

  const r = await recalcularPlanilla(supabase, { clave: null, ...rango, ahora })
  if (!r.ok) return { ok: false, error: r.error }
  revalidatePath('/admin/fichadas', 'layout')
  const cerrados = r.mesesCerrados.length > 0 ? ` ${r.mesesCerrados.join(' y ')} está cerrado: no se tocó.` : ''
  return { ok: true, mensaje: `Planilla al día: ${r.guardadas} celdas recalculadas.${cerrados}` }
}
