'use client'

import { Badge } from '@/components/ui/badge'

export interface ShortcutDisplay {
  key: string
  description: string
}

export interface ShortcutSection {
  title: string
  shortcuts: ShortcutDisplay[]
}

export function ShortcutsReference({ sections }: { sections: ShortcutSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{section.title}</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {section.shortcuts.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between p-2.5 rounded-md border bg-muted/20"
              >
                <span className="text-sm">{s.description}</span>
                <Badge variant="secondary" className="font-mono text-xs py-0.5">
                  Alt+{s.key === '.' ? '.' : s.key.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
