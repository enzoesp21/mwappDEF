'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import GuideCover from '@/components/GuideCover'

const MAX_WIDTH = 1600

// Las portadas se muestran apaisadas, así que se recorta a 16:9 y se
// recomprime antes de subir: una foto de celular queda en pocos cientos de KB.
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const targetRatio = 16 / 9
  const ratio = bitmap.width / bitmap.height

  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height

  if (ratio > targetRatio) {
    sw = Math.round(bitmap.height * targetRatio)
    sx = Math.round((bitmap.width - sw) / 2)
  } else {
    sh = Math.round(bitmap.width / targetRatio)
    sy = Math.round((bitmap.height - sh) / 2)
  }

  const width = Math.min(MAX_WIDTH, sw)
  const height = Math.round(width / targetRatio)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
      'image/jpeg',
      0.85
    )
  })
}

interface Props {
  title: string
  value: string | null
  onChange: (url: string | null) => void
}

export default function CoverUploader({ title, value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const blob = await prepare(file)
      const path = 'portadas/' + Date.now() + '.jpg'
      const supabase = createClient()

      const { error: upErr } = await supabase.storage
        .from('guias')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(upErr.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('guias').getPublicUrl(path)
      onChange(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la portada')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-brand-muted">
        Portada <span className="text-brand-muted">(opcional)</span>
      </label>

      <div className="rounded-xl overflow-hidden border border-brand-border">
        <GuideCover title={title || 'Guía'} coverImage={value} className="h-32 w-full" />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors cursor-pointer min-h-[36px] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Subiendo...' : value ? 'Cambiar portada' : 'Subir portada'}
        </button>

        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Quitar
          </button>
        )}
      </div>

      <p className="text-xs text-brand-muted">
        Se recorta a formato apaisado y se comprime sola. Sin portada se usa un fondo generado a
        partir del título.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
