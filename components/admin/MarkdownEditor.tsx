'use client'

import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  saved?: boolean
  dirty?: boolean
}

type Tab = 'edit' | 'preview'

const TOOLBAR_ACTIONS = [
  { label: 'B', title: 'Negrita', syntax: '**texto**', cursor: 2 },
  { label: 'I', title: 'Cursiva', syntax: '*texto*', cursor: 1 },
  { label: 'H2', title: 'Título 2', syntax: '## ', cursor: 3 },
  { label: 'H3', title: 'Título 3', syntax: '### ', cursor: 4 },
  { label: '—', title: 'Lista', syntax: '- ', cursor: 2 },
  { label: '1.', title: 'Lista numerada', syntax: '1. ', cursor: 3 },
  { label: 'HR', title: 'Separador', syntax: '\n---\n', cursor: 5 },
  { label: '<>', title: 'Bloque de código', syntax: '```\n\n```', cursor: 4 },
] as const

export default function MarkdownEditor({ value, onChange, saved, dirty }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertSyntax(syntax: string, cursorOffset: number) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const before = value.slice(0, start)
    const after = value.slice(end)

    let insertion = syntax
    if (selected && syntax.includes('texto')) {
      insertion = syntax.replace('texto', selected)
    }

    const newValue = before + insertion + after
    onChange(newValue)

    requestAnimationFrame(() => {
      textarea.focus()
      const newCursor = start + insertion.length - (selected ? 0 : cursorOffset)
      textarea.setSelectionRange(newCursor, newCursor)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Save indicator */}
      <div className="flex items-center justify-end h-5">
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-xs text-brand-success">
            <Check className="w-3.5 h-3.5" />
            Guardado automáticamente
          </span>
        )}
        {dirty && (
          <span className="flex items-center gap-1.5 text-xs text-brand-muted">
            <AlertCircle className="w-3.5 h-3.5" />
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* Mobile tabs */}
      <div className="flex lg:hidden border-b border-brand-border mb-1">
        {(['edit', 'preview'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-b-2 -mb-px',
              activeTab === tab
                ? 'border-brand-accent text-brand-accent'
                : 'border-transparent text-brand-muted hover:text-brand-text'
            )}
          >
            {tab === 'edit' ? 'Editar' : 'Vista previa'}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Editor column */}
        <div className={cn('flex-1 flex flex-col gap-2', activeTab === 'preview' ? 'hidden lg:flex' : 'flex')}>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 bg-brand-card border border-brand-border rounded-lg">
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.title}
                onClick={() => insertSyntax(action.syntax, action.cursor)}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded text-brand-muted hover:text-brand-text hover:bg-brand-card-hover transition-colors duration-200 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                {action.label}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escribe el contenido de la guía en Markdown..."
            className="w-full min-h-[500px] p-4 bg-brand-dark border border-brand-border rounded-lg text-brand-text font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent placeholder:text-brand-muted transition-colors duration-200"
            spellCheck={false}
          />
        </div>

        {/* Preview column */}
        <div className={cn('flex-1', activeTab === 'edit' ? 'hidden lg:block' : 'block')}>
          <div className="hidden lg:flex items-center mb-2 h-[52px] px-2">
            <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">Vista previa</span>
          </div>
          <div className="min-h-[500px] p-4 bg-brand-dark border border-brand-border rounded-lg overflow-auto">
            {value ? (
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-brand-text prose-headings:font-display
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:text-brand-text prose-p:leading-relaxed
                prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline
                prose-strong:text-brand-text prose-strong:font-semibold
                prose-em:text-brand-text
                prose-code:text-brand-accent prose-code:bg-brand-card prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-brand-card prose-pre:border prose-pre:border-brand-border prose-pre:rounded-lg
                prose-blockquote:border-l-brand-accent prose-blockquote:text-brand-muted
                prose-ul:text-brand-text prose-ol:text-brand-text
                prose-li:text-brand-text prose-li:marker:text-brand-accent
                prose-hr:border-brand-border
                prose-table:text-brand-text
                prose-th:text-brand-text prose-th:border-brand-border
                prose-td:text-brand-text prose-td:border-brand-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-brand-muted text-sm italic">El contenido aparecerá aquí...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
