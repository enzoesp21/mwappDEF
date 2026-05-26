import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import MarkdownContent from '@/components/MarkdownContent'
import { cn } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function GuidePage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: guide } = await supabase
    .from('guides')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!guide) notFound()

  const { data: exam } = await supabase
    .from('exams')
    .select('id, title, passing_score')
    .eq('guide_id', guide.id)
    .single()

  let hasPassed = false
  if (exam) {
    const { data: result } = await supabase
      .from('exam_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .eq('passed', true)
      .single()
    hasPassed = !!result
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/guides"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/50 transition-colors cursor-pointer"
          aria-label="Volver a guías"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" />
        </Link>
        <div>
          <p className="text-brand-muted text-xs uppercase tracking-wider">Guía</p>
          <h1 className="text-lg font-bold text-brand-text leading-tight">{guide.title}</h1>
        </div>
      </div>

      {hasPassed && (
        <div className="flex items-center gap-2 bg-brand-success/10 border border-brand-success/30 rounded-xl px-4 py-3 mb-6">
          <CheckCircle className="w-4 h-4 text-brand-success flex-shrink-0" />
          <p className="text-brand-success text-sm font-medium">Ya aprobaste el examen de esta guía</p>
        </div>
      )}

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 mb-6">
        <MarkdownContent content={guide.content} />
      </div>

      {exam && !hasPassed && (
        <div className="bg-brand-card border border-brand-accent/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-accent" />
            <h2 className="font-semibold text-brand-text">{exam.title}</h2>
          </div>
          <p className="text-brand-muted text-sm">
            Necesitás obtener al menos {exam.passing_score}% para aprobar.
          </p>
          <Link
            href={`/dashboard/guides/${guide.id}/exam`}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl',
              'bg-brand-accent text-brand-dark font-semibold text-sm',
              'hover:bg-brand-accent-hover transition-colors cursor-pointer',
              'min-h-[48px]'
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Hacer el examen
          </Link>
        </div>
      )}

      {exam && hasPassed && (
        <Link
          href={`/dashboard/guides/${guide.id}/exam`}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl',
            'bg-brand-card border border-brand-border text-brand-muted text-sm',
            'hover:border-brand-accent/50 hover:text-brand-text transition-colors cursor-pointer',
            'min-h-[48px]'
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Repetir examen
        </Link>
      )}

      {!exam && (
        <div className="text-center py-4 text-brand-muted text-sm">
          Este guía todavía no tiene examen asociado.
        </div>
      )}
    </div>
  )
}
