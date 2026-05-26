import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div
      className={cn(
        'border-2 border-brand-border border-t-brand-accent rounded-full animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
