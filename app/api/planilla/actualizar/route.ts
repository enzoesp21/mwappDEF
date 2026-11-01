import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rangoPorDefecto, recalcularPlanilla } from '@/lib/planilla-proceso'

export const dynamic = 'force-dynamic'
// Recalcular un mes entero (la primera vez) puede llevar unos segundos.
export const maxDuration = 60

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * La planilla se llena sola: Supabase llama acá cada 2 horas (pg_cron, ver
 * supabase/add_planilla_proceso.sql) con la clave de planilla_config en el
 * encabezado x-clave. No hay usuario: la clave la valida la base, y con ella
 * solo se puede leer y guardar la planilla.
 *
 * Opcional, para recalcular otro rango: {"desde": "2026-10-01", "hasta": "2026-10-31"}.
 */
export async function POST(request: Request) {
  const clave = request.headers.get('x-clave')
  if (!clave) return NextResponse.json({ ok: false, error: 'Falta la clave.' }, { status: 401 })

  const ahora = Date.now()
  let rango = rangoPorDefecto(ahora)
  const cuerpo = (await request.json().catch(() => null)) as { desde?: unknown; hasta?: unknown } | null
  if (typeof cuerpo?.desde === 'string' && typeof cuerpo?.hasta === 'string' && FECHA.test(cuerpo.desde) && FECHA.test(cuerpo.hasta)) {
    rango = { desde: cuerpo.desde, hasta: cuerpo.hasta }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !llave) {
    return NextResponse.json({ ok: false, error: 'Faltan las variables de Supabase en el servidor.' }, { status: 500 })
  }

  // Nunca un error mudo: lo que falle vuelve con su mensaje (queda en net._http_response).
  try {
    const supabase = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } })
    const resultado = await recalcularPlanilla(supabase, { clave, ...rango, ahora })
    const status = resultado.ok ? 200 : resultado.sinPermiso ? 401 : 500
    return NextResponse.json(resultado, { status })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
