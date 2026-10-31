'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Vuelve a pedir la página cada tanto, mientras la pestaña está a la vista. */
export default function RefrescoAutomatico({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const intervalo = setInterval(refrescar, segundos * 1000)
    // Al volver a la pestaña (o desbloquear el celular) se pone al día enseguida.
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [router, segundos])

  return null
}
