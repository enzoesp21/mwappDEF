import { FALTAS_GRAVES } from '@/lib/faltas-graves'

/** Las faltas que terminan la prueba. Se muestra a quien está en período de prueba. */
export default function FaltasGraves() {
  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      <div className="bg-brand-error/10 border-b border-brand-error/20 px-5 py-2.5">
        <h2 className="text-brand-error text-[11px] font-bold uppercase tracking-widest text-center">
          Faltas que terminan el período de prueba
        </h2>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm text-brand-text leading-relaxed">
          En Mirador Waikiki valoramos el aprendizaje y entendemos que al principio se cometen
          errores. Pero hay conductas que <strong>no tienen margen</strong>: cualquiera de estas
          implica la finalización inmediata de la prueba.
        </p>
        <ol className="space-y-1.5">
          {FALTAS_GRAVES.map((falta, i) => (
            <li key={falta} className="flex items-start gap-2.5">
              <span className="text-brand-error text-xs font-bold flex-shrink-0 mt-0.5 w-4 text-right">
                {i + 1}.
              </span>
              <span className="text-xs text-brand-text leading-relaxed">{falta}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-brand-muted leading-relaxed border-t border-brand-border pt-3">
          No es una amenaza: es para que nadie se entere tarde. Todo lo demás se corrige hablando.
        </p>
      </div>
    </section>
  )
}
