'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Eraser } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignatureCanvasProps {
  onSignature: (dataUrl: string) => void
  className?: string
}

export default function SignatureCanvas({ onSignature, className }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (('clientX' in e ? e.clientX : e.clientX) - rect.left) * scaleX,
      y: (('clientY' in e ? e.clientY : e.clientY) - rect.top) * scaleY,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#D4A017'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    isDrawing.current = true
    const touch = 'touches' in e ? e.touches[0] : (e as React.MouseEvent).nativeEvent
    lastPoint.current = getPos(touch as MouseEvent | Touch, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const touch = 'touches' in e ? e.touches[0] : (e as React.MouseEvent).nativeEvent
    const currentPoint = getPos(touch as MouseEvent | Touch, canvas)

    if (lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(currentPoint.x, currentPoint.y)
      ctx.stroke()
    }
    lastPoint.current = currentPoint
    setHasSignature(true)
  }, [])

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPoint.current = null
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      onSignature(canvas.toDataURL('image/png'))
    }
  }, [hasSignature, onSignature])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignature('')
  }, [onSignature])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative border-2 border-brand-border rounded-xl overflow-hidden bg-[#0f0f0f]">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="signature-canvas w-full h-40 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          aria-label="Área de firma"
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-brand-muted text-sm">Firmá aquí con el dedo</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
      >
        <Eraser className="w-3.5 h-3.5" />
        Borrar firma
      </button>
    </div>
  )
}
