'use client'

import { useEffect, useRef } from 'react'

export interface ShortcutDefinition {
  key: string        // lowercase letter or symbol, e.g. 'd', '.', '/'
  action: () => void
  description: string
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  if (INPUT_TAGS.has(el.tagName)) return true
  if (el.isContentEditable) return true
  if (el.getAttribute('role') === 'textbox') return true
  return false
}

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    if (typeof window === 'undefined') return

    const down = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target as HTMLElement | null)) return
      if (!e.altKey || e.ctrlKey || e.metaKey) return

      const key = e.key.toLowerCase()
      const match = shortcutsRef.current.find((s) => s.key === key)

      if (match) {
        e.preventDefault()
        e.stopPropagation()
        match.action()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
}
