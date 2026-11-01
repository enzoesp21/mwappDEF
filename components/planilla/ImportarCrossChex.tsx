'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizarNombre } from '@/lib/horarios'
import { leerCsv, leerTabla, type Celda, type FichadaLeida } from '@/lib/planilla-importar'
import { importarFichadasAction } from '@/app/actions/planilla-papel'

interface Props {
  /** [número del reloj, empleado] */
  alias: [string, string][]
  /** [número del reloj, nombre en el reloj] */
  personas: [string, string][]
  empleados: { id: string; nombre: string }[]
}

interface Vista {
  archivo: string
  columnas: string[]
  asignadas: { empleadoId: string; ms: number }[]
  /** "número o nombre" → cuántas fichadas sin dueño */
  sinDueno: [string, number][]
  descartadas: number
  desde: string
  hasta: string
  porEmpleado: [string, number][]
}

function diaMes(ms: number): string {
  const d = new Date(ms - 3 * 3600 * 1000)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Las filas de la primera hoja de un .xlsx, con ExcelJS (se carga recién al usarlo). */
async function leerXlsx(archivo: File): Promise<Celda[][]> {
  const ExcelJS = (await import('exceljs')).default
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(await archivo.arrayBuffer())
  const hoja = libro.worksheets[0]
  if (!hoja) return []
  const filas: Celda[][] = []
  hoja.eachRow({ includeEmpty: true }, (fila) => {
    const valores = fila.values as Celda[]
    filas.push(Array.isArray(valores) ? valores.slice(1) : [])
  })
  return filas
}

/** Importar el Excel de CrossChex cuando el programa de la caja no anduvo. */
export default function ImportarCrossChex({ alias, personas, empleados }: Props) {
  const router = useRouter()
  const [leyendo, setLeyendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [vista, setVista] = useState<Vista | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  async function elegir(archivo: File | undefined) {
    setVista(null)
    setMensaje(null)
    if (!archivo) return
    const nombre = archivo.name.toLowerCase()
    if (nombre.endsWith('.xls')) {
      setMensaje({
        ok: false,
        texto: 'Ese es el formato viejo de Excel (.xls). Abrilo en Excel y guardalo como "Libro de Excel (.xlsx)", o exportá CSV desde CrossChex.',
      })
      return
    }
    setLeyendo(true)
    try {
      const tabla = nombre.endsWith('.csv') ? leerCsv(await archivo.text()) : await leerXlsx(archivo)
      const lectura = leerTabla(tabla)
      if (lectura.error) {
        setMensaje({ ok: false, texto: lectura.error })
        return
      }
      setVista(armarVista(archivo.name, lectura.fichadas, lectura.descartadas, lectura.columnas))
    } catch (e) {
      setMensaje({ ok: false, texto: `No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setLeyendo(false)
    }
  }

  function armarVista(archivo: string, fichadas: FichadaLeida[], descartadas: number, columnas: string[]): Vista {
    const empleadoDe = new Map(alias)
    const numeroPorNombre = new Map(personas.map(([u, n]) => [normalizarNombre(n), u]))
    const nombreDe = new Map(empleados.map((e) => [e.id, e.nombre]))
    const asignadas: Vista['asignadas'] = []
    const sinDueno = new Map<string, number>()
    const porEmpleado = new Map<string, number>()
    for (const f of fichadas) {
      const numero = f.numero ?? (f.nombre ? numeroPorNombre.get(normalizarNombre(f.nombre)) : undefined)
      const empleadoId = numero ? empleadoDe.get(numero) : undefined
      if (empleadoId) {
        asignadas.push({ empleadoId, ms: f.ms })
        const n = nombreDe.get(empleadoId) ?? '?'
        porEmpleado.set(n, (porEmpleado.get(n) ?? 0) + 1)
      } else {
        const clave = [f.numero && `nro. ${f.numero}`, f.nombre].filter(Boolean).join(' · ') || `fila ${f.fila}`
        sinDueno.set(clave, (sinDueno.get(clave) ?? 0) + 1)
      }
    }
    const tiempos = fichadas.map((f) => f.ms)
    return {
      archivo,
      columnas,
      asignadas,
      sinDueno: Array.from(sinDueno).sort((a, b) => b[1] - a[1]),
      descartadas,
      desde: tiempos.length ? diaMes(Math.min(...tiempos)) : '',
      hasta: tiempos.length ? diaMes(Math.max(...tiempos)) : '',
      porEmpleado: Array.from(porEmpleado).sort((a, b) => a[0].localeCompare(b[0], 'es')),
    }
  }

  async function importar() {
    if (!vista) return
    setImportando(true)
    setMensaje(null)
    const r = await importarFichadasAction(vista.asignadas)
    setImportando(false)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) {
      setVista(null)
      router.refresh()
    }
  }

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-brand-text">Importar el Excel de CrossChex</h2>
          <p className="text-xs text-brand-muted leading-relaxed">
            Para cuando el programa de la caja no anduvo: exportá las fichadas desde CrossChex (Excel .xlsx o CSV) y
            subilas acá. Antes de importar te muestro qué leí. Las que el reloj ya tiene se saltean, y subir dos veces el
            mismo archivo no duplica nada.
          </p>
        </div>
      </div>

      <label
        className={cn(
          'flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed text-sm font-semibold cursor-pointer',
          leyendo ? 'border-brand-border text-brand-muted' : 'border-brand-accent/50 text-brand-accent hover:bg-brand-accent/5'
        )}
      >
        {leyendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {leyendo ? 'Leyendo…' : 'Elegir archivo'}
        <input
          type="file"
          accept=".xlsx,.csv,.xls"
          className="sr-only"
          disabled={leyendo || importando}
          onChange={(e) => {
            elegir(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>

      {vista && (
        <div className="space-y-2 text-sm">
          <p className="text-brand-text">
            <span className="font-semibold">{vista.archivo}</span>: {vista.asignadas.length + vista.sinDueno.reduce((s, x) => s + x[1], 0)}{' '}
            fichadas del {vista.desde} al {vista.hasta}.
          </p>
          <p className="text-xs text-brand-muted">Columnas que usé · {vista.columnas.join(' · ')}</p>
          {vista.porEmpleado.length > 0 && (
            <p className="text-xs text-brand-text">
              <span className="font-semibold">{vista.asignadas.length} de empleados de la planilla:</span>{' '}
              {vista.porEmpleado.map(([n, c]) => `${n} (${c})`).join(', ')}
            </p>
          )}
          {vista.sinDueno.length > 0 && (
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Sin asociar, no se importan:</span>{' '}
              {vista.sinDueno.map(([n, c]) => `${n} (${c})`).join(', ')}. Asocialos en la pestaña Reloj y volvé a subir el archivo.
            </p>
          )}
          {vista.descartadas > 0 && (
            <p className="text-xs text-brand-muted">{vista.descartadas} filas sin fecha y hora entendibles quedaron afuera.</p>
          )}
          <button
            type="button"
            onClick={importar}
            disabled={importando || vista.asignadas.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {importando && <Loader2 className="w-4 h-4 animate-spin" />}
            Importar {vista.asignadas.length} fichadas
          </button>
        </div>
      )}

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}
    </section>
  )
}
