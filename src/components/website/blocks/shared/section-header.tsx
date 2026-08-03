interface SectionHeaderProps {
  badge?: string
  heading: string
  subtitle?: string
  align?: 'left' | 'center'
}

export function SectionHeader({ badge, heading, subtitle, align = 'center' }: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={`mb-12 md:mb-16 ${alignClass}`}>
      {badge && (
        <span className="inline-block rounded-full px-3 py-1 text-xs font-medium mb-3"
          style={{
            backgroundColor: 'var(--website-primary-light)',
            color: 'var(--website-primary)',
          }}>
          {badge}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance"
        style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>
        {heading}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto"
          style={{ color: 'var(--website-text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
