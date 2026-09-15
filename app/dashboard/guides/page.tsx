import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PuestoCard from '@/components/PuestoCard'
import { PUESTOS_INFO, buscarPuesto } from '@/lib/puestos'

export const dynamic = 'force-dynamic'

export default async function GuidesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('puesto')
    .eq('id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  const miPuesto = buscarPuesto(profile.puesto as string)?.valor ?? null

  // Consultas sueltas, sin joins anidados: en este proyecto los joins
  // anidados de PostgREST vienen anulando consultas enteras.
  const [{ data: paths }, { data: exams }, { data: results }] = await Promise.all([
    supabase.from('guide_paths').select('puesto, guide_id'),
    supabase.from('exams').select('id, guide_id'),
    supabase
      .from('exam_results')
      .select('exam_id')
      .eq('user_id', session.user.id)
      .eq('passed', true),
  ])

  // Qué guías tiene aprobadas quien está mirando.
  const examenesAprobados = new Set((results ?? []).map((r) => r.exam_id as string))
  const guiasAprobadas = new Set(
    (exams ?? [])
      .filter((e) => examenesAprobados.has(e.id as string))
      .map((e) => e.guide_id as string)
  )

  // Por puesto: cuántas guías tiene la ruta y cuántas de esas aprobó.
  const conteo = new Map<string, { total: number; aprobadas: number }>()
  for (const row of paths ?? []) {
    const p = row.puesto as string
    const actual = conteo.get(p) ?? { total: 0, aprobadas: 0 }
    actual.total++
    if (guiasAprobadas.has(row.guide_id as string)) actual.aprobadas++
    conteo.set(p, actual)
  }

  // El puesto propio primero, el resto en el orden del catálogo.
  const ordenados = [...PUESTOS_INFO].sort((a, b) => {
    if (a.valor === miPuesto) return -1
    if (b.valor === miPuesto) return 1
    return 0
  })

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Guías</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Entrá a tu puesto para ver tu recorrido. También podés mirar el de cualquier otro
          sector.
        </p>
      </div>

      <div className="space-y-3">
        {ordenados.map((info) => {
          const c = conteo.get(info.valor) ?? { total: 0, aprobadas: 0 }
          return (
            <PuestoCard
              key={info.valor}
              info={info}
              total={c.total}
              aprobadas={c.aprobadas}
              esTuPuesto={info.valor === miPuesto}
            />
          )
        })}
      </div>
    </div>
  )
}
