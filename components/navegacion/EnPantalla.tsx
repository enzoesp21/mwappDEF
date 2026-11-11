'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Dibuja una ventana (algo `fixed` que tapa la pantalla) directo en el body.
 * Así ningún contenedor de la página la puede "atrapar": en Safari, un
 * contenedor con animación de movimiento hacía que la ventana de corregir una
 * fichada apareciera al fondo de la página en vez de en la pantalla (Enzo,
 * 11/11: "me hace ir hasta abajo del todo para corregirlo").
 */
export default function EnPantalla({ children }: { children: ReactNode }) {
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  if (!montado) return null
  return createPortal(children, document.body)
}
