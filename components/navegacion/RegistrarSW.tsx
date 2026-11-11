'use client'

import { useEffect } from 'react'

/**
 * Instala el service worker (public/sw.js), que guarda en el teléfono lo fijo
 * de la app para que abra rápido desde la pantalla de inicio. Solo en
 * producción: en desarrollo guardaría código viejo.
 */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si el navegador no lo deja, la app anda igual, solo que sin guardar nada.
    })
  }, [])
  return null
}
