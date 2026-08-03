import { CalendarDays } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center rounded-full h-16 w-16 mb-4"
        style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
        {icon || <CalendarDays className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--website-text)' }}>{title}</h3>
      {description && <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--website-text-muted)' }}>{description}</p>}
      {action && (
        <a href={action.href} className="inline-block mt-4 text-sm font-medium"
          style={{ color: 'var(--website-primary)' }}>
          {action.label} →
        </a>
      )}
    </div>
  )
}
