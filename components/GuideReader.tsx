'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, List, Maximize2, Minimize2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  content: string
}

interface Section {
  id: string
  title: string
  body: string
}

function slug(text: string, i: number) {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (base || 'seccion') + '-' + i
}

// Corta el markdown por encabezados de nivel 2. Lo previo al primero queda
// como introducción y se muestra siempre.
function parse(content: string): { intro: string; sections: Section[] } {
  const lines = content.split('\n')
  const intro: string[] = []
  const sections: Section[] = []
  let current: { title: string; body: string[] } | null = null

  for (const line of lines) {
    const match = /^##\s+(?!#)(.*)$/.exec(line)
    if (match) {
      if (current) {
        sections.push({
          id: slug(current.title, sections.length),
          title: current.title,
          body: current.body.join('\n'),
        })
      }
      current = { title: match[1].trim(), body: [] }
    } else if (current) {
      current.body.push(line)
    } else {
      intro.push(line)
    }
  }

  if (current) {
    sections.push({
      id: slug(current.title, sections.length),
      title: current.title,
      body: current.body.join('\n'),
    })
  }

  return { intro: intro.join('\n').trim(), sections }
}

export default function GuideReader({ content }: Props) {
  const { intro, sections } = useMemo(() => parse(content), [content])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [seen, setSeen] = useState<Record<string, boolean>>({})

  const openCount = sections.filter((s) => open[s.id]).length
  const allOpen = openCount === sections.length && sections.length > 0
  const seenCount = sections.filter((s) => seen[s.id]).length
  const pct = sections.length > 0 ? Math.round((seenCount / sections.length) * 100) : 0

  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
    setSeen((s) => ({ ...s, [id]: true }))
  }

  function toggleAll() {
    if (allOpen) {
      setOpen({})
    } else {
      const all = Object.fromEntries(sections.map((s) => [s.id, true]))
      setOpen(all)
      setSeen(all)
    }
  }

  function goTo(id: string) {
    setOpen((o) => ({ ...o, [id]: true }))
    setSeen((s) => ({ ...s, [id]: true }))
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Sin encabezados de nivel 2 no hay nada que plegar: se muestra tal cual.
  if (sections.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {intro && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2 mb-3">
            <List className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <span className="text-xs font-semibold text-brand-text uppercase tracking-wider flex-1">
              Contenido
            </span>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-accent/10 min-h-[32px]"
            >
              {allOpen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              {allOpen ? 'Cerrar todo' : 'Abrir todo'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-brand-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-accent rounded-full transition-all duration-500"
                style={{ width: pct + '%' }}
              />
            </div>
            <span className="text-[10px] text-brand-muted font-medium whitespace-nowrap">
              {seenCount} de {sections.length}
            </span>
          </div>
        </div>

        <div className="divide-y divide-brand-border">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-brand-card-hover transition-colors cursor-pointer min-h-[44px] group"
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors',
                  seen[s.id]
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-dark text-brand-muted'
                )}
              >
                {seen[s.id] ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="text-sm text-brand-text flex-1 min-w-0">{s.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-brand-border flex-shrink-0 group-hover:text-brand-accent transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {sections.map((s, i) => {
        const isOpen = !!open[s.id]
        return (
          <div
            key={s.id}
            id={s.id}
            className={cn(
              'bg-brand-card border rounded-2xl overflow-hidden scroll-mt-4 transition-colors',
              isOpen ? 'border-brand-accent/40' : 'border-brand-border'
            )}
          >
            <button
              onClick={() => toggle(s.id)}
              aria-expanded={isOpen}
              className={cn(
                'flex items-center gap-3 w-full text-left px-4 py-4 transition-colors cursor-pointer',
                isOpen ? 'bg-brand-accent/5' : 'hover:bg-brand-card-hover'
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-colors',
                  isOpen ? 'bg-brand-accent text-white' : 'bg-brand-dark text-brand-muted'
                )}
              >
                {i + 1}
              </span>
              <span className="font-semibold text-brand-text flex-1 min-w-0">{s.title}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                  isOpen ? 'rotate-180 text-brand-accent' : 'text-brand-muted'
                )}
              />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-brand-border animate-slide-up">
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
