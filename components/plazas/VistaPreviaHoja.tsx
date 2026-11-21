'use client'

import { useEffect, useRef, useState } from 'react'
import { fechaDeLaHoja, type HojaArmada } from '@/lib/plazas'
import HojaPlazas from '@/components/plazas/HojaPlazas'

// Una A4 entera (210 × 297 mm, con 8 mm de margen blanco, como sale de la
// impresora). En pantalla, 1 mm = 96/25,4 px.
const ANCHO_PX = (210 * 96) / 25.4
const ALTO_PX = (297 * 96) / 25.4
const MARGEN_PX = (8 * 96) / 25.4

/** La hoja achicada al ancho de la pantalla, para ver cómo va a salir antes de imprimir. */
export default function VistaPreviaHoja({ hoja, fecha }: { hoja: HojaArmada; fecha: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0.45)
  useEffect(() => {
    const el = caja.current
    if (!el) return
    // Menos los 2 px del borde del recuadro.
    const medir = () => setEscala(Math.min(1, (el.clientWidth - 2) / ANCHO_PX))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={caja} className="w-full">
      <div
        className="mx-auto border border-brand-border rounded-lg overflow-hidden bg-white shadow-sm"
        style={{ width: ANCHO_PX * escala + 2, height: ALTO_PX * escala + 2 }}
        aria-label="Vista previa de la hoja"
      >
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: ANCHO_PX, height: ALTO_PX, padding: MARGEN_PX, boxSizing: 'border-box' }}>
          <HojaPlazas hoja={hoja} fecha={/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fechaDeLaHoja(fecha) : null} />
        </div>
      </div>
    </div>
  )
}
