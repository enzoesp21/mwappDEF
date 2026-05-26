import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className }: LogoProps) {
  const sizes = {
    sm: { wrapper: 'gap-1.5', icon: 'w-6 h-6', title: 'text-sm', sub: 'text-[9px]' },
    md: { wrapper: 'gap-2', icon: 'w-8 h-8', title: 'text-base', sub: 'text-[10px]' },
    lg: { wrapper: 'gap-3', icon: 'w-12 h-12', title: 'text-xl', sub: 'text-xs' },
  }

  const s = sizes[size]

  return (
    <div className={cn('flex items-center', s.wrapper, className)}>
      <WaveIcon className={cn(s.icon, 'text-brand-accent flex-shrink-0')} />
      <div>
        <div className={cn('font-display font-bold text-brand-accent leading-none', s.title)}>
          MIRADOR
        </div>
        <div className={cn('font-display text-brand-text leading-none tracking-widest', s.sub)}>
          WAIKIKI
        </div>
      </div>
    </div>
  )
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 17C3.5 15 5.5 14 7 14C8.5 14 9.5 15 11 16C12.5 17 13.5 18 15 18C16.5 18 18.5 17 20 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 12C3.5 10 5.5 9 7 9C8.5 9 9.5 10 11 11C12.5 12 13.5 13 15 13C16.5 13 18.5 12 20 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 7L7.5 4M12 6L12 3M17 7L16.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
