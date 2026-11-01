import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { leerMes } from '@/lib/planilla-datos'
import { armarPlanillaExcel, nombreArchivo } from '@/lib/planilla-excel'
import { diasDelMes } from '@/lib/planilla-vista'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * La planilla del mes en Excel, con el formato de siempre.
 * ?mes=2026-10&parte=mes (o q1: días 1 a 15, q2: días 16 a fin de mes). Solo admin.
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
  const mes = url.searchParams.get('mes') ?? ''
  const parte = (url.searchParams.get('parte') ?? 'mes') as 'mes' | 'q1' | 'q2'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || !['mes', 'q1', 'q2'].includes(parte)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const { data, error } = await leerMes(supabase, mes)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ese mes no tiene planilla.' }, { status: 404 })

  const libro = armarPlanillaExcel({
    mes,
    filas: data.filas,
    desde: parte === 'q2' ? 16 : 1,
    hasta: parte === 'q1' ? 15 : diasDelMes(mes),
  })
  const archivo = await libro.xlsx.writeBuffer()
  const nombre = nombreArchivo(mes, parte)
  return new Response(archivo as ArrayBuffer, {
    headers: {
      'Content-Type': TIPO_XLSX,
      'Content-Disposition': `attachment; filename="${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Cache-Control': 'no-store',
    },
  })
}
