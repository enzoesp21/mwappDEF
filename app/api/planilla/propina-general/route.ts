import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { armarPropinaGeneralExcel, type ParteExcel } from '@/lib/planilla-excel'
import { leerPropinaGeneral } from '@/lib/propina-general-datos'
import { NOMBRE_GRUPO, repartirPropinaGeneral } from '@/lib/propina-general'
import { MESES } from '@/lib/planilla-vista'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * La propina del resto del personal de una quincena, en Excel:
 * ?mes=2026-10&q=2&monto=850000. Solo admin.
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
  const q = url.searchParams.get('q') === '2' ? 2 : 1
  const monto = Math.round(Number(url.searchParams.get('monto') ?? ''))
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || !Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ error: 'Poné el monto de la quincena.' }, { status: 400 })
  }

  const { data, error } = await leerPropinaGeneral(supabase, mes, q)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reparto = repartirPropinaGeneral(monto, data.personas)
  const partes: ParteExcel[] = (['salon', 'cocina'] as const).map((g) => ({
    titulo: `${NOMBRE_GRUPO[g].toUpperCase()} · ${g === 'salon' ? 60 : 40} %`,
    pozo: reparto[g].pozo,
    horas: reparto[g].horas,
    porHora: reparto[g].porHora,
    filas: data.personas
      .filter((p) => p.ubicacion === g && p.horas > 0)
      .map((p) => ({ nombre: p.nombre, detalle: p.sector ?? p.cargo ?? '', horas: p.horas, monto: reparto[g].montos.get(p.id) ?? 0 })),
  }))

  const nombreMes = MESES[Number(mes.slice(5)) - 1]
  const quincena = q === 1 ? '1ra quincena (1 al 15)' : `2da quincena (16 al ${data.hasta.slice(8)})`
  const sinSector = data.personas.filter((p) => p.ubicacion === 'sin_sector' && p.horas > 0)
  const incompletas = data.personas.reduce((s, p) => s + p.incompletas, 0)
  const notas = [
    'Sin camareros. Cada parte se reparte según las horas de la planilla de la quincena.',
    ...(sinSector.length > 0 ? [`Sin sector (no cobraron): ${sinSector.map((p) => p.nombre).join(', ')}.`] : []),
    ...(incompletas > 0 ? [`Había ${incompletas} celdas incompletas en la quincena: no sumaron horas.`] : []),
  ]
  const libro = armarPropinaGeneralExcel({
    titulo: `PROPINA DEL RESTO DEL PERSONAL · ${nombreMes} ${mes.slice(0, 4)} · ${quincena.toUpperCase()}`,
    monto,
    partes,
    notas,
  })
  const archivo = await libro.xlsx.writeBuffer()
  const nombre = `Propina resto del personal ${nombreMes.toLowerCase()} ${mes.slice(0, 4)} - ${q === 1 ? '1ra' : '2da'} quincena.xlsx`
  return new Response(archivo as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Cache-Control': 'no-store',
    },
  })
}
