import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className }: LogoProps) {
  const heights = { sm: 36, md: 56, lg: 96 }
  const h = heights[size]

  return (
    <Image
      src="/logo.png"
      alt="Mirador Waikiki"
      width={h}
      height={h}
      className={cn('object-contain flex-shrink-0', className)}
      // El tamaño va en el estilo y no solo en los atributos: Tailwind les pone
      // height:auto a todas las imágenes, y sin esto el navegador usa el tamaño
      // real del archivo. Con el optimizador de imágenes apagado, eso es el
      // logo entero ocupando todo el ancho del celular.
      style={{ width: h, height: h }}
      priority
    />
  )
}
