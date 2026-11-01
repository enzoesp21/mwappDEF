'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recalcularPlanilla } from '@/lib/planilla-proceso'
import { leerMes } from '@/lib/planilla-datos'
import { armarPlanillaExcel, nombreArchivo } from '@/lib/planilla-excel'
import { diasDelMes, fechaDelDia, mesTerminado, nombreDelMes, textoHoras, totalesDelMes } from '@/lib/planilla-vista'

type Cliente = Awaited<ReturnType<typeof createClient>>
type Resultado = { ok: true; mensaje: string } | { ok: false; error: string; incompletas?: number }

const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

/** Le agrega el detalle (motivo, incompletas) al último evento que dejó anotado la base. */
async function detallarEvento(supabase: Cliente, periodo: string, accion: 'cerrar' | 'reabrir', detalle: string) {
  const { data } = await supabase
    .from('planilla_eventos')
    .select('id')
    .eq('periodo', periodo)
    .eq('accion', accion)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (data) await supabase.from('planilla_eventos').update({ detalle }).eq('id', data.id)
}

/**
 * Cerrar el mes: se recalcula una última vez (por fichadas atrasadas; lo
 * cargado a mano no se toca), se valida que no queden incompletas (o se pide
 * confirmar), se guarda el Excel en Storage y los totales, y el mes queda de
 * solo lectura (la base no deja tocar sus celdas). Queda anotado quién y cuándo.
 */
export async function cerrarMesAction(mes: string, confirmarIncompletas: boolean): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!MES.test(mes)) return { ok: false, error: 'El mes no es válido.' }
  const periodo = `${mes}-01`
  const ahora = Date.now()
  if (!mesTerminado(mes, ahora)) return { ok: false, error: `${nombreDelMes(mes)} todavía no terminó: se cierra desde el 1° del mes siguiente.` }

  const { data: actual, error: errorMes } = await supabase.from('planilla_meses').select('estado').eq('periodo', periodo).maybeSingle()
  if (errorMes) return { ok: false, error: errorMes.message }
  if (!actual) return { ok: false, error: 'Ese mes no tiene planilla.' }
  if (actual.estado === 'cerrado') return { ok: false, error: `${nombreDelMes(mes)} ya estaba cerrado.` }

  // Una última pasada del reloj, con el mes entero.
  const recalculo = await recalcularPlanilla(supabase, { clave: null, desde: periodo, hasta: fechaDelDia(mes, diasDelMes(mes)), ahora })
  if (!recalculo.ok) return { ok: false, error: `No se pudo recalcular el mes antes de cerrarlo: ${recalculo.error}` }

  const { data: datos, error: errorLeer } = await leerMes(supabase, mes)
  if (errorLeer || !datos) return { ok: false, error: errorLeer?.message ?? 'No se pudo leer la planilla.' }
  const totales = totalesDelMes(datos.filas)
  if (totales.incompletos > 0 && !confirmarIncompletas) {
    return {
      ok: false,
      incompletas: totales.incompletos,
      error: `Quedan ${totales.incompletos} ${totales.incompletos === 1 ? 'celda incompleta' : 'celdas incompletas'}.`,
    }
  }

  // El Excel del cierre, guardado en el bucket privado (uno por cierre: si se reabre y se vuelve a cerrar, queda el anterior).
  const sello = new Date(ahora - 3 * 3600 * 1000).toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const ruta = `${mes}/planilla-${mes}-cierre-${sello}.xlsx`
  const archivo = await armarPlanillaExcel({ mes, filas: datos.filas }).xlsx.writeBuffer()
  const { error: errorSubir } = await supabase.storage
    .from('planillas')
    .upload(ruta, new Uint8Array(archivo as ArrayBuffer), { contentType: TIPO_XLSX, upsert: false })
  if (errorSubir) return { ok: false, error: `No se pudo guardar el Excel: ${errorSubir.message}` }

  const { data: cerrado, error: errorCerrar } = await supabase
    .from('planilla_meses')
    .update({
      estado: 'cerrado',
      totales,
      xlsx_path: ruta,
      cerrado_por: session.user.id,
      cerrado_en: new Date(ahora).toISOString(),
    })
    .eq('periodo', periodo)
    .eq('estado', 'abierto')
    .select('periodo')
  if (errorCerrar || !cerrado || cerrado.length === 0) {
    await supabase.storage.from('planillas').remove([ruta])
    return { ok: false, error: errorCerrar?.message ?? 'Alguien lo cerró recién: recargá la página.' }
  }

  const resumen = `${textoHoras(totales.horas_total)} h · ${totales.empleados_con_horas} con horas · ${
    totales.incompletos === 0 ? 'sin incompletas' : `${totales.incompletos} incompletas`
  }`
  await detallarEvento(supabase, periodo, 'cerrar', resumen)
  revalidatePath('/admin/fichadas', 'layout')
  return { ok: true, mensaje: `${nombreDelMes(mes)} cerrado (${resumen}). El Excel quedó guardado.` }
}

/** Reabrir un mes cerrado para corregirlo. Queda anotado quién, cuándo y por qué. */
export async function reabrirMesAction(mes: string, motivo: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!MES.test(mes)) return { ok: false, error: 'El mes no es válido.' }
  const porque = motivo.trim().slice(0, 300)
  if (porque.length < 3) return { ok: false, error: 'Escribí por qué lo reabrís (queda anotado).' }
  const periodo = `${mes}-01`

  const { data, error } = await supabase
    .from('planilla_meses')
    .update({ estado: 'abierto', cerrado_por: null, cerrado_en: null })
    .eq('periodo', periodo)
    .eq('estado', 'cerrado')
    .select('periodo')
  if (error) return { ok: false, error: error.message }
  if (!data || data.length === 0) return { ok: false, error: 'Ese mes no estaba cerrado: recargá la página.' }
  await detallarEvento(supabase, periodo, 'reabrir', porque)
  revalidatePath('/admin/fichadas', 'layout')
  return { ok: true, mensaje: `${nombreDelMes(mes)} reabierto. Cuando termines de corregir, cerralo de nuevo.` }
}

/** Un link de un minuto para bajar el Excel guardado en el último cierre. */
export async function excelDelCierreAction(mes: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!MES.test(mes)) return { ok: false, error: 'El mes no es válido.' }
  const { data, error } = await supabase.from('planilla_meses').select('xlsx_path').eq('periodo', `${mes}-01`).maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data?.xlsx_path) return { ok: false, error: 'Ese mes todavía no tiene un Excel de cierre.' }
  const { data: firmado, error: errorUrl } = await supabase.storage
    .from('planillas')
    .createSignedUrl(data.xlsx_path, 60, { download: nombreArchivo(mes, 'mes').replace('.xlsx', ' (cierre).xlsx') })
  if (errorUrl || !firmado) return { ok: false, error: errorUrl?.message ?? 'No se pudo armar el link.' }
  return { ok: true, url: firmado.signedUrl }
}
