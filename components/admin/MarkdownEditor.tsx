'use client'

import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, AlertCircle, ImagePlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MAX_WIDTH = 1400

// Las fotos de celular pesan varios MB y la app se usa con datos móviles.
// Se redimensionan y recomprimen en el navegador antes de subirlas.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
      'image/jpeg',
      0.82
    )
  })
}

function slugify(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'imagen'
}

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
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  function insertAtCursor(text: string) {
    const textarea = textareaRef.current
    const start = textarea ? textarea.selectionStart : value.length
    const newValue = value.slice(0, start) + text + value.slice(start)
    onChange(newValue)
    requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus()
      const pos = start + text.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await compressImage(file)
      const path = Date.now() + '-' + slugify(file.name) + '.jpg'

      const supabase = createClient()
      const { error } = await supabase.storage
        .from('guias')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

      if (error) throw new Error(error.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('guias').getPublicUrl(path)

      insertAtCursor('\n\n![' + slugify(file.name).replace(/-/g, ' ') + '](' + publicUrl + ')\n\n')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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

            <span className="w-px bg-brand-border mx-1 self-stretch" />

            <button
              type="button"
              title="Subir imagen"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded text-brand-accent hover:bg-brand-accent/10 transition-colors duration-200 cursor-pointer min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Subiendo...' : 'Imagen'}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

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
