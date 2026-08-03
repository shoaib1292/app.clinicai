import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CTAButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  href?: string
  className?: string
}

export function CTAButton({ children, variant = 'primary', href, className }: CTAButtonProps) {
  const baseClass = cn('rounded-lg h-11 px-6 font-medium transition-all duration-200 active:scale-[0.97]', className)

  if (variant === 'primary') {
    return (
      <a href={href || '#'}>
        <Button size="lg" className={baseClass}
          style={{
            backgroundColor: 'var(--website-primary)',
            color: '#ffffff',
          }}>
          {children}
        </Button>
      </a>
    )
  }

  if (variant === 'secondary') {
    return (
      <a href={href || '#'}>
        <Button size="lg" variant="secondary" className={baseClass}>
          {children}
        </Button>
      </a>
    )
  }

  return (
    <a href={href || '#'}>
      <Button size="lg" variant="outline" className={baseClass}
        style={{ borderColor: 'var(--website-border)', color: 'var(--website-text)' }}>
        {children}
      </Button>
    </a>
  )
}
