import { cn } from '@/lib/utils'

interface IconCircleProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function IconCircle({ children, className, size = 'md' }: IconCircleProps) {
  const sizeClass = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
  }[size]

  return (
    <div className={cn(
      sizeClass,
      'rounded-full flex items-center justify-center flex-shrink-0',
      className,
    )}
    style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
      {children}
    </div>
  )
}
