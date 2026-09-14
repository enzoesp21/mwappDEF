import { cn } from '@/lib/utils'

// Fondos derivados de la paleta de marca. Se elige por el título, así cada
// guía tiene siempre el mismo color y se distinguen entre sí de un vistazo.
const THEMES = [
  'from-[#6e8f7a] to-[#3d5747]',
  'from-[#cab892] to-[#8a7550]',
  'from-[#5d7d6a] to-[#2f4438]',
  'from-[#b08968] to-[#6e5039]',
  'from-[#7d8fa0] to-[#48565f]',
  'from-[#9c7d8a] to-[#5e4a53]',
]

function themeFor(title: string) {
  let sum = 0
  for (let i = 0; i < title.length; i++) sum += title.charCodeAt(i)
  return THEMES[sum % THEMES.length]
}

interface Props {
  title: string
  coverImage?: string | null
  className?: string
  /** Oscurece la parte inferior para que el texto encima se lea. */
  overlay?: boolean
}

export default function GuideCover({ title, coverImage, className, overlay }: Props) {
  if (coverImage) {
    return (
      <div className={cn('relative overflow-hidden bg-brand-card-hover', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverImage} alt="" className="w-full h-full object-cover" />
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        )}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', themeFor(title), className)}>
      {/* Marca de agua. Va como background para que, si el archivo faltara,
          quede el color solo en vez de una imagen rota. 'multiply' transparenta
          el blanco, así funciona tanto con PNG transparente como con fondo
          blanco sólido. Se apoya a la derecha para no pelear con el título. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'url(/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right -8% center',
          backgroundSize: 'auto 140%',
          mixBlendMode: 'multiply',
        }}
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      )}
    </div>
  )
}
