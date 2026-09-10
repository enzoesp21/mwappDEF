'use client'
import { useState, useTransition } from 'react'
import { CheckCircle, Clock, MessageSquare, AlertTriangle, BookCheck } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { markSuggestionReadAction } from '@/app/actions/suggestions'
import type { Suggestion } from '@/lib/types'
interface S extends Suggestion { full_name: string; puesto: string }
type Tab = 'todas'|'pendientes'|'leidas'
export default function SugerenciasAdminClient({ suggestions }: { suggestions: S[] }) {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [items, setItems] = useState(suggestions)
  const [isPending, startTransition] = useTransition()
  const [lid, setLid] = useState<string|null>(null)
  const filtered = items.filter(s => tab==='pendientes'?!s.is_read:tab==='leidas'?s.is_read:true)
  const pc = items.filter(s=>!s.is_read).length
  function markRead(item: S) {
    setLid(item.id)
    startTransition(async () => {
      const r = await markSuggestionReadAction(item.id, item.user_id, item.category)
      if (r.success) setItems(p=>p.map(s=>s.id===item.id?{...s,is_read:true,read_at:new Date().toISOString()}:s))
      setLid(null)
    })
  }
  const tabs=[{key:'pendientes' as Tab,label:pc>0?'Pendientes ('+pc+')':'Pendientes'},{key:'leidas' as Tab,label:'Leidas'},{key:'todas' as Tab,label:'Todas'}]
  return (
    <div className="space-y-5 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-brand-text">Sugerencias y Reclamos</h1><p className="text-sm text-brand-muted mt-1">{pc>0?pc+' pendiente'+(pc!==1?'s':'')+' de lectura':'Todo al dia'}</p></div>
      <div className="flex gap-2 border-b border-brand-border">
        {tabs.map(({key,label})=><button key={key} onClick={()=>setTab(key)} className={cn('px-4 py-2.5 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors',tab===key?'text-brand-accent border-brand-accent':'text-brand-muted border-transparent')}>{label}</button>)}
      </div>
      {filtered.length===0?<div className="text-center py-12 text-brand-muted text-sm border border-dashed border-brand-border rounded-xl">{tab==='pendientes'?'Sin pendientes!':'Sin resultados.'}</div>:(
        <div className="space-y-3">
          {filtered.map(item=>(
            <div key={item.id} className={cn('bg-brand-card border rounded-2xl p-5 space-y-3',!item.is_read?'border-brand-accent/30':'border-brand-border')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.category==='reclamo'?<span className="flex items-center gap-1 text-[10px] font-bold uppercase text-brand-error bg-brand-error/10 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3"/>Reclamo</span>:<span className="flex items-center gap-1 text-[10px] font-bold uppercase text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full"><MessageSquare className="w-3 h-3"/>Sugerencia</span>}
                  <span className="text-sm font-semibold text-brand-text">{item.full_name}</span>
                  <span className="text-xs text-brand-muted">{item.puesto}</span>
                </div>
                {item.is_read?<span className="flex items-center gap-1 text-[10px] text-brand-success flex-shrink-0"><CheckCircle className="w-3.5 h-3.5"/>Leido</span>:<span className="flex items-center gap-1 text-[10px] text-amber-600 flex-shrink-0"><Clock className="w-3.5 h-3.5"/>Pendiente</span>}
              </div>
              <p className="text-sm text-brand-text">{item.content}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-brand-muted">{formatDateTime(item.created_at)}{item.is_read&&item.read_at&&<span className="ml-2 text-brand-success"> - Leido el {formatDateTime(item.read_at)}</span>}</p>
                {!item.is_read&&<button onClick={()=>markRead(item)} disabled={lid===item.id||isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50"><BookCheck className="w-3.5 h-3.5"/>{lid===item.id?'Marcando...':'Marcar como leido'}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
