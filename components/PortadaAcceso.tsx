import Image from 'next/image'
import type { ReactNode } from 'react'

interface Props {
  /** Etiqueta chiquita arriba del título, como en miradorwaikiki.com. */
  etiqueta: string
  titulo: string
  bajada: string
  children: ReactNode
  pie?: ReactNode
}

/**
 * Portada del ingreso y del registro, con la estética de miradorwaikiki.com:
 * la pasarela de la entrada, el logo en blanco, la frase en itálica y una
 * tarjeta blanca con marco crema.
 */
export default function PortadaAcceso({ etiqueta, titulo, bajada, children, pie }: Props) {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <div className="relative h-[38vh] min-h-[250px] max-h-[380px] overflow-hidden">
        <Image
          src="/fotos/entrada-pasarela.webp"
          alt="La pasarela de la entrada de Mirador Waikiki"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%]"
        />
        {/* Se funde con el crema de abajo para que la tarjeta flote sobre la foto. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-brand-dark" />
        <div className="absolute inset-x-0 top-0 flex justify-center pt-6">
          <Image
            src="/logo-blanco.png"
            alt="Mirador Waikiki"
            width={86}
            height={68}
            style={{ width: 86, height: 68 }}
            className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            priority
          />
        </div>
        {/* La misma cápsula crema translúcida de la portada de la web. */}
        <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">
          <p className="rounded-full bg-[#ebe4d1]/80 backdrop-blur-md border border-white/50 px-5 py-2 font-serif italic text-brand-text text-base shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]">
            Una propuesta diferente, frente al mar.
          </p>
        </div>
      </div>

      <div className="relative -mt-8 px-4 pb-10 w-full max-w-sm mx-auto">
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-accent">{etiqueta}</p>
          <h1 className="text-2xl font-semibold text-brand-text mt-1">{titulo}</h1>
          <p className="text-brand-muted text-sm mt-1 mb-6">{bajada}</p>
          {children}
        </div>
        {pie}
      </div>
    </div>
  )
}
