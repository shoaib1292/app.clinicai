import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  children: React.ReactNode
  id?: string
  className?: string
  bg?: 'default' | 'surface' | 'primary' | 'none'
  spacing?: 'compact' | 'normal' | 'spacious'
}

export function SectionWrapper({ children, id, className, bg = 'default', spacing = 'normal' }: SectionWrapperProps) {
  const bgClass = {
    default: 'bg-[var(--website-bg)]',
    surface: 'bg-[var(--website-surface)]',
    primary: '',
    none: '',
  }[bg]

  const spacingClass = {
    compact: 'py-10 md:py-14',
    normal: 'py-20 md:py-28',
    spacious: 'py-28 md:py-40',
  }[spacing]

  return (
    <section id={id} className={cn(spacingClass, bgClass, className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  )
}
