'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface EditableTextProps {
  value: string
  tagName?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
  blockId: string
  fieldName: string
  className?: string
  style?: React.CSSProperties
  placeholder?: string
}

export function EditableText({
  value,
  tagName = 'span',
  blockId,
  fieldName,
  className = '',
  style,
  placeholder = 'Click to edit...',
}: EditableTextProps) {
  const [editOn, setEditOn] = useState(false)
  const [saving, setSaving] = useState(false)
  const elRef = useRef<HTMLElement | null>(null)
  const lastSavedRef = useRef(value)

  // Detect edit mode only after client mount — no hydration mismatch.
  useEffect(() => {
    setEditOn(new URLSearchParams(window.location.search).get('edit') === '1')
  }, [])

  // Set initial textContent on DOM after mount (not via JSX children).
  // Sync when value prop changes externally and user is not editing.
  useEffect(() => {
    lastSavedRef.current = value
    const el = elRef.current
    if (el && document.activeElement !== el) {
      el.textContent = value
    }
  }, [value])

  const handleSave = useCallback(async () => {
    const el = elRef.current
    if (!el) return
    const newText = el.textContent?.trim() || ''
    if (newText === lastSavedRef.current) {
      el.textContent = lastSavedRef.current
      return
    }
    setSaving(true)
    try {
      await fetch('/api/website/blocks/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, fieldName, value: newText }),
      })
      lastSavedRef.current = newText
    } catch (err) {
      console.error('[EditableText] Save failed:', err)
      if (el) el.textContent = lastSavedRef.current
    } finally {
      setSaving(false)
    }
  }, [blockId, fieldName])

  const Tag = tagName as React.ElementType

  // Single render path — server and client produce identical element
  // structure. contentEditable is false on server and initial client,
  // toggles only after client-side useEffect. No tree structural change.
  return (
    <Tag
      ref={elRef}
      contentEditable={editOn && !saving}
      suppressContentEditableWarning
      onBlur={editOn ? handleSave : undefined}
      className={
        editOn
          ? `${className} outline-none focus:ring-2 focus:ring-black/30 focus:bg-black/[0.03] hover:bg-muted/50 cursor-text rounded px-1 -mx-1 transition-all ${saving ? 'opacity-50 pointer-events-none' : ''}`.trim()
          : className
      }
      style={style}
      suppressHydrationWarning
    >
      {value}
    </Tag>
  )
}
