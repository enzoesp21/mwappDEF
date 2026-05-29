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
      className={cn('w-auto object-contain', className)}
      priority
    />
  )
}
