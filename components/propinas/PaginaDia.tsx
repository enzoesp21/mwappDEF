import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina, sumarDias } from '@/lib/horarios'
import {
  cargarDia,
  nombresUsados,
  plantillaDiaNuevo,
  puedeCargarPropinas,
  usuariosParaVincular,
} from '@/lib/propinas-datos'
import EditorPropinas from '@/components/propinas/EditorPropinas'
import AvisoPropinas from '@/components/propinas/AvisoPropinas'

interface Props {
  base: string
  userId: string
  /** 'nuevo' o una fecha "2026-09-23". */
  fecha: string
}

export default async function PaginaDia({ base, userId, fecha }: Props) {
  const supabase = await createClient()
  if (!(await puedeCargarPropinas(supabase, userId))) redirect(base)

  const esNuevo = fecha === 'nuevo'
  if (!esNuevo && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound()

  const [usuarios, sugerencias, dia, plantilla] = await Promise.all([
    usuariosParaVincular(supabase),
    nombresUsados(supabase),
    esNuevo ? Promise.resolve(null) : cargarDia(supabase, fecha),
    esNuevo ? plantillaDiaNuevo(supabase) : Promise.resolve([]),
  ])
  if (dia && !dia.error && !dia.dia) notFound()

  return (
    <div className="space-y-4 max-w-2xl animate-slide-up">
      <div>
        <Link
          href={base}
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Propinas
        </Link>
        <h1 className="text-2xl font-bold text-brand-text mt-1">
          {esNuevo ? 'Cargar un día' : 'Propinas del día'}
        </h1>
      </div>

      {dia?.error ? (
        <AvisoPropinas error={dia.error} />
      ) : (
        <EditorPropinas
          base={base}
          // Se carga al día siguiente: por defecto, ayer.
          fecha={dia?.dia?.fecha ?? sumarDias(hoyEnArgentina(), -1)}
          esNuevo={esNuevo}
          total={dia?.dia?.total ?? null}
          general={dia?.dia?.general ?? null}
          personas={dia?.dia?.personas ?? plantilla}
          version={dia?.dia?.version ?? null}
          usuarios={usuarios}
          sugerencias={sugerencias}
        />
      )}
    </div>
  )
}
