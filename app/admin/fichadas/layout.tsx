import type { ReactNode } from 'react'
import PestanasFichadas from '@/components/fichadas/PestanasFichadas'

/** Fichadas tiene dos secciones: quién está adentro ahora y la planilla del mes. */
export default function FichadasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <PestanasFichadas />
      {children}
    </div>
  )
}
