import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className }: LogoProps) {
  const heights = { sm: 'h-9', md: 'h-14', lg: 'h-24' }

  return (
    <svg
      viewBox="0 0 200 188"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-brand-accent w-auto', heights[size], className)}
      aria-label="Mirador Waikiki"
      role="img"
    >
      {/* Top peaked frame — left diagonal bar */}
      <line x1="14" y1="64" x2="100" y2="14" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" />
      {/* Top peaked frame — right diagonal bar */}
      <line x1="186" y1="64" x2="100" y2="14" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" />
      {/* Left vertical side */}
      <line x1="14" y1="64" x2="14" y2="152" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" />
      {/* Right vertical side */}
      <line x1="186" y1="64" x2="186" y2="152" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" />

      {/* MIRADOR */}
      <text
        x="100"
        y="110"
        textAnchor="middle"
        fill="currentColor"
        fontFamily='"Paytone One", "Arial Black", system-ui, sans-serif'
        fontSize="46"
        fontWeight="900"
        letterSpacing="-0.5"
      >
        MIRADOR
      </text>

      {/* WAIKIKI */}
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fill="currentColor"
        fontFamily='"Paytone One", "Arial Black", system-ui, sans-serif'
        fontSize="46"
        fontWeight="900"
        letterSpacing="-0.5"
      >
        WAIKIKI
      </text>

      {/* Bottom wave */}
      <path
        d="M14 156 Q57 180 100 156 Q143 132 186 156"
        stroke="currentColor"
        strokeWidth="9.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
