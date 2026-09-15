'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, AlertCircle, Check, Trash2, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { publishEmployeeAction, unpublishEmployeeAction } from '@/app/actions/employee'

const MAX_SIDE = 800

// Foto de perfil: se recorta a cuadrado y se comprime antes de subir.
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = Math.round((bitmap.width - side) / 2)
  const sy = Math.round((bitmap.height - side) / 2)
  const out = Math.min(MAX_SIDE, side)

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))),
      'image/jpeg',
      0.85
    )
  })
}

export interface Person {
  id: string
  full_name: string
  puesto: string
  votes: number
  /** Su foto de perfil, que se usa si no subís una acá. */
  avatar_url: string | null
}

interface Props {
  period: string
  periodLabel: string
  people: Person[]
  current: { user_id: string; photo_url: string | null; message: string | null } | null
}

export default function PublishForm({ period, periodLabel, people, current }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<string | null>(current?.user_id ?? null)
  const [photo, setPhoto] = useState<string | null>(current?.photo_url ?? null)
  const [message, setMessage] = useState(current?.message ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Si no subís una foto acá, se muestra la de perfil de esa persona.
  const avatarElegido = people.find((p) => p.id === selected)?.avatar_url ?? null

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const blob = await prepare(file)
      const path = 'empleados/' + Date.now() + '.jpg'
      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from('guias')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(upErr.message)
      const {
        data: { publicUrl },
      } = supabase.storage.from('guias').getPublicUrl(path)
      setPhoto(publicUrl)
      setDone(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePublish() {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    const result = await publishEmployeeAction(period, selected, photo, message)
    setSaving(false)
    if (result.ok) {
      setDone(true)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleUnpublish() {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await unpublishEmployeeAction(period)
    setSaving(false)
    if (result.ok) {
      setSelected(null)
      setPhoto(null)
      setMessage('')
      setDone(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-brand-accent" />
        <h2 className="text-sm font-semibold text-brand-text">
          Publicar empleado de {periodLabel}
        </h2>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-2">Elegí a quién</label>
        <div className="border border-brand-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          <div className="divide-y divide-brand-border">
            {people.map((p) => {
              const isSel = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p.id)
                    setDone(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full text-left px-3 py-2.5 transition-colors cursor-pointer min-h-[48px]',
                    isSel ? 'bg-brand-accent/10' : 'hover:bg-brand-card-hover'
                  )}
                >
                  <span
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                      isSel ? 'bg-brand-accent text-white' : 'bg-brand-dark text-brand-muted'
                    )}
                  >
                    {isSel ? <Check className="w-3.5 h-3.5" /> : p.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-text truncate">{p.full_name}</p>
                    {p.puesto && <p className="text-xs text-brand-muted truncate">{p.puesto}</p>}
                  </div>
                  {p.votes > 0 && (
                    <span className="text-[10px] font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      {p.votes} voto{p.votes !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-2">Foto (opcional)</label>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-dark flex-shrink-0 border border-brand-border">
            {photo || avatarElegido ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={(photo ?? avatarElegido) as string}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-muted text-xs">
                sin foto
              </div>
            )}
          </div>
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
            {uploading ? 'Subiendo...' : photo ? 'Cambiar' : 'Subir foto'}
          </button>
          {photo && !uploading && (
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="text-xs text-brand-muted hover:text-brand-error transition-colors cursor-pointer px-2 py-2"
            >
              Quitar
            </button>
          )}
        </div>
        {!photo && avatarElegido && (
          <p className="text-xs text-brand-muted mt-2 leading-relaxed">
            Se va a usar su foto de perfil. Subí una acá solo si querés otra distinta.
          </p>
        )}
        {!photo && !avatarElegido && selected && (
          <p className="text-xs text-brand-muted mt-2 leading-relaxed">
            Esta persona no tiene foto de perfil, así que va a salir con la inicial de su
            nombre. Subí una si querés que se vea su cara.
          </p>
        )}
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

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-2">
          Dedicatoria (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setDone(false)
          }}
          rows={3}
          maxLength={400}
          placeholder="Por qué se lo merece..."
          className="w-full px-3 py-2.5 bg-brand-dark border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-colors resize-y"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {done && (
        <p className="flex items-center gap-1.5 text-xs text-brand-success font-medium">
          <Check className="w-3.5 h-3.5" />
          Publicado. Ya lo ve todo el equipo y le llegó la notificación.
        </p>
      )}

      <div className="flex items-center gap-2">
        {current && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Quitar
          </button>
        )}
        <button
          type="button"
          onClick={handlePublish}
          disabled={!selected || saving}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm min-h-[44px] transition-colors',
            !selected || saving
              ? 'bg-brand-card-hover text-brand-muted cursor-not-allowed'
              : 'bg-brand-accent text-white hover:bg-brand-accent-hover cursor-pointer'
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {current ? 'Actualizar' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}
