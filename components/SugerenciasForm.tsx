'use client'
import { useRef, useState, useTransition } from 'react'
import { Send, MessageSquare, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitSuggestionAction } from '@/app/actions/suggestions'
export default function SugerenciasForm() {
  const [cat, setCat] = useState<'sugerencia'|'reclamo'>('sugerencia')
  const [content, setContent] = useState('')
  const [fb, setFb] = useState<{type:'success'|'error';msg:string}|null>(null)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLFormElement>(null)
  function submit(e: React.FormEvent) {
    e.preventDefault(); setFb(null)
    const fd = new FormData(ref.current!); fd.set('category', cat)
    startTransition(async () => {
      const r = await submitSuggestionAction(fd)
      if (r.error) setFb({type:'error',msg:r.error})
      else { setFb({type:'success',msg:'Enviado! Los administradores lo revisaran pronto.'}); setContent(''); ref.current?.reset() }
    })
  }
  return (
    <form ref={ref} onSubmit={submit} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-brand-text">Nueva {cat}</h2>
      <div className="flex gap-2">
        <button type="button" onClick={() => setCat('sugerencia')} className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all', cat==='sugerencia'?'bg-brand-accent text-white border-brand-accent':'text-brand-muted border-brand-border')}><MessageSquare className="w-4 h-4"/>Sugerencia</button>
        <button type="button" onClick={() => setCat('reclamo')} className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all', cat==='reclamo'?'bg-brand-error text-white border-brand-error':'text-brand-muted border-brand-border')}><AlertTriangle className="w-4 h-4"/>Reclamo</button>
      </div>
      <div>
        <textarea name="content" value={content} onChange={e=>setContent(e.target.value)} placeholder={cat==='sugerencia'?'Escribi tu sugerencia...':'Describe tu reclamo...'} rows={4} maxLength={500} required className="w-full px-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted resize-none focus:outline-none focus:border-brand-accent"/>
        <p className="text-right text-[10px] text-brand-muted mt-1">{content.length}/500</p>
      </div>
      {fb && <div className={cn('text-sm px-4 py-3 rounded-xl',fb.type==='success'?'bg-brand-success/10 text-brand-success':'bg-brand-error/10 text-brand-error')}>{fb.msg}</div>}
      <button type="submit" disabled={isPending||content.trim().length<10} className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50"><Send className="w-4 h-4"/>{isPending?'Enviando...':'Enviar'}</button>
    </form>
  )
}
