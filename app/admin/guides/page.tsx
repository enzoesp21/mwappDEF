import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import GuidesClientActions from './GuidesClientActions'

export default async function GuidesPage() {
  const supabase = await createClient()

  const { data: guides } = await supabase
    .from('guides')
    .select('id, title, description, puestos, created_at, updated_by')
    .order('created_at', { ascending: false })

  const guidesWithCounts = await Promise.all(
    (guides ?? []).map(async (guide) => {
      const { data: exam } = await supabase
        .from('exams')
        .select('id')
        .eq('guide_id', guide.id)
        .single()

      if (!exam) return { ...guide, questionCount: 0 }

      const { count } = await supabase
        .from('exam_questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', exam.id)

      return { ...guide, questionCount: count ?? 0 }
    })
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Guías</h1>
          <p className="text-sm text-brand-muted mt-1">
            {guidesWithCounts.length} guía{guidesWithCounts.length !== 1 ? 's' : ''} de capacitación
          </p>
        </div>
        <Link
          href="/admin/guides/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-brand-dark text-sm font-semibold rounded-lg hover:bg-brand-accent-hover transition-colors duration-200 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Nueva guía
        </Link>
      </div>

      {guidesWithCounts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-brand-border rounded-xl">
          <BookOpenIcon />
          <p className="text-brand-muted text-sm mt-3">No hay guías creadas.</p>
          <Link
            href="/admin/guides/new"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-brand-accent hover:text-brand-accent-hover transition-colors duration-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear la primera guía
          </Link>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5">Título</th>
                  <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5 hidden md:table-cell">
                    Puestos
                  </th>
                  <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5 hidden lg:table-cell">
                    Preguntas
                  </th>
                  <th className="text-left text-xs font-medium text-brand-muted px-5 py-3.5 hidden lg:table-cell">
                    Creado
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {guidesWithCounts.map((guide) => (
                  <tr
                    key={guide.id}
                    className="hover:bg-brand-card-hover transition-colors duration-200"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-brand-text">{guide.title}</p>
                      <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">{guide.description}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(guide.puestos ?? []).slice(0, 3).map((p: string) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 text-xs bg-brand-accent/10 text-brand-accent rounded-full"
                          >
                            {p}
                          </span>
                        ))}
                        {(guide.puestos ?? []).length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-brand-card-hover text-brand-muted rounded-full">
                            +{(guide.puestos ?? []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-brand-text">{guide.questionCount}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-brand-muted text-xs">
                      {formatDate(guide.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <GuidesClientActions guideId={guide.id} guideTitle={guide.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function BookOpenIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-brand-card-hover flex items-center justify-center mx-auto">
      <svg className="w-6 h-6 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  )
}
