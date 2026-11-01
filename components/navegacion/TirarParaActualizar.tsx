'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Lo que tiene que bajar el círculo (ya frenado) para que actualice al soltar. */
const UMBRAL = 64
/** Hasta dónde baja como mucho. */
const TOPE = 96
/** Dónde se queda girando mientras actualiza. */
const PARADO = 56
/** El círculo baja menos que el dedo, como si tirara de un elástico. */
const FRENO = 0.45
/** Aunque conteste al instante, gira al menos esto: si no, ni se ve. */
const GIRO_MINIMO = 600
/** Si en este tiempo no terminó, se esconde igual. */
const GIRO_MAXIMO = 15000

/** Donde no se tira: campos, la firma, ventanas, el menú abierto, lo que se arrastra y lo que lo pida. */
const NO_TIRAR =
  'input, textarea, select, canvas, [contenteditable="true"], [role="dialog"], [data-sin-tirar], [data-rbd-drag-handle-draggable-id]'

type Estado = 'quieto' | 'tirando' | 'actualizando' | 'volviendo'

/**
 * Tirar para actualizar, como en Instagram: arriba de todo, arrastrar hacia
 * abajo y soltar. Vuelve a pedir los datos de la pantalla (router.refresh) sin
 * recargar la app ni perder lo que se estaba escribiendo. Es para el dedo:
 * instalada como app, el teléfono no lo trae. Para que el navegador no haga
 * el suyo (que recarga todo), globals.css le saca el rebote de arriba.
 */
export default function TirarParaActualizar() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('quieto')
  const [tirado, setTirado] = useState(0)
  const [pendiente, iniciar] = useTransition()
  const desde = useRef(0)
  const actualizando = useRef(false)
  // En una referencia: las escuchas se ponen una sola vez y no se cortan a
  // mitad de un gesto si la pantalla se vuelve a dibujar.
  const enrutador = useRef(router)

  useEffect(() => {
    actualizando.current = estado === 'actualizando'
    enrutador.current = router
  }, [estado, router])

  useEffect(() => {
    let inicio: { x: number; y: number } | null = null
    let activo = false
    let distancia = 0

    function puedeEmpezar(e: TouchEvent): boolean {
      if (e.touches.length !== 1 || window.scrollY > 0 || actualizando.current) return false
      // Una ventana abierta que trabó el desplazamiento de la página.
      if (document.body.style.overflow === 'hidden') return false
      const objetivo = e.target instanceof Element ? e.target : null
      if (!objetivo || objetivo.closest(NO_TIRAR)) return false
      // Adentro de algo que se desplaza solo (la grilla de la planilla, una lista): solo si está arriba.
      for (let el: Element | null = objetivo; el && el !== document.body; el = el.parentElement) {
        if (el.scrollTop > 0) return false
      }
      return true
    }

    function soltarEscuchas() {
      window.removeEventListener('touchmove', alMover)
      window.removeEventListener('touchend', alSoltar)
      window.removeEventListener('touchcancel', alCancelar)
    }

    function reiniciar() {
      soltarEscuchas()
      inicio = null
      activo = false
      distancia = 0
    }

    function alMover(e: TouchEvent) {
      if (!inicio) return
      const dx = e.touches[0].clientX - inicio.x
      const dy = e.touches[0].clientY - inicio.y
      if (!activo) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        // Solo hacia abajo, más derecho que de costado y con la página arriba de todo.
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          reiniciar()
          return
        }
        activo = true
        setEstado('tirando')
      }
      // Mientras se tira, la página no se mueve ni rebota.
      if (e.cancelable) e.preventDefault()
      distancia = Math.min(TOPE, Math.max(0, dy * FRENO))
      setTirado(distancia)
    }

    function alSoltar() {
      const estaba = activo
      const alcanzo = distancia >= UMBRAL
      reiniciar()
      if (!estaba) return
      if (alcanzo) {
        desde.current = Date.now()
        setEstado('actualizando')
        setTirado(PARADO)
        iniciar(() => enrutador.current.refresh())
      } else {
        setEstado('volviendo')
        setTirado(0)
      }
    }

    function alCancelar() {
      const estaba = activo
      reiniciar()
      if (!estaba) return
      setEstado('volviendo')
      setTirado(0)
    }

    function alTocar(e: TouchEvent) {
      reiniciar()
      if (!puedeEmpezar(e)) return
      inicio = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      // Solo mientras dura el gesto: el resto del tiempo el desplazamiento no espera a nadie.
      window.addEventListener('touchmove', alMover, { passive: false })
      window.addEventListener('touchend', alSoltar)
      window.addEventListener('touchcancel', alCancelar)
    }

    window.addEventListener('touchstart', alTocar, { passive: true })
    return () => {
      reiniciar()
      window.removeEventListener('touchstart', alTocar)
    }
  }, [])

  // Cuando llegan los datos nuevos (y giró lo mínimo), vuelve a esconderse.
  useEffect(() => {
    if (estado !== 'actualizando') return
    const espera = pendiente ? GIRO_MAXIMO : Math.max(0, GIRO_MINIMO - (Date.now() - desde.current))
    const t = setTimeout(() => {
      setEstado('volviendo')
      setTirado(0)
    }, espera)
    return () => clearTimeout(t)
  }, [estado, pendiente])

  useEffect(() => {
    if (estado !== 'volviendo') return
    const t = setTimeout(() => setEstado('quieto'), 300)
    return () => clearTimeout(t)
  }, [estado])

  const listo = estado === 'actualizando' || (estado === 'tirando' && tirado >= UMBRAL)

  return (
    <div
      aria-hidden={estado !== 'actualizando'}
      // Sale de abajo del encabezado (que mide 56 px y está más arriba en capas).
      className="fixed inset-x-0 top-14 z-20 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${tirado - 48}px)`,
        transition: estado === 'tirando' ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        visibility: estado === 'quieto' ? 'hidden' : 'visible',
      }}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full bg-brand-card border flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(31,45,39,0.45)] transition-colors duration-150',
          listo ? 'border-brand-accent/60' : 'border-brand-border'
        )}
        style={{ opacity: estado === 'tirando' ? Math.min(1, tirado / 36) : 1 }}
      >
        <RotateCw
          className={cn(
            'w-5 h-5 transition-colors duration-150',
            listo ? 'text-brand-accent' : 'text-brand-muted',
            estado === 'actualizando' && 'animate-spin'
          )}
          style={estado === 'actualizando' ? undefined : { transform: `rotate(${tirado * 4}deg)` }}
          strokeWidth={2.4}
        />
      </div>
      {estado === 'actualizando' && (
        <span role="status" className="sr-only">
          Actualizando
        </span>
      )}
    </div>
  )
}
