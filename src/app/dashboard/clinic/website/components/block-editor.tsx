'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GripVertical, Eye, EyeOff, Save, Loader2, Type } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface BlockItem {
  id: string
  label: string
  visible: boolean
  order: number
  content?: Record<string, any>
}

interface BlockEditorProps {
  clinicId: string
  initialBlocks: BlockItem[]
  initialContent: Record<string, any> | null
  templateId: string
  headingFont?: string | null
  bodyFont?: string | null
  onSave: (blocks: BlockItem[], content: Record<string, any>, headingFont?: string, bodyFont?: string) => Promise<void>
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Geist', label: 'Geist' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
]

function SortableBlock({ block, onToggle, editingBlock, setEditingBlock, updateContent, content }: {
  block: BlockItem
  onToggle: (id: string) => void
  editingBlock: string | null
  setEditingBlock: (id: string | null) => void
  updateContent: (blockId: string, field: string, value: string) => void
  content: Record<string, any>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : block.visible ? 1 : 0.5,
    zIndex: isDragging ? 50 : undefined,
  }

  const hasContent = block.content && Object.keys(block.content).length > 0

  return (
    <Card ref={setNodeRef} style={style} className="relative">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground transition-colors touch-none shrink-0"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{block.label}</span>
              {!block.visible && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>
              )}
            </div>

            {hasContent && editingBlock === block.id && (
              <div className="mt-3 space-y-2 pl-1">
                {Object.keys(block.content!).map(field => (
                  <div key={field}>
                    <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    {typeof block.content![field] === 'string' && (block.content![field]?.length || 0) > 80 ? (
                      <Textarea
                        value={content[block.id]?.[field] || block.content![field] || ''}
                        onChange={e => updateContent(block.id, field, e.target.value)}
                        rows={2}
                        className="text-sm mt-1"
                      />
                    ) : (
                      <Input
                        value={content[block.id]?.[field] || block.content![field] || ''}
                        onChange={e => updateContent(block.id, field, e.target.value)}
                        className="text-sm mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                title="Edit content"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggle(block.id)}
              title={block.visible ? 'Hide section' : 'Show section'}
            >
              {block.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BlockEditor({ clinicId, initialBlocks, initialContent, templateId, headingFont, bodyFont, onSave }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockItem[]>(initialBlocks)
  const [content, setContent] = useState<Record<string, any>>(initialContent || {})
  const [saving, setSaving] = useState(false)
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [hdFont, setHdFont] = useState<string>(headingFont || 'Inter')
  const [bdFont, setBdFont] = useState<string>(bodyFont || 'Inter')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks(items => {
        const oldIndex = items.findIndex(b => b.id === active.id)
        const newIndex = items.findIndex(b => b.id === over.id)
        return arrayMove(items, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }))
      })
    }
  }

  function toggleBlock(blockId: string) {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b))
  }

  function updateContent(blockId: string, field: string, value: string) {
    setContent(prev => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(blocks, content, hdFont, bdFont)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Block Editor</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder, toggle visibility, and edit content.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Typography */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Typography</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Heading Font</Label>
              <Select value={hdFont} onValueChange={setHdFont}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Body Font</Label>
              <Select value={bdFont} onValueChange={setBdFont}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sortable blocks */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sortedBlocks.map(block => (
              <SortableBlock
                key={block.id}
                block={block}
                onToggle={toggleBlock}
                editingBlock={editingBlock}
                setEditingBlock={setEditingBlock}
                updateContent={updateContent}
                content={content}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="text-xs text-muted-foreground text-center">
        Template: {templateId} &middot; {blocks.filter(b => b.visible).length} blocks visible
      </div>
    </div>
  )
}
