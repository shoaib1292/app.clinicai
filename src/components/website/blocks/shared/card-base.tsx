import { cn } from '@/lib/utils'

interface CardBaseProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'normal' | 'large'
}

export function CardBase({ children, className, hover = true, padding = 'normal' }: CardBaseProps) {
  const padClass = {
    none: '',
    normal: 'p-6',
    large: 'p-8 md:p-10',
  }[padding]

  return (
    <div className={cn(
      padClass,
      'rounded-2xl border transition-all duration-300',
      hover && 'hover:-translate-y-1 hover:shadow-lg',
      className,
    )}
    style={{
      backgroundColor: 'var(--website-surface)',
      borderColor: 'var(--website-border)',
      boxShadow: hover ? 'var(--website-shadow)' : undefined,
    }}>
      {children}
    </div>
  )
}
