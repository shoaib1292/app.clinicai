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
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    setText(value)
  }, [value])

  const isEditMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('edit') === '1'

  const handleSave = useCallback(async () => {
    const newText = ref.current?.textContent || ''
    if (newText === value) return
    setSaving(true)
    try {
      await fetch('/api/website/blocks/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, fieldName, value: newText }),
      })
    } catch (err) {
      console.error('[EditableText] Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [blockId, fieldName, value])

  const Tag = tagName as React.ElementType

  if (!isEditMode) {
    return <Tag className={className} style={style}>{text || placeholder}</Tag>
  }

  const base = `${className} ${editing ? 'outline-none ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50 cursor-text'} rounded px-1 -mx-1 transition-all`
  const editClass = saving ? `${base} opacity-50` : base

  return (
    <Tag
      ref={ref}
      contentEditable={!saving}
      suppressContentEditableWarning
      onClick={() => { if (!saving) setEditing(true) }}
      onBlur={() => {
        setEditing(false)
        handleSave()
      }}
      onInput={(e: React.FormEvent) => {
        setText((e.target as HTMLElement).textContent || '')
      }}
      className={editClass.trim()}
      style={style}
    >
      {text}
    </Tag>
  )
}
