import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buscarPuesto } from '@/lib/puestos'
import PathEditor, { type GuideOption } from '@/components/admin/PathEditor'

export const dynamic = 'force-dynamic'

interface Props {
  params: { puesto: string }
}

export default async function AdminPuestoPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const info = buscarPuesto(decodeURIComponent(params.puesto))
  if (!info) notFound()

  const [{ data: guides }, { data: paths }] = await Promise.all([
    supabase
      .from('guides')
      .select('id, title, description')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('guide_paths')
      .select('guide_id, etiqueta, orden')
      .eq('puesto', info.valor)
      .order('orden', { ascending: true }),
  ])

  const guias: GuideOption[] = (guides ?? []).map((g) => ({
    id: g.id as string,
    title: g.title as string,
    description: (g.description as string) ?? null,
  }))

  const existentes = new Set(guias.map((g) => g.id))
  // Si quedó apuntando a una guía borrada, se ignora en lugar de romper.
  const inicial = (paths ?? [])
    .filter((p) => existentes.has(p.guide_id as string))
    .map((p) => ({ guide_id: p.guide_id as string, etiqueta: p.etiqueta as string }))

  const Icono = info.icono

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/guides"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, ' + info.desde + ', ' + info.hasta + ')' }}
          >
            <Icono className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-brand-text leading-tight truncate">
              {info.nombre}
            </h1>
            <p className="text-xs text-brand-muted">Recorrido de guías</p>
          </div>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5">
        <PathEditor
          puesto={info.valor}
          puestoNombre={info.nombre}
          guias={guias}
          inicial={inicial}
        />
      </div>
    </div>
  )
}
