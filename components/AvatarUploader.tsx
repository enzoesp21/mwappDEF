'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { prepareSquarePhoto } from '@/lib/image'

interface Props {
  userId: string
  fullName: string
  initialUrl: string | null
}

export default function AvatarUploader({ userId, fullName, initialUrl }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inicial = fullName.trim().charAt(0).toUpperCase() || 'U'

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const blob = await prepareSquarePhoto(file)
      const supabase = createClient()
      // Un nombre nuevo por vez, para que el navegador no muestre la anterior
      // desde la caché.
      const path = 'avatars/' + userId + '/' + Date.now() + '.jpg'

      const { error: upErr } = await supabase.storage
        .from('guias')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(upErr.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('guias').getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
      if (dbErr) throw new Error(dbErr.message)

      setUrl(publicUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)
      if (dbErr) throw new Error(dbErr.message)
      setUrl(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sacar la foto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label={url ? 'Cambiar la foto de perfil' : 'Elegir una foto de perfil'}
          className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-brand-accent/20 border border-brand-accent/30 cursor-pointer group disabled:opacity-60"
        >
          {url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-brand-accent text-2xl font-bold">
              {inicial}
            </span>
          )}

          <span className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            {busy ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </span>

          {busy && !url && (
            <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer disabled:opacity-60"
          >
            {url ? 'Cambiar la foto' : 'Elegir una foto de la galería'}
          </button>
          <p className="text-brand-muted text-xs leading-relaxed">
            Se recorta al cuadrado y se achica sola. La ven tus compañeros en el ranking.
          </p>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs text-brand-error hover:underline cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3 h-3" />
              Sacar la foto
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-brand-error leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  )
}
