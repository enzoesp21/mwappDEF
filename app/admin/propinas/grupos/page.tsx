import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina, type SectorHorario } from '@/lib/horarios'
import { armarListaGrupos, esGrupoGuardado, type GrupoGuardado } from '@/lib/propinas-grupos'
import PorcentajeMozos from '@/components/propinas/PorcentajeMozos'

export const dynamic = 'force-dynamic'

/**
 * El porcentaje de cada mozo (al 100, 75, 50 o 25 %) y quién no es mozo.
 * Solo para encargados (lo cuida el layout de admin).
 */
export default async function PorcentajeMozosPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const hoy = hoyEnArgentina()
  const [empleadosRes, gruposRes, perfilesRes, nivelesRes, semanaRes] = await Promise.all([
    supabase.from('planilla_empleados').select('id, nombre, cargo, nombres_horario, profile_id').eq('activo', true),
    supabase.from('propina_grupos').select('empleado_id, grupo'),
    supabase.from('profiles').select('id, puesto'),
    supabase.from('mozo_niveles').select('user_id, nivel'),
    // La semana de Horarios de ahora (o la última): de ahí sale quién es mozo.
    supabase
      .from('schedule_weeks')
      .select('data')
      .lte('week_start', hoy)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const error = empleadosRes.error ?? gruposRes.error ?? perfilesRes.error ?? semanaRes.error
  const faltaSql = gruposRes.error && /propina_grupos/i.test(gruposRes.error.message)

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <Link
          href="/admin/propinas"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Propinas
        </Link>
        <h1 className="text-2xl font-semibold text-brand-accent mt-1">Porcentaje de cada mozo</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Tocá un mozo y elegí a cuánto cobra la hora. Cuando se cargan las propinas, cada uno ya aparece en su sección.
        </p>
      </div>

      {error ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          <p className="font-semibold">No se pudieron leer los porcentajes.</p>
          <p className="mt-1">
            {faltaSql
              ? 'Falta correr el SQL de grupos de propina (supabase/add_propina_grupos.sql) en Supabase.'
              : `Detalle: ${error.message}`}
          </p>
        </div>
      ) : (
        <PorcentajeMozos
          filas={armarListaGrupos({
            empleados: (empleadosRes.data ?? []).map((e) => ({
              id: e.id as string,
              nombre: e.nombre as string,
              cargo: (e.cargo as string | null) ?? null,
              nombresHorario: (e.nombres_horario as string[] | null) ?? [],
              profileId: (e.profile_id as string | null) ?? null,
            })),
            grupos: (gruposRes.data ?? [])
              .filter((g) => esGrupoGuardado(g.grupo))
              .map((g) => ({ empleadoId: g.empleado_id as string, grupo: g.grupo as GrupoGuardado })),
            puestoPorUsuario: new Map((perfilesRes.data ?? []).map((p) => [p.id as string, (p.puesto as string | null) ?? null])),
            // Sin la tabla de Progresión, nadie tiene nivel.
            nivelPorUsuario: new Map((nivelesRes.data ?? []).map((n) => [n.user_id as string, n.nivel as number])),
            sectores: (semanaRes.data?.data as { sectores?: SectorHorario[] } | undefined)?.sectores ?? [],
          })}
        />
      )}
    </div>
  )
}
