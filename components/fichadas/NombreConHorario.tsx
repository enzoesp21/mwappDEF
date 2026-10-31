'use client'

import { useState } from 'react'

/** Un nombre que al tocarlo muestra a qué hora le tocaba entrar según Horarios. */
export default function NombreConHorario({
  nombre,
  entrada,
  debajo,
}: {
  nombre: string
  /** Lo que dice Horarios: "08:00 (8 A 16.30)", "tenía franco (X)"... */
  entrada: string
  /** Una línea fija abajo del nombre, por ejemplo el sector. */
  debajo?: string | null
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="block w-full text-left text-sm text-brand-text truncate cursor-pointer hover:text-brand-accent"
      >
        {nombre}
      </button>
      {debajo && <p className="text-[11px] text-brand-muted truncate">{debajo}</p>}
      {abierto && (
        <p className="text-[11px] text-brand-accent mt-0.5 leading-snug">
          <span className="font-semibold">Entrada según horario:</span> {entrada}
        </p>
      )}
    </div>
  )
}
