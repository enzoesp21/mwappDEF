import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sumarDias } from '@/lib/horarios'
import { traerCeldas } from '@/lib/planilla-datos'
import { armarHorasExcel } from '@/lib/planilla-excel'
import { fechaDelDia } from '@/lib/planilla-vista'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const corta = (f: string) => `${f.slice(8)}/${f.slice(5, 7)}`

/**
 * Las horas para propinas: Empleado | Horas Calculadas, del rango pedido
 * (?desde=2026-10-01&hasta=2026-10-15, como mucho 2 meses). Solo admin.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (perfil?.role !== 'admin') return NextResponse.json({ error: 'Solo para encargados.' }, { status: 403 })

  const url = new URL(request.url)
  const desde = url.searchParams.get('desde') ?? ''
  const hasta = url.searchParams.get('hasta') ?? ''
  if (!FECHA.test(desde) || !FECHA.test(hasta) || hasta < desde || hasta > sumarDias(desde, 62)) {
    return NextResponse.json({ error: 'Elegí un rango de fechas de hasta 2 meses.' }, { status: 400 })
  }

  // Los meses que toca el rango (uno o dos, a lo sumo tres).
  const meses: string[] = []
  for (let m = desde.slice(0, 7); m <= hasta.slice(0, 7); m = sumarDias(`${m}-28`, 7).slice(0, 7)) meses.push(m)
  const [empleadosRes, ...celdas] = await Promise.all([
    supabase.from('planilla_empleados').select('id, nombre, orden').order('orden'),
    ...meses.map((m) => traerCeldas(supabase, `${m}-01`)),
  ])
  if (empleadosRes.error) return NextResponse.json({ error: empleadosRes.error.message }, { status: 500 })
  const falla = celdas.find((c) => c.error)
  if (falla?.error) return NextResponse.json({ error: falla.error.message }, { status: 500 })

  const horas = new Map<string, number>()
  celdas.forEach((c, i) => {
    for (const celda of c.data ?? []) {
      const fecha = fechaDelDia(meses[i], celda.dia)
      if (fecha < desde || fecha > hasta || !celda.horas) continue
      horas.set(celda.empleado_id, (horas.get(celda.empleado_id) ?? 0) + Number(celda.horas))
    }
  })
  const filas = (empleadosRes.data ?? [])
    .filter((e) => (horas.get(e.id as string) ?? 0) > 0)
    .map((e) => ({ nombre: e.nombre as string, horas: horas.get(e.id as string)! }))

  const titulo = `Horas del ${corta(desde)} al ${corta(hasta)}/${hasta.slice(0, 4)}, según la planilla.`
  const archivo = await armarHorasExcel(filas, titulo).xlsx.writeBuffer()
  const nombre = `Horas para propinas ${desde.slice(8)}-${desde.slice(5, 7)} al ${hasta.slice(8)}-${hasta.slice(5, 7)}.xlsx`
  return new Response(archivo as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  })
}
